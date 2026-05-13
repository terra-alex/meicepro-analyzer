"use client";

import { FacePlate, PillBtn, t } from "@/components/ds";

type Heat = "hot" | "warm" | "cold" | "branching";

const HEAT: Record<Heat, { fg: string; bg: string; label: string }> = {
  hot: { fg: t.rose, bg: t.roseSoft, label: "HOT" },
  warm: { fg: t.amber, bg: t.amberSoft, label: "WARM" },
  cold: { fg: t.teal, bg: t.tealSoft, label: "COLD" },
  branching: { fg: t.clay, bg: t.claySoft, label: "BRANCHING" },
};

type Channel = {
  key: "deepRed" | "brownmap" | "bloodmap" | "undereyeMask";
  faceKind: "deepRed" | "brownmap" | "bloodmap" | "uv";
  name: string;
  group: string;
  mean: number;
  prev: number;
  heat: Heat;
  explain: string;
  pattern: "diffuse" | "diffuse-light" | "sparse" | "branching";
};

const CHANNELS: Channel[] = [
  {
    key: "deepRed",
    faceKind: "deepRed",
    name: "deepRedMap",
    group: "Vascular · deep",
    mean: 0.72,
    prev: 0.64,
    heat: "hot",
    explain: "Concentrated dermal heme signal.",
    pattern: "diffuse",
  },
  {
    key: "brownmap",
    faceKind: "brownmap",
    name: "brownMap",
    group: "Pigment · epidermal",
    mean: 0.31,
    prev: 0.33,
    heat: "warm",
    explain: "Melanin baseline — not the substrate.",
    pattern: "diffuse-light",
  },
  {
    key: "bloodmap",
    faceKind: "bloodmap",
    name: "bloodmap",
    group: "Vascular · surface",
    mean: 0.18,
    prev: 0.21,
    heat: "cold",
    explain: "Surface oxy-Hb absent here.",
    pattern: "sparse",
  },
  {
    key: "undereyeMask",
    faceKind: "uv",
    name: "undereye mask",
    group: "Algorithm · detection",
    mean: 0.46,
    prev: 0.51,
    heat: "branching",
    explain: "Branching streaks, not punctate dots.",
    pattern: "branching",
  },
];

function PatternOverlay({ pattern }: { pattern: Channel["pattern"] }) {
  // Tasteful pattern marks layered over the face plate to communicate
  // texture without faking imagery. White-on-darkplate, low opacity.
  if (pattern === "diffuse") {
    return (
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 230"
        preserveAspectRatio="none"
        aria-hidden
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const x = 60 + (i * 47) % 280;
          const y = 60 + (i * 31) % 110;
          return (
            <circle key={i} cx={x} cy={y} r={2.4} fill="rgba(255,200,200,0.55)" />
          );
        })}
      </svg>
    );
  }
  if (pattern === "diffuse-light") {
    return (
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 230"
        preserveAspectRatio="none"
        aria-hidden
      >
        {Array.from({ length: 28 }).map((_, i) => {
          const x = 70 + (i * 71) % 260;
          const y = 60 + (i * 41) % 110;
          return (
            <circle key={i} cx={x} cy={y} r={1.4} fill="rgba(255,210,160,0.45)" />
          );
        })}
      </svg>
    );
  }
  if (pattern === "sparse") {
    return (
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 230"
        preserveAspectRatio="none"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const x = 80 + (i * 43) % 240;
          const y = 80 + (i * 53) % 80;
          return (
            <circle key={i} cx={x} cy={y} r={1.6} fill="rgba(180,220,255,0.55)" />
          );
        })}
      </svg>
    );
  }
  // branching
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 230"
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const baseX = 110 + (i * 19) % 180;
        const baseY = 110 + (i * 13) % 30;
        return (
          <g key={i} stroke="rgba(220,180,140,0.6)" strokeWidth="1" fill="none">
            <path
              d={`M${baseX} ${baseY} q${4 + (i % 3) * 2} ${-4 - (i % 2) * 3} ${10 + (i % 4) * 2} ${
                -8 - (i % 3) * 2
              }`}
            />
            <path
              d={`M${baseX} ${baseY} q${-3 - (i % 2) * 2} ${5 + (i % 3)} ${
                -9 - (i % 4)
              } ${10 + (i % 2) * 2}`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function SubstrateScreen() {
  return (
    <main className="px-7 pb-12">
      {/* Focus header */}
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
            Substrate inspector · Front face
          </div>
          <h2
            className="font-serif-display"
            style={{ fontSize: 36, lineHeight: 1.05, color: t.ink, margin: 0 }}
          >
            Periorbital region
            <span
              style={{
                color: t.muted,
                marginLeft: 14,
                fontSize: 22,
                fontStyle: "italic",
              }}
            >
              both eyes
            </span>
          </h2>
          <div
            className="mt-2.5 flex gap-3.5 items-center flex-wrap"
            style={{ fontSize: 12, color: t.muted }}
          >
            <span>ROI 248 × 96 px · 4.2% of face area</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: t.faint }} />
            <span className="font-mono-fine">roi=p0,38,42,62,52</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: t.faint }} />
            <button
              type="button"
              className="cursor-pointer"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: t.teal,
                fontSize: 12,
                fontFamily: "inherit",
                borderBottom: `1px dotted ${t.teal}`,
              }}
            >
              Redraw region
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <PillBtn sm>Track over time</PillBtn>
          <PillBtn sm>Save note</PillBtn>
          <PillBtn primary sm>
            Add to advice
          </PillBtn>
        </div>
      </section>

      {/* 4 channels side-by-side */}
      <section className="pt-6">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {CHANNELS.map((c) => {
            const delta = c.mean - c.prev;
            const trend = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
            const hs = HEAT[c.heat];
            return (
              <div
                key={c.key}
                className="flex flex-col"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.hairline}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <FacePlate
                  kind={c.faceKind}
                  label={c.name}
                  sub={c.group}
                  style={{ height: 230, margin: 12, marginBottom: 0 }}
                >
                  <PatternOverlay pattern={c.pattern} />
                  {/* ROI bracket — same crescent on every panel */}
                  <div
                    style={{
                      position: "absolute",
                      left: "18%",
                      top: "42%",
                      width: "64%",
                      height: "22%",
                      border: "1.5px solid #fff",
                      borderRadius: 100,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                      zIndex: 2,
                    }}
                  />
                </FacePlate>

                <div className="px-3.5 pt-3 pb-3.5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono-fine uppercase"
                      style={{
                        padding: "3px 8px",
                        borderRadius: 3,
                        background: hs.bg,
                        color: hs.fg,
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                      }}
                    >
                      {hs.label}
                    </span>
                    <span
                      className="font-mono-fine"
                      style={{ fontSize: 11, color: t.faint }}
                    >
                      μ {c.mean.toFixed(2)} <span style={{ color: t.muted }}>{trend} {Math.abs(delta).toFixed(2)}</span>
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
                    {c.explain}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interpretive callout */}
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
            Deep-red signal dominates over brown · bloodmap is cold · undereye
            shows branching streaks not punctate dots → likely{" "}
            <span style={{ color: t.clay }}>dermal hemosiderin</span>, not
            melanin and not active telangiectasia.
          </p>

          <div
            className="grid mt-6 gap-4"
            style={{ gridTemplateColumns: "1.5fr 1fr" }}
          >
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
                style={{
                  fontSize: 12.5,
                  color: t.ink2,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ color: t.muted, fontSize: 10.5 }}>
                    <th
                      align="left"
                      className="font-mono-fine uppercase pb-2"
                      style={{ letterSpacing: "0.08em", fontWeight: 500 }}
                    >
                      Signal
                    </th>
                    <th
                      align="left"
                      className="font-mono-fine uppercase pb-2"
                      style={{ letterSpacing: "0.08em", fontWeight: 500 }}
                    >
                      Read
                    </th>
                    <th
                      align="left"
                      className="font-mono-fine uppercase pb-2"
                      style={{ letterSpacing: "0.08em", fontWeight: 500 }}
                    >
                      Verdict
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      sig: "deepRedMap > brownMap",
                      read: "vascular/iron > melanin",
                      verdict: "Substrate is iron-pigment",
                    },
                    {
                      sig: "bloodmap cold",
                      read: "no active flow",
                      verdict: "Not telangiectasia",
                    },
                    {
                      sig: "undereye streaks",
                      read: "branching, not punctate",
                      verdict: "Resolved Valsalva residue",
                    },
                    {
                      sig: "brownSpot mask excludes zone",
                      read: "algorithm does not call freckles",
                      verdict: "Not melanin",
                    },
                  ].map((r, i) => (
                    <tr
                      key={i}
                      style={{ borderTop: `1px solid ${t.hairline2}` }}
                    >
                      <td className="py-2.5 pr-3 font-mono-fine">{r.sig}</td>
                      <td className="py-2.5 pr-3">{r.read}</td>
                      <td className="py-2.5" style={{ color: t.ink }}>
                        {r.verdict}
                      </td>
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
                Right tool
              </div>
              <div
                className="font-serif-display mt-1.5"
                style={{ fontSize: 22, color: t.ink, lineHeight: 1.25 }}
              >
                Q-switched / picosecond Nd:YAG{" "}
                <span style={{ color: t.muted }}>1064 nm</span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: t.ink2,
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                Photoacoustic mechanism · targets iron pigment · eyelid-safe with
                internal corneal shields. Not IPL (chromophore window wrong) and
                not hydroquinone (substrate is not melanin).
              </div>
              <div className="mt-3 flex gap-2">
                <PillBtn sm>Add to plan</PillBtn>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
