/**
 * Command palette estilo Linear/Stripe.
 * Cmd+K / Ctrl+K abre. Busca productos, ventas, clientes y pacientes en vivo.
 */
import { useEffect, useRef, useState } from "react";

interface Result {
  id: number;
  label: string;
  sublabel?: string;
  group: string;
  url: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (open && e.key === "Escape") {
        setOpen(false);
      } else if (open && e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (open && e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
      } else if (open && e.key === "Enter" && results[selected]) {
        window.location.href = results[selected].url;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const all: Result[] = [
          ...(data.products ?? []).map((p: any) => ({ id: p.id, label: p.name, sublabel: p.barcode, group: "Productos", url: p.url })),
          ...(data.sales ?? []).map((s: any) => ({ id: s.id, label: s.ticketNumber, sublabel: `$${Number(s.total).toLocaleString("es-MX")}`, group: "Ventas", url: s.url })),
          ...(data.customers ?? []).map((c: any) => ({ id: c.id, label: c.name, sublabel: c.rfc, group: "Clientes", url: c.url })),
          ...(data.patients ?? []).map((p: any) => ({ id: p.id, label: p.fullName, sublabel: p.identifier, group: "Pacientes", url: p.url })),
        ];
        setResults(all);
        setSelected(0);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (!open) return null;

  const grouped: Record<string, Result[]> = {};
  for (const r of results) (grouped[r.group] ??= []).push(r);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-900/40 backdrop-blur-sm p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-popover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
          <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, ventas, clientes, pacientes..."
            className="flex-1 bg-transparent text-base placeholder:text-neutral-400 focus:outline-none"
          />
          <kbd className="rounded border border-neutral-200 px-2 py-1 font-mono text-xs text-neutral-400">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query.length >= 2 && (
            <div className="px-5 py-12 text-center text-sm text-neutral-400">Sin resultados</div>
          )}
          {results.length === 0 && query.length < 2 && (
            <div className="px-5 py-12 text-center text-sm text-neutral-400">
              Escribe al menos 2 letras para buscar
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{group}</div>
              {items.map((r) => {
                const idx = results.indexOf(r);
                return (
                  <a
                    key={`${r.group}-${r.id}`}
                    href={r.url}
                    onMouseEnter={() => setSelected(idx)}
                    className={"flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition " + (selected === idx ? "bg-blue-50" : "hover:bg-neutral-50")}
                  >
                    <span className="truncate font-medium text-neutral-900">{r.label}</span>
                    {r.sublabel && <span className="flex-none font-mono text-xs text-neutral-500">{r.sublabel}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span><kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono">↑↓</kbd> navegar · <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono">↵</kbd> abrir</span>
          <span><kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono">⌘K</kbd></span>
        </div>
      </div>
    </div>
  );
}
