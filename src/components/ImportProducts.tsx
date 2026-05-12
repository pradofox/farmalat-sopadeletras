/**
 * Importador de productos desde XLSX / CSV.
 * Flujo: drop file -> preview (dryRun) -> confirmar -> insertar.
 */
import { useRef, useState } from "react";

interface PreviewResult {
  ok: boolean;
  total: number;
  valid: number;
  errors: Array<{ row: number; reason: string }>;
  sample: any[];
  columnsDetected: string[];
}

export default function ImportProducts() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function previewFile(f: File) {
    setBusy(true); setError(null); setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("dryRun", "1");
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Error al previsualizar"); setBusy(false); return; }
      setPreview(data);
    } catch (err) {
      setError("Error de red");
    }
    setBusy(false);
  }

  async function doImport() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Error al importar"); setBusy(false); return; }
      setImportResult({ inserted: data.inserted, skipped: data.skipped });
    } catch (err) {
      setError("Error de red");
    }
    setBusy(false);
  }

  function handleFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setImportResult(null);
    previewFile(f);
  }

  if (importResult) {
    return (
      <div className="rounded-2xl border border-success-500 bg-success-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" /></svg>
        </div>
        <h2 className="font-heading text-xl font-bold text-success-500">Importación completada</h2>
        <p className="mt-2 text-sm text-neutral-700">
          {importResult.inserted} productos agregados · {importResult.skipped} omitidos (ya existían por código de barras)
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <a href="/app/productos" className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white">Ver productos</a>
          <button
            onClick={() => { setFile(null); setPreview(null); setImportResult(null); }}
            className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Importar otro archivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className={
          "cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition " +
          (dragOver ? "border-brand-blue bg-blue-50" : "border-neutral-300 bg-white hover:border-blue-300 hover:bg-blue-50/40")
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue text-white">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-heading text-base font-bold text-neutral-900">
          {file ? file.name : "Arrastra tu archivo aquí o haz click"}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">XLSX, XLS o CSV · Máx 10 MB</p>
      </div>

      {/* Ayuda */}
      {!preview && !busy && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <h4 className="font-heading text-sm font-bold text-neutral-900">Columnas que el sistema reconoce</h4>
          <p className="mt-1 text-xs text-neutral-500">No importa el orden. Detectamos por nombre del encabezado (mayúsculas/acentos ignorados).</p>
          <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
            {[
              ["Nombre / Producto / Descripción", "Texto obligatorio"],
              ["Código de barras / Código", "Texto opcional"],
              ["Costo / Precio compra", "Número decimal"],
              ["Precio / Precio público / PVP", "Número decimal obligatorio"],
              ["IVA / IVA %", "0 o 16"],
              ["Departamento / Categoría", "Se crea si no existe"],
              ["Grupo COFEPRIS", "I, II, III, IV o V"],
              ["Presentación", "Caja con 30 tab, etc."],
              ["Principio activo", "Para medicamentos"],
            ].map(([h, d]) => (
              <div key={h} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                <div className="font-semibold text-neutral-900">{h}</div>
                <div className="text-neutral-500">{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {busy && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          Procesando archivo...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-danger-500 bg-danger-50 p-4 text-sm text-danger-500">{error}</div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Filas totales" value={preview.total} />
            <Stat label="Filas válidas" value={preview.valid} valid />
            <Stat label="Filas con error" value={preview.errors.length} danger={preview.errors.length > 0} />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h4 className="font-heading text-sm font-bold text-neutral-900">Columnas detectadas</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {preview.columnsDetected.map((c) => (
                <span key={c} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-brand-blue">{c}</span>
              ))}
            </div>
          </div>

          {preview.sample.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h4 className="mb-3 font-heading text-sm font-bold text-neutral-900">Muestra (primeros 5 productos)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-2 py-1 text-left text-neutral-500">Nombre</th>
                      <th className="px-2 py-1 text-left text-neutral-500">Código</th>
                      <th className="px-2 py-1 text-right text-neutral-500">Costo</th>
                      <th className="px-2 py-1 text-right text-neutral-500">Precio</th>
                      <th className="px-2 py-1 text-right text-neutral-500">IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-100">
                        <td className="px-2 py-1 text-neutral-900">{r.name}</td>
                        <td className="px-2 py-1 font-mono text-neutral-700">{r.barcode ?? "—"}</td>
                        <td className="px-2 py-1 text-right font-mono text-neutral-700">{r.cost ?? "—"}</td>
                        <td className="px-2 py-1 text-right font-mono font-semibold text-neutral-900">${r.publicPrice}</td>
                        <td className="px-2 py-1 text-right text-neutral-700">{r.ivaPct ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-2xl border border-warning-500 bg-warning-50 p-5">
              <h4 className="font-heading text-sm font-bold text-warning-500">
                {preview.errors.length} filas serán omitidas
              </h4>
              <ul className="mt-2 text-xs text-neutral-700">
                {preview.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>Fila {e.row}: {e.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button onClick={() => { setFile(null); setPreview(null); }} className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700">
              Cancelar
            </button>
            <button
              onClick={doImport}
              disabled={busy || preview.valid === 0}
              className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-40"
            >
              {busy ? "Importando..." : `Importar ${preview.valid} productos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valid, danger }: { label: string; value: number; valid?: boolean; danger?: boolean }) {
  const cls = danger ? "text-danger-500" : valid ? "text-success-500" : "text-neutral-900";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular ${cls}`}>{value}</div>
    </div>
  );
}
