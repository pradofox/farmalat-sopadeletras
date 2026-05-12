/**
 * Pantalla de Punto de Venta - React island.
 * - Escaneo/busqueda por codigo de barras o nombre con autofocus permanente
 * - Items editables, totales en mono grande
 * - Atajos: F2 buscar, F12 cobrar, Esc cancelar venta
 * - Mobile responsive (single column con totales stacked abajo)
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface Product {
  id: number;
  name: string;
  barcode: string | null;
  publicPrice: number;
  ivaPct: number;
  requiresPrescription: boolean;
  controlledGroup: "I" | "II" | "III" | "IV" | "V" | null;
  stock: number | null;
}

interface Item {
  productId: number;
  name: string;
  unitPrice: number;
  ivaPct: number;
  quantity: number;
  requiresPrescription: boolean;
  controlledGroup: string | null;
  stock: number | null;
}

type PaymentMethod = "cash" | "card_debit" | "card_credit" | "transfer";

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function POS({ warehouseId = 1 }: { warehouseId?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Calcular totales
  const { subtotal, ivaTotal, total } = useMemo(() => {
    let sub = 0, iva = 0;
    for (const it of items) {
      const lineSub = it.unitPrice * it.quantity;
      sub += lineSub;
      iva += lineSub * (it.ivaPct / 100);
    }
    return { subtotal: sub, ivaTotal: iva, total: sub + iva };
  }, [items]);

  const change = useMemo(() => {
    if (payMethod !== "cash") return 0;
    const r = parseFloat(received) || 0;
    return Math.max(0, r - total);
  }, [received, total, payMethod]);

  // Autofocus permanente del input
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    const onFocus = () => setTimeout(focus, 100);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F12") { e.preventDefault(); openPayment(); }
      else if (e.key === "Escape" && items.length > 0) { e.preventDefault(); cancelSale(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Busqueda en vivo (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&warehouseId=${warehouseId}`);
        const data = await res.json();
        if (data.match === "barcode" && data.products?.[0]) {
          addProduct(data.products[0]);
          setQuery("");
          setSuggestions([]);
          setShowSuggestions(false);
        } else {
          setSuggestions(data.products ?? []);
          setShowSuggestions(true);
        }
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [query, warehouseId]);

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.findIndex((x) => x.productId === p.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: p.publicPrice,
          ivaPct: p.ivaPct,
          quantity: 1,
          requiresPrescription: p.requiresPrescription,
          controlledGroup: p.controlledGroup,
          stock: p.stock,
        },
      ];
    });
    flashToast(`+ ${p.name}`);
  }

  function changeQty(productId: number, qty: number) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity: Math.max(0.01, qty) } : it)));
  }
  function removeItem(productId: number) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }
  function cancelSale() {
    if (confirm("Cancelar la venta actual?")) {
      setItems([]);
      setReceived("");
      setQuery("");
      setPaymentOpen(false);
    }
  }
  function openPayment() {
    if (items.length === 0) {
      flashToast("Agrega productos primero");
      return;
    }
    setPaymentOpen(true);
  }

  async function pay() {
    if (busy) return;
    if (payMethod === "cash" && parseFloat(received || "0") < total) {
      flashToast("Recibido insuficiente");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            ivaPct: it.ivaPct,
          })),
          payments: [{ method: payMethod, amount: total }],
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        flashToast(data.error || "Error al cobrar");
        setBusy(false);
        return;
      }
      window.location.href = `/app/venta/ticket/${data.saleId}`;
    } catch (err) {
      flashToast("Error de red");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Header: scanner + medico */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <span>Producto</span>
              <span className="inline-flex items-center gap-1 normal-case text-neutral-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
                Escáner listo
              </span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Escanea o escribe código / nombre"
                className="w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2.5 font-mono text-sm placeholder:font-sans placeholder:text-neutral-400 focus:border-brand-blue focus:outline-none"
                autoFocus
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-popover">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { addProduct(p); setQuery(""); setShowSuggestions(false); inputRef.current?.focus(); }}
                      className="block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-neutral-900">{p.name}</span>
                        <span className="flex-none font-mono text-xs font-semibold tabular text-brand-blue">{fmt(p.publicPrice)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-mono">{p.barcode ?? "—"}</span>
                        <span>Stock: {p.stock ?? 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto pb-32 lg:pb-0">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center p-8 text-center">
            <div>
              <div className="mb-2 text-4xl">🛒</div>
              <p className="text-sm text-neutral-400">Escanea un producto para comenzar la venta</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-neutral-50 shadow-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="w-20 px-3 py-3 text-center md:px-5">Cant.</th>
                <th className="px-3 py-3 md:px-5">Producto</th>
                <th className="hidden w-24 px-3 py-3 text-right md:table-cell md:px-5">Precio</th>
                <th className="hidden w-24 px-3 py-3 text-right md:table-cell md:px-5">IVA</th>
                <th className="w-28 px-3 py-3 text-right md:px-5">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((it) => {
                const lineSub = it.unitPrice * it.quantity;
                const lineIva = lineSub * (it.ivaPct / 100);
                return (
                  <tr key={it.productId} className="transition hover:bg-blue-50/30">
                    <td className="px-3 py-3 text-center md:px-5">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => changeQty(it.productId, parseFloat(e.target.value) || 1)}
                        className="w-16 rounded border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-sm focus:border-blue-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-3 md:px-5">
                      <div className="text-sm font-medium text-neutral-900">{it.name}</div>
                      {it.requiresPrescription && (
                        <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-warning-500">
                          Requiere receta
                        </span>
                      )}
                      <div className="text-xs text-neutral-500 md:hidden">
                        {fmt(it.unitPrice)} · IVA {it.ivaPct}%
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-right font-mono text-sm tabular text-neutral-700 md:table-cell md:px-5">{fmt(it.unitPrice)}</td>
                    <td className="hidden px-3 py-3 text-right font-mono text-xs tabular text-neutral-500 md:table-cell md:px-5">
                      {it.ivaPct === 0 ? <span className="text-neutral-400">exento</span> : fmt(lineIva)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-semibold tabular text-neutral-900 md:px-5">{fmt(lineSub + lineIva)}</td>
                    <td className="px-2 py-3">
                      <button onClick={() => removeItem(it.productId)} className="rounded p-1 text-neutral-400 transition hover:bg-danger-50 hover:text-danger-500" aria-label="Eliminar">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer fijo en mobile / sidebar en desktop */}
      <aside className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white shadow-[0_-4px_12px_-2px_rgb(16_6_159_/_0.08)] lg:static lg:border-l lg:border-t-0 lg:shadow-none">
        <div className="lg:hidden">
          {/* Resumen compacto mobile */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2 text-xs">
            <span className="text-neutral-500">{items.length} {items.length === 1 ? "item" : "items"}</span>
            <span className="font-mono tabular text-neutral-700">Sub {fmt(subtotal)} · IVA {fmt(ivaTotal)}</span>
          </div>
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={cancelSale}
              disabled={items.length === 0}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm font-medium text-neutral-600 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={openPayment}
              disabled={items.length === 0}
              className="flex flex-1 items-center justify-between rounded-lg bg-orange-500 px-4 py-3 font-heading text-base font-bold text-white shadow-md disabled:opacity-40"
            >
              <span>Cobrar</span>
              <span className="font-mono tabular">{fmt(total)}</span>
            </button>
          </div>
        </div>

        {/* Sidebar desktop */}
        <div className="hidden flex-col lg:flex lg:w-[360px] lg:p-6">
          <div className="space-y-3">
            <Row label="Subtotal" value={fmt(subtotal)} />
            <Row label="IVA" value={fmt(ivaTotal)} />
            <div className="border-t border-neutral-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-heading text-sm font-semibold uppercase tracking-wider text-neutral-700">Total</span>
                <span className="font-mono text-3xl font-bold tabular text-brand-blue">{fmt(total)}</span>
              </div>
            </div>
          </div>
          <div className="mt-auto space-y-2 pt-6">
            <button
              onClick={openPayment}
              disabled={items.length === 0}
              className="flex w-full items-center justify-between rounded-xl bg-orange-500 px-6 py-5 text-left font-heading text-xl font-bold text-white shadow-md transition hover:bg-orange-600 hover:shadow-lg disabled:opacity-40"
            >
              <span>Cobrar</span>
              <span className="flex items-center gap-3">
                <span className="font-mono tabular text-2xl">{fmt(total)}</span>
                <kbd className="rounded bg-white/20 px-2 py-1 font-mono text-xs">F12</kbd>
              </span>
            </button>
            <button
              onClick={cancelSale}
              disabled={items.length === 0}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40"
            >
              Cancelar venta <kbd className="ml-2 rounded border border-neutral-300 px-1 py-0.5 font-mono text-[10px] text-neutral-500">Esc</kbd>
            </button>
          </div>
        </div>
      </aside>

      {/* Modal de cobro */}
      {paymentOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-neutral-900/40 p-0 lg:items-center lg:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-popover lg:rounded-2xl">
            <h2 className="font-heading text-xl font-bold text-neutral-900">Cobrar venta</h2>
            <p className="mt-1 text-sm text-neutral-500">{items.length} productos · {fmt(total)}</p>

            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Forma de pago</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cash" as const, label: "Efectivo" },
                  { id: "card_debit" as const, label: "Débito" },
                  { id: "card_credit" as const, label: "Crédito" },
                  { id: "transfer" as const, label: "Transferencia" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={
                      "rounded-lg border-2 px-3 py-2.5 text-sm font-semibold " +
                      (payMethod === m.id
                        ? "border-brand-blue bg-blue-50 text-brand-blue"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-blue-300")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {payMethod === "cash" && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Recibido</label>
                <input
                  type="number"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-right font-mono text-xl tabular focus:border-blue-300 focus:bg-white focus:outline-none"
                  autoFocus
                />
                {change > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-success-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-success-500">Cambio</span>
                    <span className="font-mono text-lg font-bold tabular text-success-500">{fmt(change)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setPaymentOpen(false)}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Atrás
              </button>
              <button
                onClick={pay}
                disabled={busy}
                className="flex-[2] rounded-lg bg-orange-500 px-4 py-3 font-heading text-base font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-40"
              >
                {busy ? "Cobrando..." : `Confirmar ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-success-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono tabular text-neutral-700">{value}</span>
    </div>
  );
}
