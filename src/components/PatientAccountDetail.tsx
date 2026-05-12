/**
 * Detalle de cuenta hospitalaria con buscador para agregar consumos.
 */
import { useEffect, useRef, useState } from "react";

interface Item { id: number; productName: string; quantity: number; unitPrice: number; ivaPct: number; total: number; }
interface Product { id: number; name: string; barcode: string | null; publicPrice: number; ivaPct: number; stock: number | null; }

const fmt = (n: number) => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

export default function PatientAccountDetail({
  accountId, accountNumber, status, totalCharged, initialItems, warehouseId,
}: {
  accountId: number;
  accountNumber: string;
  status: "open" | "closed" | "cancelled";
  totalCharged: number;
  initialItems: Item[];
  warehouseId: number;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [total, setTotal] = useState(totalCharged);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const readOnly = status !== "open";

  useEffect(() => {
    if (!query.trim() || readOnly) { setSuggestions([]); setShowSugg(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&warehouseId=${warehouseId}`);
        const data = await res.json();
        if (data.match === "barcode" && data.products?.[0]) {
          addProduct(data.products[0]);
          setQuery(""); setSuggestions([]); setShowSugg(false);
        } else {
          setSuggestions(data.products ?? []);
          setShowSugg(true);
        }
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [query, warehouseId, readOnly]);

  async function addProduct(p: Product) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/patient-accounts/${accountId}/items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId: p.id, quantity: 1, unitPrice: p.publicPrice, ivaPct: p.ivaPct }] }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      // Refresca toda la cuenta para actualizar lista
      window.location.reload();
    } catch { setError("Error de red"); setBusy(false); }
  }

  async function close() {
    if (!confirm("Cerrar cuenta y generar factura para cobro?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/patient-accounts/${accountId}/close`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.href = `/app/venta/ticket/${data.saleId}`;
    } catch { setError("Error de red"); setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Agregar consumo</div>
          <div className="relative mt-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escanea o escribe código / nombre"
              className="w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2.5 font-mono text-sm focus:border-brand-blue focus:outline-none"
              autoFocus
            />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-popover">
                {suggestions.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium text-neutral-900">{p.name}</span>
                      <span className="flex-none font-mono text-xs font-semibold text-brand-blue">{fmt(p.publicPrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3 md:px-5">Producto</th>
              <th className="px-4 py-3 text-center md:px-5">Cantidad</th>
              <th className="hidden px-4 py-3 text-right md:table-cell md:px-5">Precio</th>
              <th className="hidden px-4 py-3 text-right md:table-cell md:px-5">IVA</th>
              <th className="px-4 py-3 text-right md:px-5">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 font-medium text-neutral-900 md:px-5">{it.productName}</td>
                <td className="px-4 py-3 text-center font-mono md:px-5">{it.quantity}</td>
                <td className="hidden px-4 py-3 text-right font-mono tabular md:table-cell md:px-5">{fmt(it.unitPrice)}</td>
                <td className="hidden px-4 py-3 text-right text-xs text-neutral-500 md:table-cell md:px-5">{it.ivaPct}%</td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular text-neutral-900 md:px-5">{fmt(it.total)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-400">Sin cargos aún.</td></tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-neutral-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-heading font-bold text-neutral-900 md:px-5">Acumulado</td>
                <td className="px-4 py-3 text-right font-mono text-2xl font-bold tabular text-brand-blue md:px-5">{fmt(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {!readOnly && items.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={close}
            disabled={busy}
            className="rounded-xl bg-orange-500 px-6 py-3 font-heading text-base font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-40"
          >
            {busy ? "Procesando..." : "Dar de alta y cerrar cuenta"}
          </button>
        </div>
      )}
    </div>
  );
}
