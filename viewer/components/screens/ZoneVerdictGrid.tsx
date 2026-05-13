"use client";

import { MockBadge, t } from "@/components/ds";
import { useSubstrateVerdicts, useZonePolygons } from "@/lib/clinical";
import { SUBSTRATE_LABEL } from "@/lib/clinical/substrate";
import { ZONE_LABEL } from "@/lib/clinical/zonePolygons";
import type { AsymmetryFinding, AsymmetryLevel, Confidence, Readiness, Substrate, ZoneKey, ZoneVerdict } from "@/lib/clinical/types";
import type { DiagnosisSkin } from "@/lib/types";
import { numField } from "@/lib/util";

const SUBSTRATE_TONE: Record<Substrate, { fg: string; bg: string }> = {
  melanin_lentigo: { fg: t.amber, bg: t.amberSoft },
  melanin_melasma: { fg: t.amber, bg: t.amberSoft },
  melanin_pih: { fg: t.amber, bg: t.amberSoft },
  hemosiderin: { fg: t.clay, bg: t.claySoft },
  telangiectasia: { fg: t.rose, bg: t.roseSoft },
  mixed: { fg: t.rose, bg: t.roseSoft },
  inflammation: { fg: t.rose, bg: t.roseSoft },
  hypopigmentation: { fg: t.muted, bg: t.surfaceAlt },
  structural_shadow: { fg: t.muted, bg: t.surfaceAlt },
  unclear: { fg: t.muted, bg: t.surfaceAlt },
  clear: { fg: t.sage, bg: t.sageSoft },
  no_data: { fg: t.faint, bg: t.surfaceAlt },
  occluded: { fg: t.faint, bg: t.surfaceAlt },
};

const CONF_DOT: Record<Confidence, string> = {
  high: t.sage,
  moderate: t.amber,
  low: t.rose,
};

const READY_LABEL: Record<Readiness, string> = {
  proceed: "Proceed",
  "dermatoscopy-first": "Dermatoscopy first",
  "labs-first": "Labs first",
  "not-applicable": "Not applicable",
};

export function ZoneVerdictGrid({
  face,
  direction,
  skinType,
}: {
  face?: DiagnosisSkin;
  direction: -1 | 0 | 1;
  skinType?: number;
}) {
  const { polygons, fromLandmarks } = useZonePolygons(face, direction);
  const { loading, verdicts, findings, refs, error } = useSubstrateVerdicts(face, direction, skinType, polygons);
  const list = Object.values(verdicts).filter((v): v is ZoneVerdict => !!v);

  return (
    <section className="pt-8">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div
            className="uppercase font-medium"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Per-zone substrate verdicts ·{" "}
            {direction === 0 ? "front capture" : direction === -1 ? "left capture" : "right capture"}
          </div>
          <div
            style={{ fontSize: 13.5, color: t.ink2, marginTop: 4, maxWidth: 720 }}
          >
            Rule-based heuristic over channel means inside each anatomical zone.
            Front capture drives the verdict; L/R captures contribute hemiface
            asymmetry only. Algorithm informs — never gates procedure go/no-go.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fromLandmarks && (
            <span
              className="font-mono-fine uppercase"
              style={{ fontSize: 9.5, letterSpacing: "0.08em", color: t.sage, background: t.sageSoft, borderRadius: 3, padding: "2px 6px" }}
            >
              landmark zones
            </span>
          )}
          <MockBadge>Heuristic · unvalidated cohort</MockBadge>
        </div>
      </div>

      {refs && (
        <div
          className="font-mono-fine"
          style={{ fontSize: 10.5, color: t.faint, marginBottom: 8 }}
        >
          refs · brownBaseline{" "}
          {refs.brownBaseline?.toFixed(2) ?? "—"} · deepRedBaseline{" "}
          {refs.deepRedBaseline?.toFixed(2) ?? "—"}
          {refs.referenceDirty && (
            <span style={{ color: t.clay, marginLeft: 8 }}>
              · reference dirty → absolute thresholds
            </span>
          )}
          {refs.skinType != null && (
            <span style={{ marginLeft: 8 }}>· Fitz {refs.skinType}</span>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: t.rose, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {loading && list.length === 0 && (
        <div
          className="font-mono-fine"
          style={{ fontSize: 12, color: t.muted, padding: "20px 0" }}
        >
          Sampling channels…
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {list.map((v) => (
          <ZoneCard key={v.zone} v={v} />
        ))}
      </div>
    </section>
  );
}

function ZoneCard({ v }: { v: ZoneVerdict }) {
  const tone = SUBSTRATE_TONE[v.substrate];
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.hairline}`,
        borderRadius: 6,
        padding: "14px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="uppercase font-medium"
          style={{ fontSize: 10, letterSpacing: "0.1em", color: t.muted }}
        >
          {ZONE_LABEL[v.zone as ZoneKey]}
        </span>
        <span
          className="font-mono-fine inline-flex items-center gap-1"
          style={{ fontSize: 10, color: t.muted }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: CONF_DOT[v.confidence],
              display: "inline-block",
            }}
          />
          {v.confidence} · {v.evidence}/4
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono-fine uppercase"
          style={{
            padding: "3px 8px",
            borderRadius: 3,
            background: tone.bg,
            color: tone.fg,
            fontSize: 10,
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {SUBSTRATE_LABEL[v.substrate]}
        </span>
      </div>
      <div style={{ fontSize: 12, color: t.ink2, lineHeight: 1.45 }}>
        {v.rationale}
      </div>
      <div
        className="flex items-baseline justify-between"
        style={{ borderTop: `1px dashed ${t.hairline2}`, paddingTop: 8, marginTop: 2 }}
      >
        <span
          className="uppercase font-mono-fine"
          style={{ fontSize: 9.5, letterSpacing: "0.08em", color: t.muted }}
        >
          {READY_LABEL[v.readiness]}
        </span>
        {v.treatmentHint && (
          <span style={{ fontSize: 11, color: t.ink2 }}>{v.treatmentHint}</span>
        )}
      </div>
      {v.readinessReason && (
        <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>
          {v.readinessReason}
        </div>
      )}
      {v.samples.length > 0 && (
        <details>
          <summary
            className="font-mono-fine"
            style={{ fontSize: 10.5, color: t.faint, cursor: "pointer" }}
          >
            channel means
          </summary>
          <div
            className="font-mono-fine"
            style={{ fontSize: 10.5, color: t.muted, marginTop: 6, lineHeight: 1.5 }}
          >
            {v.samples.map((s) => (
              <div key={s.channel}>
                {s.channel} · μ {s.mean.toFixed(2)}
                {s.coverage != null && (
                  <> · cov {(s.coverage * 100).toFixed(0)}%</>
                )}
              </div>
            ))}
            {v.failed.length > 0 && (
              <div style={{ color: t.faint, marginTop: 4 }}>
                {v.failed.length} channel(s) failed: {v.failed.map((f) => f.channel).join(", ")}
              </div>
            )}
          </div>
        </details>
      )}
      {v.doNots.length > 0 && (
        <ul
          style={{
            margin: "4px 0 0",
            paddingLeft: 16,
            fontSize: 11,
            color: t.ink2,
            lineHeight: 1.45,
          }}
        >
          {v.doNots.slice(0, 2).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Helper: read Fitzpatrick from the diagnosis (algorithm-derived front-face preferred). */
export function fitzpatrickFromFace(face?: DiagnosisSkin): number | undefined {
  if (!face) return undefined;
  const v = numField(face, "skinType");
  return v > 0 ? v : undefined;
}
