"use client";

import { useMemo, useState } from "react";
import { RADAR_METRICS, SYMPTOM_LABEL, WRINKLE_REGIONS, severityFromScore, SEVERITY_COLOR } from "@/lib/constants";
import type { ReportPayload, DiagnosisSkin } from "@/lib/types";
import { numField, nullableNumField } from "@/lib/util";

interface Props {
  a: ReportPayload;
  b: ReportPayload | null;
  loading: boolean;
  error: string | null;
  direction: -1 | 0 | 1;
  onLoad: (id: string, lang: string) => void;
  onSwap: () => void;
  onClear: () => void;
}

function faceFor(report: ReportPayload, direction: -1 | 0 | 1): DiagnosisSkin | null {
  return report.datas.diagnosis.diagnosisSkinList.find((f) => f.direction === direction) ?? null;
}

function fmtScore(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return Math.round(v * 100).toString();
}

function deltaBadge(d: number, smaller: number = 3) {
  if (Math.abs(d) < smaller) return { txt: `±${Math.abs(Math.round(d))}`, cls: "text-[var(--faint)]" };
  return { txt: `${d > 0 ? "+" : ""}${Math.round(d)}`, cls: d > 0 ? "text-[var(--sage)]" : "text-[var(--rose)]" };
}

export default function ComparePanel({ a, b, loading, error, direction, onLoad, onSwap, onClear }: Props) {
  const [open, setOpen] = useState(b !== null);
  const aFace = faceFor(a, direction);
  const bFace = b ? faceFor(b, direction) : null;

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const id = (fd.get("id") as string).trim();
    const lang = (fd.get("lang") as string).trim() || "en";
    if (id) onLoad(id, lang);
  }

  // Compose metric rows: skinScore + wrinkleScore + each radar key + each wrinkle region
  const rows = useMemo(() => {
    if (!aFace) return [];
    const list: { key: string; label: string; getA: () => number | null; getB: () => number | null }[] = [];
    list.push({ key: "skinScore", label: "Skin score", getA: () => numField(aFace, "skinScore"), getB: () => bFace ? numField(bFace, "skinScore") : null });
    list.push({ key: "wrinkleScore", label: "Wrinkle score", getA: () => numField(aFace, "wrinkleScore"), getB: () => bFace ? numField(bFace, "wrinkleScore") : null });
    for (const m of RADAR_METRICS) {
      list.push({ key: m.key, label: m.label, getA: () => numField(aFace, m.key), getB: () => bFace ? numField(bFace, m.key) : null });
    }
    for (const r of WRINKLE_REGIONS) {
      list.push({
        key: `w_${r.key}`,
        label: `Wrinkle: ${r.label}`,
        getA: () => nullableNumField(aFace, `wrinkle${r.key}Score`),
        getB: () => bFace ? nullableNumField(bFace, `wrinkle${r.key}Score`) : null,
      });
    }
    return list;
  }, [aFace, bFace]);

  // Per-symptom severity deltas (sum counts across all degree levels for current direction).
  const symptomCounts = useMemo(() => {
    function totalsFor(face: DiagnosisSkin | null): Map<string, number> {
      const m = new Map<string, number>();
      if (!face) return m;
      for (const d of face.diagnosisSkinDetailList) {
        m.set(d.symptom, (m.get(d.symptom) ?? 0) + d.counts);
      }
      return m;
    }
    const ta = totalsFor(aFace);
    const tb = totalsFor(bFace);
    const codes = new Set<string>([...ta.keys(), ...tb.keys()]);
    return [...codes].sort().map((c) => ({
      code: c,
      a: ta.get(c) ?? 0,
      b: tb.get(c) ?? 0,
    }));
  }, [aFace, bFace]);

  const openDate = a.datas.diagnosis.createTime;
  const compareDate = b?.datas.diagnosis.createTime;

  return (
    <div className="panel">
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <h3 className="text-sm font-medium text-[var(--ink)]">
          Compare to another report{b ? " · loaded" : ""}
        </h3>
        <span className="text-xs text-[var(--faint)]">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 text-xs">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">B · diagnosis ID</label>
              <input
                name="id"
                placeholder="UUID for the report you want to compare against"
                className="bg-[var(--ink)]/20 border border-[var(--hairline)] rounded px-2 py-1.5 font-mono w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">Lang</label>
              <select name="lang" defaultValue="en" className="bg-[var(--ink)]/20 border border-[var(--hairline)] rounded px-2 py-1.5">
                {["en", "zh", "es", "fr", "de", "it", "pt", "ja", "ru", "ar", "tr", "pl", "nl", "sk", "el", "he", "hu", "id", "lt", "th", "uk", "vi"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded bg-[var(--amber-soft)] border border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber-soft)] disabled:opacity-50">
              {loading ? "Loading…" : "Load B"}
            </button>
            {b && (
              <>
                <button type="button" onClick={onSwap} className="px-3 py-1.5 rounded border border-[var(--hairline)] hover:bg-[var(--surface-alt)] text-[var(--ink-2)]">Swap A↔B</button>
                <button type="button" onClick={onClear} className="px-3 py-1.5 rounded border border-[var(--rose)] hover:bg-[var(--rose-soft)] text-[var(--rose)]">Clear B</button>
              </>
            )}
          </form>

          {error && <div className="text-xs text-[var(--rose)]">{error}</div>}

          {b && bFace && aFace && (
            <>
              {/* Captures summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="panel-2 px-3 py-2">
                  <div className="text-[10px] uppercase text-[var(--teal)]/80">A</div>
                  <div className="font-medium">{a.datas.customer.cusName}</div>
                  <div className="text-[var(--muted)]">{openDate}</div>
                  <div className="text-[var(--faint)] text-[10px] mt-0.5 font-mono">{a.datas.diagnosis.id}</div>
                </div>
                <div className="panel-2 px-3 py-2">
                  <div className="text-[10px] uppercase text-[var(--amber)]/80">B</div>
                  <div className="font-medium">{b.datas.customer.cusName}</div>
                  <div className="text-[var(--muted)]">{compareDate}</div>
                  <div className="text-[var(--faint)] text-[10px] mt-0.5 font-mono">{b.datas.diagnosis.id}</div>
                </div>
              </div>

              {/* Daylight side-by-side for current direction */}
              <div className="grid grid-cols-2 gap-3">
                <ImagePanel face={aFace} label="A" tone="cyan" />
                <ImagePanel face={bFace} label="B" tone="amber" />
              </div>

              {/* Score deltas */}
              <div className="panel-2 p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                  Score deltas (B − A) · current direction · positive = improvement
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {rows.map((r) => {
                    const va = r.getA();
                    const vb = r.getB();
                    if (va == null && vb == null) return null;
                    const a100 = va == null ? null : va * 100;
                    const b100 = vb == null ? null : vb * 100;
                    const d = (b100 ?? 0) - (a100 ?? 0);
                    const badge = deltaBadge(d);
                    const sevA = a100 == null ? null : severityFromScore(va!);
                    const sevB = b100 == null ? null : severityFromScore(vb!);
                    return (
                      <div key={r.key} className="grid grid-cols-[1fr_40px_40px_50px] gap-2 items-center">
                        <span className="text-[var(--ink-2)] truncate" title={r.key}>{r.label}</span>
                        <span className={`text-right font-mono ${sevA ? SEVERITY_COLOR[sevA].fg : "text-[var(--faint)]"}`}>{fmtScore(va)}</span>
                        <span className={`text-right font-mono ${sevB ? SEVERITY_COLOR[sevB].fg : "text-[var(--faint)]"}`}>{fmtScore(vb)}</span>
                        <span className={`text-right font-mono text-[11px] ${badge.cls}`}>{badge.txt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Symptom-count deltas */}
              <div className="panel-2 p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                  Symptom counts · current direction · ΔB = total counts B − A
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-[var(--faint)] uppercase">
                      <th className="text-left font-normal py-1 pr-2">Symptom</th>
                      <th className="text-right font-normal py-1 px-2">A</th>
                      <th className="text-right font-normal py-1 px-2">B</th>
                      <th className="text-right font-normal py-1 px-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomCounts.map((s) => {
                      const d = s.b - s.a;
                      const badge = d === 0
                        ? { txt: "±0", cls: "text-[var(--faint)]" }
                        : d < 0
                          ? { txt: `${d}`, cls: "text-[var(--sage)]" } // fewer is better
                          : { txt: `+${d}`, cls: "text-[var(--rose)]" };
                      return (
                        <tr key={s.code} className="border-t border-white/5">
                          <td className="py-0.5 pr-2 text-[var(--ink)]">
                            <span className="kbd mr-2">{s.code}</span>
                            {SYMPTOM_LABEL[s.code] ?? "Unknown"}
                          </td>
                          <td className="py-0.5 px-2 text-right font-mono">{s.a}</td>
                          <td className="py-0.5 px-2 text-right font-mono">{s.b}</td>
                          <td className={`py-0.5 px-2 text-right font-mono ${badge.cls}`}>{badge.txt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ImagePanel({ face, label, tone }: { face: DiagnosisSkin; label: string; tone: "cyan" | "amber" }) {
  const tint = tone === "cyan" ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "bg-[var(--amber-soft)] text-[var(--amber)]";
  return (
    <div className="panel-2 relative aspect-[9/16] overflow-hidden">
      {face.imgDaylight ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={face.imgDaylight} alt={label} className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--faint)]">No daylight image</div>
      )}
      <span className={`absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded ${tint}`}>{label}</span>
    </div>
  );
}
