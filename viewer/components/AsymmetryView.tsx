"use client";

import { useMemo } from "react";
import { RADAR_METRICS } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";
import { numField } from "@/lib/util";

interface Props {
  faces: DiagnosisSkin[];
}

// Side-by-side L/R metric deltas. The original H5 never surfaces these — but
// they're often the most useful piece for analysis (asymmetric pigmentation,
// unilateral acne, sun damage, etc.).
export default function AsymmetryView({ faces }: Props) {
  const left = faces.find((f) => f.direction === -1);
  const right = faces.find((f) => f.direction === 1);

  const rows = useMemo(() => {
    if (!left || !right) return [];
    const all = [
      { key: "skinScore", label: "Skin score" },
      { key: "wrinkleScore", label: "Wrinkle score" },
      ...RADAR_METRICS.map((m) => ({ key: m.key, label: m.label })),
    ];
    return all.map((r) => {
      const l = numField(left, r.key) * 100;
      const ri = numField(right, r.key) * 100;
      return { ...r, left: l, right: ri, delta: l - ri };
    });
  }, [left, right]);

  if (!left || !right) {
    return (
      <div className="panel p-4">
        <h3 className="text-sm font-medium text-white/80 mb-2">Left vs Right asymmetry</h3>
        <p className="text-xs text-white/50">Need both side captures to compute deltas.</p>
      </div>
    );
  }

  // Sort by abs delta descending so the most asymmetric metrics are at the top.
  const sorted = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const absMax = Math.max(20, ...sorted.map((r) => Math.abs(r.delta)));

  return (
    <div className="panel p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-white/80">Left vs Right asymmetry</h3>
        <span className="text-[10px] text-white/40">sorted by |Δ|, scores 0..100, higher = better</span>
      </div>
      <div className="space-y-1.5 text-xs">
        {sorted.map((r) => {
          const sign = r.delta > 0 ? "+" : r.delta < 0 ? "−" : "±";
          const w = (Math.abs(r.delta) / absMax) * 50;
          const isLeftBetter = r.delta > 0;
          const accent = Math.abs(r.delta) < 3
            ? "bg-white/25"
            : isLeftBetter
              ? "bg-violet-400/70"
              : "bg-amber-400/70";
          return (
            <div key={r.key} className="grid grid-cols-[110px_56px_1fr_56px_44px] items-center gap-2">
              <span className="text-white/70 truncate" title={r.key}>{r.label}</span>
              <span className="text-right font-mono text-violet-300">{Math.round(r.left)}</span>
              <div className="relative h-2 bg-white/5 rounded-sm">
                {/* center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                <div
                  className={`absolute top-0 bottom-0 ${accent} rounded-sm`}
                  style={{
                    left: isLeftBetter ? `${50 - w}%` : "50%",
                    width: `${w}%`,
                  }}
                />
              </div>
              <span className="text-left font-mono text-amber-300">{Math.round(r.right)}</span>
              <span className={`font-mono text-right text-[10px] ${Math.abs(r.delta) < 3 ? "text-white/40" : isLeftBetter ? "text-violet-300" : "text-amber-300"}`}>
                {sign}{Math.abs(Math.round(r.delta))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/40">
        <span><span className="inline-block w-2 h-2 bg-violet-400/70 rounded-sm mr-1" />Left side better</span>
        <span><span className="inline-block w-2 h-2 bg-amber-400/70 rounded-sm mr-1" />Right side better</span>
      </div>
    </div>
  );
}
