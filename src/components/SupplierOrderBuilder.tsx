/**
 * Builder de orden a proveedor.
 * - Selector de proveedor + almacen + fecha esperada
 * - Buscador de productos para agregar items
 * - Cada item editable (cantidad, costo, IVA)
 * - Total calculado
 * - POST a /api/supplier-orders y redirige a detalle
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface Supplier { id: number; name: string }
interface Warehouse { id: number; name: string }
interface ProductSuggestion {
  id: number;
  name: string;
  barcode: string | null;
  publicPrice: number;
  ivaPct: number;
  stock: number | null;
}
interface Item {
  productId: number;
  name: string;
  quantity: number;
  unitCost: number;
  ivaPct: number;
}

const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2 });

export default function SupplierOrderBuilder({ suppliers, warehouses }: { suppliers: Supplier[]; warehouses: Warehouse[] }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? 0);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? 0);
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { subtotal, ivaTotal, total } = useMemo(() => {
    let s = 0, iva = 0;
    for (const it of items) {
      const ls = it.quantity * it.unitCost;
      s += ls;
      iva += ls * (it.ivaPct / 100);
    }
    return { subtotal: s, ivaTotal: iva, total: s + iva };
  }, [items]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&warehouseId=${warehouseId}`);
        const data = await res.json();
        setSuggestions(data.products ?? []);
        setShowSugg(true);
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [query, warehouseId]);

  function addItem(p: ProductSuggestion) {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      // Sugerencia: costo es 70% del precio publico (estimacion para que el usuario edite)
      const cost = Number((p.publicPrice * 0.7).toFixed(2));
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitCost: cost, ivaPct: p.ivaPct }];
    });
    setQuery(""); setShowSugg(false); inputRef.current?.focus();
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!supplierId || !warehouseId || items.length === 0) {
      setError("Selecciona proveedor, almacén y al menos 1 producto"); return;
    }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId, warehouseId,
          expectedAt: expectedAt || undefined,
          notes: notes || undefined,
          items: items.map((it) => ({
            productId: it.productId,
            quantityOrdered: it.quantity,
            unitCost: it.unitCost,
            ivaPct: it.ivaPct,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.href = `/app/ordenes/${data.orderId}`;
    } catch { setError("Error de red"); setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">{error}</div>}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Datos de la orden</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Proveedor</span>
            <select value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))} className={input}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Almacén destino</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))} className={input}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Fecha esperada</span>
            <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className={input} />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Notas</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} placeholder="Notas internas, instrucciones de entrega..." />
        </label>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        <header className="border-b border-neutral-200 p-5">
          <h2 className="font-heading text-base font-bold text-neutral-900">Productos en la orden</h2>
          <div className="relative mt-3 max-w-xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre o código"
              className="w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
            />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-popover">
                {suggestions.map((p) => (
                  <button key={p.id} type="button" onClick={() => addItem(p)} className="block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium text-neutral-900">{p.name}</span>
                      <span className="flex-none text-xs text-neutral-500">Stock: {p.stock ?? 0}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">Aún no hay productos. Búscalos arriba y agrégalos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-3 py-2">Producto</th>
                <th className="w-24 px-3 py-2 text-center">Cantidad</th>
                <th className="w-32 px-3 py-2 text-right">Costo unit.</th>
                <th className="w-20 px-3 py-2 text-right">IVA %</th>
                <th className="w-28 px-3 py-2 text-right">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((it, i) => (
                <tr key={it.productId}>
                  <td className="px-3 py-2 text-neutral-900">{it.name}</td>
                  <td className="px-3 py-2"><input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 1 })} className="w-full rounded border border-neutral-200 px-2 py-1 text-center font-mono text-sm" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={it.unitCost} onChange={(e) => updateItem(i, { unitCost: parseFloat(e.target.value) || 0 })} className="w-full rounded border border-neutral-200 px-2 py-1 text-right font-mono text-sm" /></td>
                  <td className="px-3 py-2"><input type="number" value={it.ivaPct} onChange={(e) => updateItem(i, { ivaPct: parseFloat(e.target.value) || 0 })} className="w-full rounded border border-neutral-200 px-2 py-1 text-right font-mono text-sm" /></td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular text-neutral-900">{fmt(it.quantity * it.unitCost * (1 + it.ivaPct / 100))}</td>
                  <td className="px-2 py-2"><button onClick={() => removeItem(i)} className="rounded p-1 text-neutral-400 hover:bg-danger-50 hover:text-danger-500"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {items.length > 0 && (
          <div className="border-t border-neutral-200 px-5 py-4">
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <Row label="Subtotal" value={fmt(subtotal)} />
              <Row label="IVA" value={fmt(ivaTotal)} />
              <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2">
                <span className="font-heading font-bold text-neutral-900">Total</span>
                <span className="font-mono text-xl font-bold tabular text-brand-blue">{fmt(total)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <a href="/app/ordenes" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">Cancelar</a>
        <button onClick={submit} disabled={busy || items.length === 0} className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-40">
          {busy ? "Guardando..." : "Guardar orden"}
        </button>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono tabular text-neutral-700">{value}</span>
    </div>
  );
}
