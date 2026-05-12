import { useState } from "react";

export default function SupplierForm({ supplier }: { supplier?: any }) {
  const [form, setForm] = useState({
    id: supplier?.id,
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    rfc: supplier?.rfc ?? "",
    address: supplier?.address ?? "",
    paymentTerms: supplier?.paymentTerms ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setBusy(false); return; }
      window.location.href = "/app/proveedores";
    } catch { setError("Error de red"); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">{error}</div>}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Datos del proveedor</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Razón social" required><input value={form.name} onChange={(e) => set("name", e.target.value)} required className={input} /></Field>
          <Field label="Persona de contacto"><input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={input} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={input} /></Field>
          <Field label="Teléfono"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} /></Field>
          <Field label="RFC"><input value={form.rfc} onChange={(e) => set("rfc", e.target.value)} className={`${input} font-mono uppercase`} /></Field>
          <Field label="Términos de pago"><input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Crédito 30 días" className={input} /></Field>
          <Field label="Dirección" cols={2}>
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} className={input} />
          </Field>
        </div>
      </section>
      <div className="flex justify-end gap-3">
        <a href="/app/proveedores" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">Cancelar</a>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-40">
          {busy ? "Guardando..." : supplier?.id ? "Guardar cambios" : "Crear proveedor"}
        </button>
      </div>
    </form>
  );
}

const input = "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none";

function Field({ label, required, children, cols = 1 }: { label: string; required?: boolean; children: any; cols?: number }) {
  return (
    <label className={`block ${cols === 2 ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}{required && <span className="ml-1 text-danger-500">*</span>}
      </span>
      {children}
    </label>
  );
}
