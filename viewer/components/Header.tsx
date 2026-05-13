"use client";

import type { Customer, Diagnosis } from "@/lib/types";

interface Props {
  customer: Customer;
  diagnosis: Diagnosis;
  reportId: string;
  lang: string;
  source: "sample" | "live";
  onLoadId: (id: string, lang: string) => void;
  onLoadSample: () => void;
  loading: boolean;
}

function age(birthday: string | null): number | null {
  if (!birthday) return null;
  const d = new Date(birthday.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function Header({ customer, diagnosis, reportId, lang, source, onLoadId, onLoadSample, loading }: Props) {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = (fd.get("id") as string).trim();
    const language = (fd.get("lang") as string).trim() || "en";
    if (id) onLoadId(id, language);
  }

  const realAge = age(customer.birthday);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md sticky top-0 z-30 isolate">
      <div className="max-w-[1600px] mx-auto px-4 py-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight">{customer.cusName}</h1>
            <span className="text-xs text-[var(--muted)]">
              {customer.gender === 1 ? "Male" : customer.gender === 0 ? "Female" : "—"}
              {realAge != null ? ` · ${realAge}` : ""}
            </span>
            {customer.phone && <span className="text-xs text-[var(--faint)]">{customer.phone}</span>}
            {customer.email && <span className="text-xs text-[var(--faint)]">{customer.email}</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${source === "live" ? "bg-[var(--sage-soft)] text-[var(--sage)]" : "bg-[var(--hairline-2)] text-[var(--muted)]"}`}>
              {source === "live" ? "live" : "sample"}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5 flex flex-wrap gap-3">
            <span><span className="text-[var(--faint)]">Captured</span> {diagnosis.createTime}</span>
            <span><span className="text-[var(--faint)]">Skin age</span> {diagnosis.skinAge}</span>
            <span><span className="text-[var(--faint)]">Composite score</span> {Math.round(diagnosis.skinScore * 100)}/100</span>
            <span><span className="text-[var(--faint)]">Algo</span> {diagnosis.algVersion}</span>
            <span><span className="text-[var(--faint)]">App</span> {diagnosis.appVersion}</span>
            <span><span className="text-[var(--faint)]">Device</span> {diagnosis.deviceNo}</span>
            <span><span className="text-[var(--faint)]">Shop</span> {customer.shopName}</span>
          </div>
          {customer.diagnosisCc && (
            <div className="text-xs text-[var(--teal)]/80 mt-1">
              <span className="text-[var(--faint)]">CC: </span>
              {customer.diagnosisCc}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">Diagnosis ID</label>
            <input
              key={reportId}
              name="id"
              defaultValue={reportId}
              placeholder="UUID"
              className="bg-[var(--ink)]/20 border border-[var(--hairline)] rounded px-2 py-1.5 font-mono w-[290px]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">Lang</label>
            <select name="lang" defaultValue={lang} className="bg-[var(--ink)]/20 border border-[var(--hairline)] rounded px-2 py-1.5">
              {["en", "zh", "es", "fr", "de", "it", "pt", "ja", "ru", "ar", "tr", "pl", "nl", "sk", "el", "he", "hu", "id", "lt", "th", "uk", "vi"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded bg-[var(--teal-soft)] border border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-soft)] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load live"}
          </button>
          <button type="button" onClick={onLoadSample} className="px-3 py-1.5 rounded border border-[var(--hairline)] hover:bg-[var(--surface-alt)] text-[var(--ink-2)]">
            Reset sample
          </button>
        </form>
      </div>
    </header>
  );
}
