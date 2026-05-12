"use client";

import { useMemo, useState } from "react";
import { RADAR_METRICS } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";
import { numField } from "@/lib/util";

const FACE_COLORS = {
  [-1]: { stroke: "#a78bfa", fill: "rgba(167,139,250,0.18)", label: "Left" },
  0:    { stroke: "#22d3ee", fill: "rgba(34,211,238,0.22)", label: "Front" },
  1:    { stroke: "#f59e0b", fill: "rgba(245,158,11,0.18)", label: "Right" },
} as const;

interface Props {
  faces: DiagnosisSkin[]; // up to 3
}

// 7-axis radar with all visible directions overlaid.
// Higher score = better → larger polygon. We invert nothing; the user can read it directly.
export default function RadarChart({ faces }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState<{ label: string; rows: { face: string; v: number; color: string }[] } | null>(null);
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  const axes = RADAR_METRICS;
  const N = axes.length;

  const polygons = useMemo(() => {
    return faces.map((f) => {
      const pts = axes.map((m, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const v = numField(f, m.key);
        const r = Math.max(0, Math.min(1, v)) * radius;
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
      });
      return { face: f, pts };
    });
  }, [faces, axes, N, cx, cy, radius]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  function showTip(metricKey: string, label: string) {
    setHover(metricKey);
    setTip({
      label,
      rows: faces.map((f) => ({
        face: FACE_COLORS[f.direction].label,
        v: Math.round(numField(f, metricKey) * 100),
        color: FACE_COLORS[f.direction].stroke,
      })),
    });
  }

  return (
    <div className="panel p-4 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/80">Skin analysis radar</h3>
        <div className="flex gap-2 text-[11px]">
          {faces.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: FACE_COLORS[f.direction].stroke }} />
              {FACE_COLORS[f.direction].label}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[320px] mx-auto">
        {/* grid */}
        {gridLevels.map((lvl) => {
          const r = lvl * radius;
          const points = axes
            .map((_, i) => {
              const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
              return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
            })
            .join(" ");
          return (
            <polygon
              key={lvl}
              points={points}
              fill="none"
              stroke="rgba(148,196,217,0.12)"
              strokeWidth="1"
            />
          );
        })}
        {/* axes */}
        {axes.map((m, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * radius;
          const lx = cx + Math.cos(a) * (radius + 18);
          const ly = cy + Math.sin(a) * (radius + 18);
          return (
            <g key={m.key}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,196,217,0.1)" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={hover === m.key ? "#a5f3fc" : "rgba(230,240,245,0.7)"}
                onMouseEnter={() => showTip(m.key, m.label)}
                onMouseLeave={() => { setHover(null); setTip(null); }}
                style={{ cursor: "default" }}
              >
                {m.short}
              </text>
              {/* invisible larger hit area */}
              <circle
                cx={lx} cy={ly} r={14}
                fill="transparent"
                onMouseEnter={() => showTip(m.key, m.label)}
                onMouseLeave={() => { setHover(null); setTip(null); }}
              />
            </g>
          );
        })}
        {/* polygons */}
        {polygons.map(({ face, pts }) => {
          const c = FACE_COLORS[face.direction];
          return (
            <g key={face.id}>
              <polygon
                points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth="1.5"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]} cy={p[1]} r={3}
                  fill={c.stroke}
                  onMouseEnter={() => showTip(axes[i].key, axes[i].label)}
                  onMouseLeave={() => { setHover(null); setTip(null); }}
                  style={{ cursor: "default" }}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {tip && (
        <div className="absolute right-4 top-12 panel-2 px-3 py-2 text-xs pointer-events-none z-10">
          <div className="text-white/80 font-medium mb-1">{tip.label}</div>
          {tip.rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span style={{ color: r.color }}>{r.face}</span>
              <span className="font-mono">{r.v}/100</span>
            </div>
          ))}
        </div>
      )}

      {/* legend table */}
      <div className="mt-3 grid grid-cols-1 gap-1 text-[11px]">
        {axes.map((m) => {
          const vals = faces.map((f) => ({
            d: f.direction,
            v: numField(f, m.key),
          }));
          return (
            <div
              key={m.key}
              className={`flex justify-between gap-2 px-2 py-0.5 rounded ${hover === m.key ? "bg-white/5" : ""}`}
              onMouseEnter={() => showTip(m.key, m.label)}
              onMouseLeave={() => { setHover(null); setTip(null); }}
            >
              <span className="text-white/70">{m.label}</span>
              <span className="font-mono flex gap-2">
                {vals.map((v) => (
                  <span key={v.d} style={{ color: FACE_COLORS[v.d as -1 | 0 | 1].stroke }}>
                    {Math.round(v.v * 100)}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
