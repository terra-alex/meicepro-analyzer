"use client";

import { Fragment, useMemo } from "react";
import { DEGREE_LABEL_DEFAULT, DEGREE_LABEL_WRINKLE, SYMPTOM_LABEL, WRINKLE_SYMPTOMS } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";

interface Props {
  faces: DiagnosisSkin[];
}

// Renders the diagnosisSkinDetailList as a heatmap:
//   rows = (symptom × severity)   cols = direction (L/F/R)
// Each cell shows count + areaRatio% with intensity proportional to that ratio.
export default function SeverityMatrix({ faces }: Props) {
  const grid = useMemo(() => {
    type Cell = { counts: number; area: number; areaRatio: number } | null;
    type Row = { symptom: string; level: number; cells: Record<-1 | 0 | 1, Cell> };
    const map = new Map<string, Row>();
    for (const face of faces) {
      for (const d of face.diagnosisSkinDetailList) {
        const key = `${d.symptom}|${d.degreeLevel}`;
        let row = map.get(key);
        if (!row) {
          row = { symptom: d.symptom, level: d.degreeLevel, cells: { [-1]: null, 0: null, 1: null } };
          map.set(key, row);
        }
        row.cells[face.direction] = { counts: d.counts, area: d.area, areaRatio: d.areaRatio };
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.symptom !== b.symptom) return a.symptom.localeCompare(b.symptom);
      return a.level - b.level;
    });
  }, [faces]);

  // Find global max ratio per symptom to scale colour intensity per row group.
  const maxBySymptom = new Map<string, number>();
  for (const row of grid) {
    for (const k of [-1, 0, 1] as const) {
      const c = row.cells[k];
      if (!c) continue;
      const cur = maxBySymptom.get(row.symptom) ?? 0;
      if (c.areaRatio > cur) maxBySymptom.set(row.symptom, c.areaRatio);
    }
  }

  const symptoms = [...new Set(grid.map((r) => r.symptom))];

  return (
    <div className="panel p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-[var(--ink)]">Severity matrix</h3>
        <span className="text-[10px] text-[var(--faint)]">cell = count · area-ratio % of face · colour scaled per symptom row-group</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-[var(--faint)] uppercase">
              <th className="text-left font-normal py-1 pr-2">Symptom</th>
              <th className="text-left font-normal py-1 pr-2">Severity</th>
              <th className="text-right font-normal py-1 px-2">Left</th>
              <th className="text-right font-normal py-1 px-2">Front</th>
              <th className="text-right font-normal py-1 px-2">Right</th>
              <th className="text-right font-normal py-1 pl-2">Total counts</th>
            </tr>
          </thead>
          <tbody>
            {symptoms.map((sym) => {
              const rows = grid.filter((g) => g.symptom === sym);
              const isWrinkle = WRINKLE_SYMPTOMS.has(sym);
              const symMax = maxBySymptom.get(sym) ?? 0.001;
              return (
                <Fragment key={sym}>
                  <tr className="text-[var(--teal)]/90">
                    <td colSpan={6} className="pt-3 pb-1 text-[11px] font-medium">
                      {sym} — {SYMPTOM_LABEL[sym] ?? "Unknown"}
                    </td>
                  </tr>
                  {rows.map((r) => {
                    const total = ([-1, 0, 1] as const).reduce<number>((acc, d) => acc + (r.cells[d]?.counts ?? 0), 0);
                    const labels = isWrinkle ? DEGREE_LABEL_WRINKLE : DEGREE_LABEL_DEFAULT;
                    return (
                      <tr key={`${sym}-${r.level}`} className="border-t border-white/5">
                        <td className="py-0.5 pr-2 text-[var(--faint)]">└</td>
                        <td className="py-0.5 pr-2 text-[var(--ink-2)]">
                          <span className="kbd mr-1">{r.level}</span>
                          {labels[r.level] ?? `Level ${r.level}`}
                        </td>
                        {([-1, 0, 1] as const).map((d) => {
                          const c = r.cells[d];
                          if (!c || c.counts === 0) {
                            return <td key={d} className="py-0.5 px-2 text-right text-[var(--faint)]">—</td>;
                          }
                          const intensity = Math.min(1, c.areaRatio / symMax);
                          return (
                            <td key={d} className="py-0.5 px-2 text-right">
                              <div className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded"
                                style={{ background: `rgba(34,211,238,${0.05 + intensity * 0.45})` }}
                                title={`area=${c.area.toFixed(0)}px²  ratio=${(c.areaRatio * 100).toFixed(2)}%`}
                              >
                                <span className="font-mono text-[11px] text-[var(--ink)]">{c.counts}</span>
                                <span className="font-mono text-[10px] text-[var(--muted)]">{(c.areaRatio * 100).toFixed(1)}%</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-0.5 pl-2 text-right font-mono text-[var(--muted)]">{total}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
