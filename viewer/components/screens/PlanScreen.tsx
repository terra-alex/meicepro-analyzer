"use client";

import { MockBadge, PillBtn, t } from "@/components/ds";

type PhaseState = "done" | "progress" | "pending";

const PHASE_A: { task: string; sub: string; check: boolean; optional?: boolean }[] = [
  { task: "HFE genotype + fasted iron repeat", sub: "baseline workup", check: true },
  { task: "Vit D3 5,000 IU + K2 daily", sub: "retest at 12 weeks", check: true },
  { task: "Tretinoin 0.025% nightly", sub: "topical · whole face", check: false },
  { task: "Vit K periorbital · SPF 50+ daily", sub: "AM routine", check: false },
  { task: "Polynucleotide under-eye · 3 sessions", sub: "optional", check: false, optional: true },
];

const PHASE_B: {
  zone: string;
  modality: string;
  spec: string;
  gated: boolean;
  gateNote?: string;
}[] = [
  { zone: "Forehead", modality: "IPL", spec: "515–600 nm", gated: false },
  { zone: "Nose", modality: "IPL", spec: "+ topical retinoid · optional PDT", gated: false },
  { zone: "Left cheek", modality: "IPL", spec: "515–600 nm", gated: false },
  {
    zone: "R-cheek upper-medial",
    modality: "Dermatoscopy first",
    spec: "then triple-combo OR Nd:YAG",
    gated: true,
    gateNote: "4-channel concurrence flag",
  },
  {
    zone: "Periorbital",
    modality: "Q-switched / pico Nd:YAG",
    spec: "1064 nm",
    gated: true,
    gateNote: "iron index < 0.45",
  },
];

const PHASE_C: { task: string; sub: string }[] = [
  { task: "Meicepro re-scan every 3–4 months", sub: "same device, same direction sequence" },
  { task: "Quarterly TSat + ferritin", sub: "until iron normalised, then annual" },
  { task: "Outcome log per procedure session", sub: "settings · day 0 / 3 / 7 / 30" },
  { task: "ROI sparkline review at each scan", sub: "periorbital iron index" },
];

const DO_NOTS: { dont: string; why: string }[] = [
  { dont: "No IPL periorbital", why: "oxy-Hb absent · iron pigment lives deeper than IPL reach" },
  {
    dont: "No hydroquinone periorbital",
    why: "substrate is not melanin · skin-thinning risk for no gain",
  },
  { dont: "No HA filler", why: "no volume loss to fill · masks the stain, doesn't treat it" },
];

function PhaseStatus({ state }: { state: PhaseState }) {
  const map: Record<PhaseState, { fg: string; bg: string; label: string }> = {
    done: { fg: t.sage, bg: t.sageSoft, label: "DONE" },
    progress: { fg: t.amber, bg: t.amberSoft, label: "IN PROGRESS" },
    pending: { fg: t.muted, bg: t.surfaceAlt, label: "PENDING" },
  };
  const m = map[state];
  return (
    <span
      className="font-mono-fine inline-flex items-center gap-1.5"
      style={{
        padding: "3px 9px",
        borderRadius: 3,
        fontSize: 9.5,
        letterSpacing: "0.08em",
        color: m.fg,
        background: m.bg,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 3, background: m.fg }} />
      {m.label}
    </span>
  );
}

function CheckBox({ checked, optional }: { checked: boolean; optional?: boolean }) {
  if (optional) {
    return (
      <div
        className="grid place-items-center"
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.2px dashed ${t.faint}`,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: 3, background: t.faint }} />
      </div>
    );
  }
  return (
    <div
      className="grid place-items-center"
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1.2px solid ${checked ? t.sage : t.hairline}`,
        background: checked ? t.sageSoft : t.surface,
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path
            d="M2 5.5 L4.2 7.7 L8 3"
            stroke={t.sage}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export function PlanScreen() {
  return (
    <main className="px-7 pb-12">
      {/* Title block */}
      <section className="pt-8 pb-4 max-w-[1100px]">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="uppercase font-medium"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.18em",
              color: t.clay,
            }}
          >
            Treatment plan
          </div>
          <MockBadge>Template · derived from this scan&apos;s findings</MockBadge>
        </div>
        <h1
          className="font-serif-display"
          style={{
            fontSize: 48,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: t.ink,
            margin: 0,
            maxWidth: 880,
          }}
        >
          Three phases — systemic prep, procedures, monitoring.
        </h1>
        <p
          className="mt-3"
          style={{
            fontSize: 14,
            color: t.muted,
            maxWidth: 820,
            lineHeight: 1.55,
          }}
        >
          Built from this scan&apos;s substrate verdicts and the patient&apos;s
          bloodwork. Each step references the imaging evidence that suggested it;
          procedures are gated on systemic prep where iron substrate matters.
        </p>
      </section>

      {/* Phase A */}
      <section className="pt-6">
        <PhaseHeader
          letter="A"
          title="Systemic prep"
          subtitle="1–3 months · no procedures"
          status="progress"
          note="Two items done. Topicals to start now; PN optional."
        />
        <ul
          className="grid gap-2.5 mt-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {PHASE_A.map((step) => (
            <li
              key={step.task}
              className="flex gap-3 items-start"
              style={{
                padding: "14px 16px",
                background: t.surface,
                border: `1px solid ${t.hairline}`,
                borderRadius: 6,
              }}
            >
              <CheckBox checked={step.check} optional={step.optional} />
              <div className="min-w-0 flex-1">
                <div
                  className="flex items-baseline justify-between gap-2"
                  style={{ fontSize: 13, color: t.ink }}
                >
                  <span style={{ fontWeight: 500 }}>{step.task}</span>
                  {step.optional && (
                    <span
                      className="font-mono-fine"
                      style={{ fontSize: 9.5, color: t.faint, letterSpacing: "0.06em" }}
                    >
                      OPT
                    </span>
                  )}
                </div>
                <div className="mt-0.5" style={{ fontSize: 11.5, color: t.muted }}>
                  {step.sub}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Phase B — per-zone treatment matrix */}
      <section className="pt-10">
        <PhaseHeader
          letter="B"
          title="Procedures"
          subtitle="after Phase A workup completes"
          status="pending"
          note="Per-zone modality. Two zones are gated on prior steps."
        />
        <div
          className="mt-4"
          style={{
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {PHASE_B.map((row, i) => (
            <div
              key={row.zone}
              className="grid items-center gap-4 px-4 py-3.5"
              style={{
                gridTemplateColumns: "minmax(170px, 1.1fr) minmax(190px, 1.2fr) minmax(220px, 1.6fr) auto",
                borderTop: i === 0 ? "none" : `1px solid ${t.hairline2}`,
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: t.ink, fontWeight: 500 }}>
                  {row.zone}
                </div>
              </div>
              <div>
                <div
                  className="font-mono-fine uppercase"
                  style={{
                    fontSize: 10.5,
                    color: t.muted,
                    letterSpacing: "0.08em",
                  }}
                >
                  Modality
                </div>
                <div style={{ fontSize: 13, color: t.ink, marginTop: 2 }}>
                  {row.modality}
                </div>
              </div>
              <div>
                <div
                  className="font-mono-fine uppercase"
                  style={{
                    fontSize: 10.5,
                    color: t.muted,
                    letterSpacing: "0.08em",
                  }}
                >
                  Settings · notes
                </div>
                <div
                  style={{ fontSize: 12.5, color: t.ink2, marginTop: 2, lineHeight: 1.4 }}
                >
                  {row.spec}
                </div>
              </div>
              <div>
                {row.gated ? (
                  <div
                    className="font-mono-fine inline-flex items-center gap-1.5"
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: t.claySoft,
                      color: t.clay,
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      border: `1px solid color-mix(in oklch, ${t.clay} 25%, transparent)`,
                    }}
                    title={row.gateNote}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                      <rect
                        x="1"
                        y="3"
                        width="6"
                        height="4"
                        rx="0.6"
                        stroke={t.clay}
                        strokeWidth="1"
                        fill="none"
                      />
                      <path
                        d="M2.5 3 V2 a1.5 1.5 0 1 1 3 0 V3"
                        stroke={t.clay}
                        strokeWidth="1"
                        fill="none"
                      />
                    </svg>
                    GATED · {row.gateNote}
                  </div>
                ) : (
                  <span
                    className="font-mono-fine"
                    style={{
                      fontSize: 10,
                      color: t.sage,
                      letterSpacing: "0.06em",
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: t.sageSoft,
                    }}
                  >
                    READY
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Do-nots — warm copper */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {DO_NOTS.map((d) => (
            <div
              key={d.dont}
              style={{
                background: t.claySoft,
                border: `1px solid color-mix(in oklch, ${t.clay} 20%, transparent)`,
                borderRadius: 6,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: t.clay,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {d.dont}
              </div>
              <div
                style={{ fontSize: 11.5, color: t.ink2, marginTop: 4, lineHeight: 1.5 }}
              >
                {d.why}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Phase C */}
      <section className="pt-10">
        <PhaseHeader
          letter="C"
          title="Monitoring"
          subtitle="ongoing"
          status="pending"
          note="Cadence that closes the loop between dermal stain and systemic iron."
        />
        <ul
          className="grid gap-2.5 mt-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {PHASE_C.map((step) => (
            <li
              key={step.task}
              style={{
                padding: "14px 16px",
                background: t.surface,
                border: `1px solid ${t.hairline}`,
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 13, color: t.ink, fontWeight: 500 }}>
                {step.task}
              </div>
              <div className="mt-0.5" style={{ fontSize: 11.5, color: t.muted }}>
                {step.sub}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* What to take to the derm */}
      <section className="pt-10 pb-4">
        <div
          style={{
            background: t.surfaceAlt,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            padding: "22px 24px",
          }}
        >
          <div
            className="uppercase font-medium mb-2"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            For your next dermatology consult
          </div>
          <ol
            className="space-y-3"
            style={{ fontSize: 13.5, color: t.ink2, lineHeight: 1.55 }}
          >
            <li>
              <span style={{ color: t.clay, fontWeight: 500 }}>1.</span> Bloodwork
              finding the original recommendation didn&apos;t have — transferrin
              saturation 72%. HFE genotype pending. Defer periorbital laser until
              iron normalised; hemosiderin clearance depends on macrophage
              iron-handling capacity.
            </li>
            <li>
              <span style={{ color: t.clay, fontWeight: 500 }}>2.</span>{" "}
              Multispectral analysis suggests periorbital is dermal hemosiderin from
              historical Valsalva petechiae — not melanin. Q-switched / picosecond
              1064 nm Nd:YAG is more appropriate than IPL for that zone.
            </li>
            <li>
              <span style={{ color: t.clay, fontWeight: 500 }}>3.</span> Comfortable
              proceeding with IPL on forehead, nose and left cheek with Fitz III/IV
              conservative settings — but request dermatoscopy of the right-malar
              cluster first; 4-channel concurrence flag minimises PIH / melasma
              worsening risk.
            </li>
          </ol>
          <div
            className="flex gap-2 mt-5 pt-4"
            style={{ borderTop: `1px dashed ${t.hairline}` }}
          >
            <PillBtn primary sm>
              Export PDF
            </PillBtn>
            <PillBtn sm>Email to clinician</PillBtn>
            <PillBtn sm>Copy talking points</PillBtn>
          </div>
        </div>
      </section>

      <p
        className="mt-2 max-w-[820px]"
        style={{ fontSize: 11, color: t.faint, lineHeight: 1.5 }}
      >
        This is evidence-summarised guidance from the scan and bloodwork in this
        report. Review with a qualified clinician before acting. Not a medical
        device, not a diagnosis.
      </p>
    </main>
  );
}

function PhaseHeader({
  letter,
  title,
  subtitle,
  status,
  note,
}: {
  letter: string;
  title: string;
  subtitle: string;
  status: PhaseState;
  note: string;
}) {
  return (
    <header className="flex items-end gap-5 flex-wrap">
      <div className="flex items-end gap-4">
        <div
          className="grid place-items-center font-serif-display"
          style={{
            width: 56,
            height: 56,
            borderRadius: 6,
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            fontSize: 36,
            color: t.ink,
            lineHeight: 1,
          }}
        >
          {letter}
        </div>
        <div>
          <div
            className="uppercase font-medium"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Phase {letter}
          </div>
          <div
            className="font-serif-display"
            style={{ fontSize: 26, color: t.ink, lineHeight: 1.1, marginTop: 2 }}
          >
            {title}
          </div>
          <div
            className="font-mono-fine mt-1"
            style={{ fontSize: 11.5, color: t.muted }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <PhaseStatus state={status} />
      </div>
      <div
        className="basis-full"
        style={{ fontSize: 12.5, color: t.muted, marginTop: 6 }}
      >
        {note}
      </div>
    </header>
  );
}
