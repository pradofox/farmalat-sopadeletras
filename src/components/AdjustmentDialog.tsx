/**
 * Boton + modal de ajuste manual de inventario para un producto.
 * Usado desde /app/inventario en cada fila.
 */
import { useState } from "react";

interface Props {
  productId: number;
  productName: string;
  warehouseId: number;
  currentQuantity: number;
}

export default function AdjustmentDialog({ productId, productName, warehouseId, currentQuantity }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"adjustment_in" | "adjustment_out" | "expired_loss">("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOut = type !== "adjustment_in";
  const signedQty = (parseFloat(quantity) || 0) * (isOut ? -1 : 1);
  const newQty = currentQuantity + signedQty;

  async function submit() {
    if (!quantity || !reason) { setError("Cantidad y motivo requeridos"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId, productId, quantity: signedQty, reason, type }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.reload();
    } catch { setError("Error de red"); setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded p-1 text-neutral-400 transition hover:bg-blue-50 hover:text-brand-blue" title="Ajustar existencia">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-neutral-900/40 backdrop-blur-sm p-0 lg:items-center lg:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-popover lg:rounded-2xl">
            <h2 className="font-heading text-xl font-bold text-neutral-900">Ajuste de inventario</h2>
            <p className="mt-1 truncate text-sm text-neutral-500">{productName}</p>
            <p className="mt-3 text-xs text-neutral-500">Existencia actual: <span className="font-mono font-bold text-neutral-900">{currentQuantity}</span></p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Tipo</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "adjustment_in",  label: "Entrada" },
                    { id: "adjustment_out", label: "Salida" },
                    { id: "expired_loss",   label: "Caducidad" },
                  ].map((t) => (
                    <button key={t.id} onClick={() => setType(t.id as any)} className={"rounded-lg border-2 px-3 py-2 text-xs font-semibold " + (type === t.id ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-neutral-200 bg-white text-neutral-600 hover:border-blue-300")}>{t.label}</button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Cantidad</span>
                <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-right font-mono text-lg tabular focus:border-blue-300 focus:bg-white focus:outline-none" />
                {quantity && (
                  <span className={"mt-1 block text-xs " + (newQty < 0 ? "text-danger-500" : "text-neutral-500")}>
                    Nueva existencia: <span className="font-mono font-bold">{newQty}</span>
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Motivo</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recuento físico, merma, devolución..." className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none" />
              </label>

              {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700">Cancelar</button>
              <button onClick={submit} disabled={busy || !quantity || !reason || newQty < 0} className="flex-1 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-40">
                {busy ? "Guardando..." : "Aplicar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
