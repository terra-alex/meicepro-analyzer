"use client";

import { RADAR_METRICS, SEVERITY_COLOR, SEVERITY_LABEL, severityFromScore } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";
import { numField } from "@/lib/util";

interface Props {
  face: DiagnosisSkin;
  // Optional comparison face (the average of the other directions) for delta arrows.
  compareTo?: { score: number; label: string }[];
}

export default function MetricStrip({ face }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <BigMetric
        label="Skin score"
        value={Math.round(face.skinScore * 100)}
        suffix="/100"
        accent="cyan"
        tone={severityFromScore(face.skinScore)}
        sub={`Skin age ${face.skinAge}`}
      />
      <BigMetric
        label="Aging idx"
        value={face.agingIndex < 0 ? "—" : face.agingIndex}
        accent="amber"
        tone={face.agingIndex < 0 ? "ok" : face.agingIndex < 10 ? "mild" : face.agingIndex < 20 ? "moderate" : "severe"}
        sub={face.agingIndex < 0 ? "front face only" : "lower = younger"}
      />
      <BigMetric
        label="Wrinkle score"
        value={Math.round(face.wrinkleScore * 100)}
        suffix="/100"
        accent="violet"
        tone={severityFromScore(face.wrinkleScore)}
      />
      {RADAR_METRICS.map((m) => {
        const val = numField(face, m.key);
        return (
          <Metric
            key={m.key}
            label={m.short}
            full={m.label}
            value={Math.round(val * 100)}
            tone={severityFromScore(val)}
          />
        );
      })}
    </div>
  );
}

function Metric({ label, full, value, tone }: { label: string; full?: string; value: number; tone: keyof typeof SEVERITY_COLOR }) {
  const c = SEVERITY_COLOR[tone];
  return (
    <div className={`panel-2 px-3 py-2 ring-1 ${c.ring}`} title={full}>
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-[var(--muted)]">{label}</span>
        <span className={`text-[10px] ${c.fg}`}>{SEVERITY_LABEL[tone]}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-mono">{value}</span>
        <span className="text-xs text-[var(--faint)]">/100</span>
      </div>
    </div>
  );
}

function BigMetric({
  label,
  value,
  suffix,
  accent,
  tone,
  sub,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  accent: string;
  tone: keyof typeof SEVERITY_COLOR;
  sub?: string;
}) {
  const c = SEVERITY_COLOR[tone];
  return (
    <div className={`panel-2 px-3 py-2 ring-1 ${c.ring}`} data-accent={accent}>
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-[var(--muted)]">{label}</span>
        <span className={`text-[10px] ${c.fg}`}>{SEVERITY_LABEL[tone]}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-mono">{value}</span>
        {suffix ? <span className="text-xs text-[var(--faint)]">{suffix}</span> : null}
      </div>
      {sub ? <div className="text-[10px] text-[var(--faint)] mt-0.5">{sub}</div> : null}
    </div>
  );
}
