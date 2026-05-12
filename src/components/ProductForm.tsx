/**
 * Formulario de alta / edicion de producto.
 * Auto-calcula precio publico desde costo + utilidad cuando se edita uno u otro.
 */
import { useEffect, useState } from "react";

interface Props {
  product?: any;
  departments: Array<{ id: number; name: string }>;
  units: Array<{ id: number; name: string; abbreviation: string | null }>;
}

export default function ProductForm({ product, departments, units }: Props) {
  const [form, setForm] = useState({
    id: product?.id,
    name: product?.name ?? "",
    barcode: product?.barcode ?? "",
    departmentId: product?.departmentId ?? departments[0]?.id ?? "",
    saleUnitId: product?.saleUnitId ?? units[0]?.id ?? "",
    cost: product?.cost ?? 0,
    utilityPct: product?.utilityPct ?? 30,
    publicPrice: product?.publicPrice ?? 0,
    ivaPct: product?.ivaPct ?? 0,
    commissionPct: product?.commissionPct ?? 0,
    isDrug: product?.isDrug ?? false,
    isAntibiotic: product?.isAntibiotic ?? false,
    isGeneric: product?.isGeneric ?? false,
    controlledGroup: product?.controlledGroup ?? "",
    requiresPrescription: product?.requiresPrescription ?? false,
    retainsPrescription: product?.retainsPrescription ?? false,
    activeIngredient: product?.activeIngredient ?? "",
    presentation: product?.presentation ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculo: cuando cambian costo o utilidad, recalcular precio publico
  useEffect(() => {
    const c = parseFloat(String(form.cost)) || 0;
    const u = parseFloat(String(form.utilityPct)) || 0;
    setForm((f) => ({ ...f, publicPrice: Number((c * (1 + u / 100)).toFixed(2)) }));
  }, [form.cost, form.utilityPct]);

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cost: parseFloat(String(form.cost)) || 0,
          utilityPct: parseFloat(String(form.utilityPct)) || 0,
          publicPrice: parseFloat(String(form.publicPrice)) || 0,
          ivaPct: parseFloat(String(form.ivaPct)) || 0,
          commissionPct: parseFloat(String(form.commissionPct)) || 0,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          saleUnitId: form.saleUnitId ? Number(form.saleUnitId) : null,
          controlledGroup: form.controlledGroup || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.href = "/app/productos";
    } catch (err) {
      setError("Error de red"); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">{error}</div>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Datos del producto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre" required>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={input} />
          </Field>
          <Field label="Código de barras">
            <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} className={`${input} font-mono`} />
          </Field>
          <Field label="Departamento">
            <select value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} className={input}>
              <option value="">—</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </Field>
          <Field label="Unidad de venta">
            <select value={form.saleUnitId} onChange={(e) => set("saleUnitId", e.target.value)} className={input}>
              <option value="">—</option>
              {units.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </Field>
          <Field label="Presentación">
            <input value={form.presentation} onChange={(e) => set("presentation", e.target.value)} placeholder="Caja con 30 tabletas" className={input} />
          </Field>
          <Field label="Principio activo">
            <input value={form.activeIngredient} onChange={(e) => set("activeIngredient", e.target.value)} className={input} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Precios</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Costo">
            <input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} className={`${input} font-mono`} />
          </Field>
          <Field label="Utilidad %">
            <input type="number" step="0.1" value={form.utilityPct} onChange={(e) => set("utilityPct", e.target.value)} className={`${input} font-mono`} />
          </Field>
          <Field label="Precio público">
            <input type="number" step="0.01" value={form.publicPrice} onChange={(e) => set("publicPrice", e.target.value)} className={`${input} font-mono font-bold text-brand-blue`} />
          </Field>
          <Field label="IVA %">
            <select value={form.ivaPct} onChange={(e) => set("ivaPct", e.target.value)} className={input}>
              <option value="0">0% (medicina de patente)</option>
              <option value="16">16%</option>
            </select>
          </Field>
          <Field label="Comisión médico %">
            <input type="number" step="0.1" value={form.commissionPct} onChange={(e) => set("commissionPct", e.target.value)} className={`${input} font-mono`} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Clasificación regulatoria</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Grupo COFEPRIS (Art. 226 LGS)">
            <select value={form.controlledGroup} onChange={(e) => set("controlledGroup", e.target.value)} className={input}>
              <option value="">— No controlado</option>
              <option value="I">I · Estupefacientes</option>
              <option value="II">II · Psicotrópicos A (retención)</option>
              <option value="III">III · Psicotrópicos B (surtido limitado)</option>
              <option value="IV">IV · Antibióticos (receta)</option>
              <option value="V">V · Libre venta</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <Checkbox label="Es fármaco" checked={form.isDrug} onChange={(v) => set("isDrug", v)} />
            <Checkbox label="Antibiótico" checked={form.isAntibiotic} onChange={(v) => set("isAntibiotic", v)} />
            <Checkbox label="Genérico" checked={form.isGeneric} onChange={(v) => set("isGeneric", v)} />
            <Checkbox label="Requiere receta" checked={form.requiresPrescription} onChange={(v) => set("requiresPrescription", v)} />
            <Checkbox label="Retiene receta" checked={form.retainsPrescription} onChange={(v) => set("retainsPrescription", v)} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <a href="/app/productos" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">Cancelar</a>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-40">
          {busy ? "Guardando..." : product?.id ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

const input = "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: any }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}{required && <span className="ml-1 text-danger-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm hover:bg-blue-50">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue" />
      <span className="text-neutral-700">{label}</span>
    </label>
  );
}
