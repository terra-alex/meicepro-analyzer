"use client";

import { FacePlate, PillBtn, t } from "@/components/ds";
import { SUBSTRATE_LABEL } from "@/lib/clinical/substrate";
import { ZONE_LABEL } from "@/lib/clinical/zonePolygons";
import type {
  ChannelHeat,
  ChannelRead,
  Substrate,
  ZoneKey,
  ZoneVerdict,
} from "@/lib/clinical/types";
import type { DiagnosisSkin } from "@/lib/types";
import { stringField } from "@/lib/util";

const HEAT_STYLE: Record<ChannelHeat, { fg: string; bg: string; label: string }> = {
  hot: { fg: t.rose, bg: t.roseSoft, label: "HOT" },
  warm: { fg: t.amber, bg: t.amberSoft, label: "WARM" },
  cold: { fg: t.teal, bg: t.tealSoft, label: "COLD" },
  branching: { fg: t.clay, bg: t.claySoft, label: "BRANCHING" },
  neutral: { fg: t.muted, bg: t.surfaceAlt, label: "—" },
};

const CHANNEL_IMG: Record<string, { field: keyof DiagnosisSkin; faceKind: "deepRed" | "brownmap" | "bloodmap" | "uv" }> = {
  deepRedMap: { field: "imgDeepRedMap", faceKind: "deepRed" },
  brownMap: { field: "imgBrownmap", faceKind: "brownmap" },
  bloodMap: { field: "imgBloodmap", faceKind: "bloodmap" },
  undereyeMask: { field: "imgUndereyePng", faceKind: "uv" },
};

function proxyUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.includes("example.invalid")) return null;
  return `/api/img?url=${encodeURIComponent(raw)}`;
}

/**
 * Order zones by clinical interest so the panel auto-focuses the most
 * informative verdict on the loaded scan.
 */
const SUBSTRATE_PRIORITY: Substrate[] = [
  "hemosiderin",
  "mixed",
  "telangiectasia",
  "inflammation",
  "melanin_melasma",
  "melanin_pih",
  "melanin_lentigo",
  "hypopigmentation",
  "structural_shadow",
  "unclear",
  "clear",
  "occluded",
  "no_data",
];

function pickFocus(
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>,
  preferred?: ZoneKey,
): ZoneVerdict | null {
  if (preferred && verdicts[preferred]) return verdicts[preferred]!;
  const list = Object.values(verdicts).filter((v): v is ZoneVerdict => !!v);
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const pa = SUBSTRATE_PRIORITY.indexOf(a.substrate);
    const pb = SUBSTRATE_PRIORITY.indexOf(b.substrate);
    if (pa !== pb) return pa - pb;
    // Periorbital ahead of other zones for clinical relevance
    const peri = (z: ZoneKey) => (z === "periorbitalL" || z === "periorbitalR" ? 0 : 1);
    if (peri(a.zone) !== peri(b.zone)) return peri(a.zone) - peri(b.zone);
    return b.evidence - a.evidence;
  });
  return list[0];
}

export function FocusZonePanel({
  face,
  direction,
  verdicts,
  focusZone,
  onFocusZoneChange,
}: {
  face?: DiagnosisSkin;
  direction: -1 | 0 | 1;
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>;
  focusZone?: ZoneKey;
  onFocusZoneChange?: (z: ZoneKey) => void;
}) {
  const v = pickFocus(verdicts, focusZone);

  if (!v) {
    return (
      <section
        className="pt-7"
        style={{ borderBottom: `1px solid ${t.hairline2}` }}
      >
        <div
          className="font-mono-fine"
          style={{ fontSize: 12, color: t.muted, padding: "16px 0 28px" }}
        >
          No verdicts yet — sampling channels…
        </div>
      </section>
    );
  }

  const zoneOptions = Object.values(verdicts)
    .filter((x): x is ZoneVerdict => !!x)
    .sort((a, b) => {
      const pa = SUBSTRATE_PRIORITY.indexOf(a.substrate);
      const pb = SUBSTRATE_PRIORITY.indexOf(b.substrate);
      return pa - pb;
    });

  return (
    <>
      <section
        className="grid items-end gap-6 pt-7 pb-5"
        style={{
          gridTemplateColumns: "1fr auto",
          borderBottom: `1px solid ${t.hairline2}`,
        }}
      >
        <div>
          <div
            className="uppercase font-medium mb-1.5"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Substrate inspector · focus zone · {direction === 0 ? "front" : direction === -1 ? "left" : "right"}
          </div>
          <h2
            className="font-serif-display"
            style={{ fontSize: 36, lineHeight: 1.05, color: t.ink, margin: 0 }}
          >
            {ZONE_LABEL[v.zone]}
            <span
              style={{
                color: t.muted,
                marginLeft: 14,
                fontSize: 22,
                fontStyle: "italic",
              }}
            >
              {SUBSTRATE_LABEL[v.substrate].toLowerCase()}
            </span>
          </h2>
          <div
            className="mt-2.5 flex gap-3 items-center flex-wrap"
            style={{ fontSize: 12, color: t.muted }}
          >
            <span>{v.confidence} confidence · {v.evidence}/4 evidence</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: t.faint }} />
            <span className="font-mono-fine">{v.readiness}</span>
            {v.contextModifiers && v.contextModifiers.length > 0 && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: 2, background: t.faint }} />
                <span className="font-mono-fine" style={{ color: t.sage }}>
                  context · {v.contextModifiers.join(" · ")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap" style={{ maxWidth: 420, justifyContent: "flex-end" }}>
          {zoneOptions.slice(0, 6).map((opt) => {
            const isActive = opt.zone === v.zone;
            return (
              <button
                key={opt.zone}
                type="button"
                onClick={() => onFocusZoneChange?.(opt.zone)}
                className="cursor-pointer transition-colors"
                style={{
                  padding: "5px 10px",
                  border: `1px solid ${isActive ? t.ink : t.hairline}`,
                  background: isActive ? t.ink : t.surface,
                  color: isActive ? t.surface : t.ink2,
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              >
                {ZONE_LABEL[opt.zone].replace("Left cheek · ", "L ·").replace("Right cheek · ", "R ·")}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 channel cards driven by the verdict's channelReads */}
      <section className="pt-6">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {v.channelReads.map((c) => (
            <ChannelCard key={c.channel} read={c} face={face} />
          ))}
        </div>
      </section>

      {/* Interpretation callout — dynamic */}
      <section className="pt-6">
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            padding: "26px 28px",
          }}
        >
          <div
            className="uppercase font-medium mb-2"
            style={{ fontSize: 10.5, letterSpacing: "0.16em", color: t.teal }}
          >
            Interpretation
          </div>
          <p
            className="font-serif-display"
            style={{
              fontSize: 26,
              lineHeight: 1.3,
              color: t.ink,
              margin: 0,
              maxWidth: 1020,
              letterSpacing: "-0.005em",
            }}
          >
            {v.rationale.replace(/Substrate is /i, "")} ·{" "}
            <span style={{ color: t.clay }}>{SUBSTRATE_LABEL[v.substrate].toLowerCase()}</span>.
          </p>
          {v.readinessReason && (
            <p style={{ fontSize: 13, color: t.muted, marginTop: 12, lineHeight: 1.5 }}>
              <span className="uppercase font-mono-fine" style={{ letterSpacing: "0.08em", fontSize: 10.5, color: t.muted, marginRight: 6 }}>
                Readiness · {v.readiness}
              </span>
              {v.readinessReason}
            </p>
          )}

          <div className="grid mt-6 gap-4" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <div>
              <div
                className="font-mono-fine uppercase"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.12em",
                  color: t.muted,
                  marginBottom: 8,
                }}
              >
                Logic table
              </div>
              <table
                className="w-full"
                style={{ fontSize: 12.5, color: t.ink2, borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ color: t.muted, fontSize: 10.5 }}>
                    <th align="left" className="font-mono-fine uppercase pb-2" style={{ letterSpacing: "0.08em", fontWeight: 500 }}>Signal</th>
                    <th align="left" className="font-mono-fine uppercase pb-2" style={{ letterSpacing: "0.08em", fontWeight: 500 }}>Read</th>
                    <th align="left" className="font-mono-fine uppercase pb-2" style={{ letterSpacing: "0.08em", fontWeight: 500 }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {v.decisionTrace.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${t.hairline2}` }}>
                      <td className="py-2.5 pr-3 font-mono-fine" style={{ fontSize: 11.5 }}>{r.signal}</td>
                      <td className="py-2.5 pr-3">{r.read}</td>
                      <td className="py-2.5" style={{ color: t.ink }}>{r.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                background: t.surfaceAlt,
                border: `1px solid ${t.hairline}`,
                borderRadius: 6,
                padding: "16px 18px",
              }}
            >
              <div
                className="uppercase font-medium"
                style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
              >
                {v.treatmentHint ? "Right tool" : "Action"}
              </div>
              <div
                className="font-serif-display mt-1.5"
                style={{ fontSize: 20, color: t.ink, lineHeight: 1.25 }}
              >
                {v.treatmentHint ?? "—"}
              </div>
              {v.doNots.length > 0 && (
                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 16,
                    fontSize: 11.5,
                    color: t.ink2,
                    lineHeight: 1.5,
                  }}
                >
                  {v.doNots.slice(0, 3).map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <PillBtn sm disabled>Add to plan</PillBtn>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ChannelCard({ read, face }: { read: ChannelRead; face?: DiagnosisSkin }) {
  const heat = HEAT_STYLE[read.heat];
  const cfg = CHANNEL_IMG[read.channel];
  const bgImage = face && cfg
    ? proxyUrl(stringField(face, cfg.field as unknown as string))
    : null;
  return (
    <div
      className="flex flex-col"
      style={{
        background: t.surface,
        border: `1px solid ${t.hairline}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <FacePlate
        kind={cfg?.faceKind ?? "daylight"}
        label={read.name}
        sub={read.group}
        bgImage={bgImage}
        style={{ height: 230, margin: 12, marginBottom: 0 }}
      />

      <div className="px-3.5 pt-3 pb-3.5 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span
            className="font-mono-fine uppercase"
            style={{
              padding: "3px 8px",
              borderRadius: 3,
              background: heat.bg,
              color: heat.fg,
              fontSize: 10,
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            {heat.label}
          </span>
          <span
            className="font-mono-fine"
            style={{ fontSize: 11, color: t.faint }}
          >
            μ {read.mean != null ? read.mean.toFixed(2) : "—"}
            {read.coverage != null && (
              <span style={{ color: t.muted }}>
                {" "}· cov {(read.coverage * 100).toFixed(0)}%
              </span>
            )}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: t.ink2,
            lineHeight: 1.45,
            marginTop: 8,
          }}
        >
          {read.explain}
        </div>
      </div>
    </div>
  );
}
