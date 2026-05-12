/**
 * Wizard para abrir cuenta hospitalaria.
 * 1. Datos paciente (nuevo o existente)
 * 2. Datos de cuenta (cama, pagador, notas)
 */
import { useEffect, useState } from "react";

interface Warehouse { id: number; name: string; }
interface Patient { id: number; fullName: string; identifier: string | null; }

export default function PatientAccountBuilder({ warehouses }: { warehouses: Warehouse[] }) {
  const [step, setStep] = useState<"patient" | "account">("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [newPatient, setNewPatient] = useState({ fullName: "", identifier: "", phone: "" });

  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? 0);
  const [bedNumber, setBedNumber] = useState("");
  const [payerType, setPayerType] = useState<"private" | "insurance" | "imss" | "issste" | "other">("private");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search.trim()) { setPatients([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients ?? []);
        }
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  async function submit() {
    setBusy(true); setError(null);
    try {
      let patientId = selected?.id;
      if (!patientId) {
        if (!newPatient.fullName) { setError("Nombre del paciente requerido"); setBusy(false); return; }
        const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPatient) });
        const data = await res.json();
        if (!data.ok) { setError(data.error); setBusy(false); return; }
        patientId = data.id;
      }
      const r = await fetch("/api/patient-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, warehouseId, bedNumber: bedNumber || undefined, payerType, notes: notes || undefined }),
      });
      const data2 = await r.json();
      if (!data2.ok) { setError(data2.error); setBusy(false); return; }
      window.location.href = `/app/cuentas-paciente/${data2.accountId}`;
    } catch { setError("Error de red"); setBusy(false); }
  }

  if (step === "patient") {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Paciente existente</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente por nombre o número de expediente"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none"
          />
          {patients.length > 0 && (
            <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-neutral-100">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { setSelected(p); setStep("account"); }}
                    className="block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50"
                  >
                    <div className="font-medium text-neutral-900">{p.fullName}</div>
                    {p.identifier && <div className="font-mono text-[10px] text-neutral-500">{p.identifier}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center text-xs uppercase tracking-wider text-neutral-400">o</div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Paciente nuevo</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Nombre completo *</span>
              <input value={newPatient.fullName} onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Expediente / CURP</span>
              <input value={newPatient.identifier} onChange={(e) => setNewPatient({ ...newPatient, identifier: e.target.value })} className={`${input} font-mono uppercase`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Teléfono</span>
              <input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} className={input} />
            </label>
          </div>
          <button onClick={() => { setSelected(null); setStep("account"); }} disabled={!newPatient.fullName} className="mt-4 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            Continuar
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Paciente</div>
        <div className="font-semibold text-neutral-900">{selected?.fullName ?? newPatient.fullName}</div>
        <button onClick={() => setStep("patient")} className="mt-1 text-xs text-brand-blue underline">Cambiar</button>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-heading text-base font-bold text-neutral-900">Datos de la cuenta</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Sucursal / Almacén</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))} className={input}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Número de cama</span>
            <input value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Tipo de pagador</span>
            <select value={payerType} onChange={(e) => setPayerType(e.target.value as any)} className={input}>
              <option value="private">Particular</option>
              <option value="insurance">Aseguradora</option>
              <option value="imss">IMSS</option>
              <option value="issste">ISSSTE</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Notas</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Diagnóstico, médico tratante, observaciones..." className={input} />
          </label>
        </div>
      </section>

      {error && <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">{error}</div>}

      <div className="flex justify-end gap-3">
        <a href="/app/cuentas-paciente" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">Cancelar</a>
        <button onClick={submit} disabled={busy} className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-40">
          {busy ? "Abriendo..." : "Abrir cuenta"}
        </button>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-blue-300 focus:bg-white focus:outline-none";
