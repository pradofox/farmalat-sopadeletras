/**
 * Cotizador - similar al POS pero sin cobro ni descuento de stock.
 * Imprime o exporta PDF.
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface Product {
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
  unitPrice: number;
  ivaPct: number;
  quantity: number;
}

const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Cotizador({ warehouseId = 1 }: { warehouseId?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { subtotal, ivaTotal, total } = useMemo(() => {
    let sub = 0, iva = 0;
    for (const it of items) {
      const lineSub = it.unitPrice * it.quantity;
      sub += lineSub;
      iva += lineSub * (it.ivaPct / 100);
    }
    return { subtotal: sub, ivaTotal: iva, total: sub + iva };
  }, [items]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
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
      return [...prev, { productId: p.id, name: p.name, unitPrice: p.publicPrice, ivaPct: p.ivaPct, quantity: 1 }];
    });
  }
  function changeQty(productId: number, qty: number) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity: Math.max(0.01, qty) } : it)));
  }
  function removeItem(productId: number) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }
  function clear() {
    if (items.length > 0 && !confirm("Limpiar cotización?")) return;
    setItems([]); setQuery(""); setRecipient("");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-bold text-neutral-900 md:text-3xl">Cotización</h1>
          <p className="mt-1 text-sm text-neutral-500">Sin afectar inventario · Imprime o envía al cliente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={clear} className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600">Limpiar</button>
          <button onClick={() => window.print()} disabled={items.length === 0} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-40">Imprimir</button>
        </div>
      </header>

      <div className="mb-4 grid gap-3 print:hidden md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Dirigido a</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Nombre del cliente / empresa"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Agregar producto</span>
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Escanea código o escribe nombre"
              className="w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2.5 font-mono text-sm placeholder:font-sans placeholder:text-neutral-400 focus:border-brand-blue focus:outline-none"
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
                      <span className="flex-none font-mono text-xs font-semibold text-brand-blue">{fmt(p.publicPrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card print:border-0 print:shadow-none">
        <header className="mb-4 hidden items-center justify-between border-b border-neutral-200 pb-4 print:flex">
          <div className="flex items-center gap-3">
            <img src="/brand/farmalat-isotipo-blue.svg" alt="" className="h-10 w-10" />
            <div>
              <div className="font-heading font-bold text-neutral-900">Farmacia Alfa Matriz</div>
              <div className="text-xs text-neutral-500">Av. Topo Chico 590-2F · San Nicolás de los Garza, N.L.</div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div className="font-heading text-base font-bold text-neutral-900">Cotización</div>
            <div>{new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</div>
          </div>
        </header>

        {recipient && (
          <div className="mb-4 text-sm">
            <span className="text-neutral-500">Dirigido a: </span>
            <span className="font-semibold text-neutral-900">{recipient}</span>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <th className="w-20 py-2 text-center">Cant.</th>
              <th className="py-2">Producto</th>
              <th className="w-24 py-2 text-right">Precio</th>
              <th className="w-28 py-2 text-right">Total</th>
              <th className="w-10 print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((it) => (
              <tr key={it.productId}>
                <td className="py-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => changeQty(it.productId, parseFloat(e.target.value) || 1)}
                    className="w-16 rounded border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-sm focus:border-blue-300 focus:outline-none print:border-0 print:bg-transparent"
                  />
                </td>
                <td className="py-2 text-neutral-900">{it.name}</td>
                <td className="py-2 text-right font-mono tabular text-neutral-700">{fmt(it.unitPrice)}</td>
                <td className="py-2 text-right font-mono font-semibold tabular text-neutral-900">{fmt(it.unitPrice * it.quantity * (1 + it.ivaPct / 100))}</td>
                <td className="py-2 text-right print:hidden">
                  <button onClick={() => removeItem(it.productId)} className="rounded p-1 text-neutral-400 hover:bg-danger-50 hover:text-danger-500" aria-label="Eliminar">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-neutral-400">Agrega productos para cotizar.</td></tr>
            )}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="mt-4 ml-auto max-w-xs space-y-1 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="font-mono tabular text-neutral-700">{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">IVA</span><span className="font-mono tabular text-neutral-700">{fmt(ivaTotal)}</span></div>
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2">
              <span className="font-heading font-bold text-neutral-900">Total</span>
              <span className="font-mono text-xl font-bold tabular text-brand-blue">{fmt(total)}</span>
            </div>
          </div>
        )}

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-400 print:mt-12">
          Cotización vigente por 7 días. Precios sujetos a cambio sin previo aviso. Inventario sujeto a disponibilidad al momento del pago.
        </p>
      </div>
    </div>
  );
}
