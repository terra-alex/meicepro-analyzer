"use client";

import { useState } from "react";
import { WRINKLE_REGIONS, severityFromAgingIndex, SEVERITY_COLOR } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";
import { nullableNumField } from "@/lib/util";

interface Props {
  face: DiagnosisSkin; // expected to be the front-face entry (direction === 0)
}

// Stylised face SVG with wrinkle aging-index values overlaid in the
// approximate anatomical regions. Mirrors the H5 "Aging Grade" map but
// adds tooltips and severity colouring.
export default function WrinkleFaceMap({ face }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  // Region label → svg coords (normalised to 0..200 viewbox).
  const REGIONS: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
    Forehead:   { cx: 100, cy: 38,  rx: 60, ry: 18 },
    Glabellar:  { cx: 100, cy: 70,  rx: 12, ry: 8 },
    Betweeneye: { cx: 100, cy: 84,  rx: 10, ry: 6 },
    Side:       { cx: 50,  cy: 92,  rx: 15, ry: 14 }, // left crow's feet (mirror to right)
    Undereye:   { cx: 100, cy: 100, rx: 38, ry: 8 },
    Nasofolds:  { cx: 100, cy: 130, rx: 28, ry: 14 },
    Cormouth:   { cx: 100, cy: 158, rx: 28, ry: 8 },
  };

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-medium text-[var(--ink)] mb-2">Aging map (front face)</h3>
      <div className="flex gap-3">
        <svg viewBox="0 0 200 200" className="w-44 h-auto flex-shrink-0">
          {/* face silhouette */}
          <ellipse cx="100" cy="105" rx="60" ry="78" fill="var(--surface-alt)" stroke="var(--hairline)" />
          {/* Eyes */}
          <ellipse cx="76" cy="86" rx="8" ry="3" fill="var(--muted)" />
          <ellipse cx="124" cy="86" rx="8" ry="3" fill="var(--muted)" />
          {/* Nose */}
          <path d="M100 92 L97 118 L103 118 Z" fill="none" stroke="var(--hairline)" />
          {/* Mouth */}
          <path d="M86 152 Q100 158 114 152" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" />

          {WRINKLE_REGIONS.map((r) => {
            const idx = nullableNumField(face, `wrinkle${r.key}AgingIndex`);
            if (idx == null) return null;
            const pos = REGIONS[r.key as keyof typeof REGIONS];
            if (!pos) return null;
            const sev = severityFromAgingIndex(idx);
            const c = SEVERITY_COLOR[sev];
            const fill = sev === "ok" ? "rgba(16,185,129,0.18)"
              : sev === "mild" ? "rgba(132,204,22,0.25)"
              : sev === "moderate" ? "rgba(245,158,11,0.32)"
              : "rgba(244,63,94,0.42)";
            const stroke = sev === "ok" ? "rgba(16,185,129,0.6)"
              : sev === "mild" ? "rgba(132,204,22,0.7)"
              : sev === "moderate" ? "rgba(245,158,11,0.85)"
              : "rgba(244,63,94,0.9)";
            const isHover = hover === r.key;
            return (
              <g key={r.key}
                 onMouseEnter={() => setHover(r.key)}
                 onMouseLeave={() => setHover(null)}
                 style={{ cursor: "pointer" }}
              >
                <ellipse cx={pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry} fill={fill} stroke={stroke} strokeWidth={isHover ? 1.5 : 1} />
                {r.key === "Side" && (
                  <ellipse cx={200 - pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry} fill={fill} stroke={stroke} strokeWidth={isHover ? 1.5 : 1} />
                )}
                <text x={pos.cx} y={pos.cy + 3} textAnchor="middle" fontSize="10" className={`font-mono ${c.fg}`} fill="currentColor">
                  {(idx / 10).toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* legend / table */}
        <div className="flex-1 text-[11px]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1">
            <div className="text-[var(--faint)]">Region</div>
            <div className="text-[var(--faint)] text-right">Idx</div>
            <div className="text-[var(--faint)] text-right">Score</div>
            {WRINKLE_REGIONS.map((r) => {
              const idx = nullableNumField(face, `wrinkle${r.key}AgingIndex`);
              const score = nullableNumField(face, `wrinkle${r.key}Score`);
              const weight = nullableNumField(face, `wrinkle${r.key}Weight`);
              const sev = severityFromAgingIndex(idx);
              const c = SEVERITY_COLOR[sev];
              const isHover = hover === r.key;
              const notApplicable = idx == null;
              const showScore = !notApplicable && score != null && (weight != null || score > 0);
              return (
                <div
                  key={r.key}
                  className={`contents ${isHover ? "[&>*]:bg-[var(--surface-alt)]" : ""}`}
                  onMouseEnter={() => setHover(r.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className={`truncate ${notApplicable ? "text-[var(--faint)]" : ""}`} title={`weight ${weight ?? "—"}`}>{r.label}</div>
                  <div className={`text-right font-mono ${notApplicable ? "text-[var(--faint)]" : c.fg}`}>{idx == null ? "—" : idx}</div>
                  <div className="text-right font-mono text-[var(--muted)]">{showScore && score != null ? Math.round(score * 100) : "—"}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
