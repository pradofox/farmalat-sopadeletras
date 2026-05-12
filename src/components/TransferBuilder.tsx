import { useEffect, useRef, useState, useMemo } from "react";

interface Warehouse { id: number; name: string; }
interface ProductSuggestion { id: number; name: string; barcode: string | null; stock: number | null; }
interface Item { productId: number; name: string; quantity: number; available: number; }

export default function TransferBuilder({ warehouses }: { warehouses: Warehouse[] }) {
  const [fromId, setFromId] = useState(warehouses[0]?.id ?? 0);
  const [toId, setToId] = useState(warehouses[1]?.id ?? warehouses[0]?.id ?? 0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setItems([]); }, [fromId]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&warehouseId=${fromId}`);
        const data = await res.json();
        setSuggestions((data.products ?? []).filter((p: ProductSuggestion) => (p.stock ?? 0) > 0));
        setShowSugg(true);
      } catch {}
    }, 180);
    return () => clearTimeout(t);
  }, [query, fromId]);

  function addItem(p: ProductSuggestion) {
    setItems((prev) => {
      if (prev.find((x) => x.productId === p.id)) return prev;
      return [...prev, { productId: p.id, name: p.name, quantity: 1, available: p.stock ?? 0 }];
    });
    setQuery(""); setShowSugg(false); inputRef.current?.focus();
  }
  function updateQty(idx: number, q: number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, Math.min(it.available, q)) } : it));
  }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const valid = useMemo(() => fromId !== toId && items.length > 0, [fromId, toId, items]);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: fromId, toWarehouseId: toId, notes: notes || undefined,
          items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.href = "/app/movimientos";
    } catch { setError("Error de red"); setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">{error}</div>}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Desde (origen)</span>
            <select value={fromId} onChange={(e) => setFromId(Number(e.target.value))} className={input}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Hacia (destino)</span>
            <select value={toId} onChange={(e) => setToId(Number(e.target.value))} className={input}>
              {warehouses.filter((w) => w.id !== fromId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Notas</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo del traslado" className={input} />
        </label>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        <header className="border-b border-neutral-200 p-5">
          <h2 className="font-heading text-base font-bold text-neutral-900">Productos a trasladar</h2>
          <div className="relative mt-3 max-w-xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos con stock en origen"
              className="w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
            />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-popover">
                {suggestions.map((p) => (
                  <button key={p.id} type="button" onClick={() => addItem(p)} className="block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium text-neutral-900">{p.name}</span>
                      <span className="flex-none text-xs text-success-500">Stock: {p.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">Agrega productos disponibles en el almacén origen.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-3 py-2">Producto</th>
                <th className="w-24 px-3 py-2 text-right">Disponible</th>
                <th className="w-32 px-3 py-2 text-center">Trasladar</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((it, i) => (
                <tr key={it.productId}>
                  <td className="px-3 py-2 text-neutral-900">{it.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-success-500">{it.available}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="1" max={it.available} value={it.quantity} onChange={(e) => updateQty(i, parseFloat(e.target.value) || 1)} className="w-full rounded border border-neutral-200 px-2 py-1 text-center font-mono text-sm" />
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => removeItem(i)} className="rounded p-1 text-neutral-400 hover:bg-danger-50 hover:text-danger-500"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <a href="/app/movimientos" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">Cancelar</a>
        <button onClick={submit} disabled={!valid || busy} className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-40">
          {busy ? "Procesando..." : "Confirmar traslado"}
        </button>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none";
