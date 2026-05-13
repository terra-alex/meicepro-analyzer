"use client";

import { FacePlate, PillBtn, Spark, t } from "@/components/ds";

type Scan = {
  date: string;
  deepRed: number;
  brown: number;
  blood: number;
  iron: number;
  tsat: number;
};

// Placeholder until the real ROI sampler ships. Real data flows in once the
// lasso math + per-channel intensity sampling is wired into the viewer.
const SCANS: Scan[] = [
  { date: "02 Jan 26", deepRed: 0.78, brown: 0.34, blood: 0.27, iron: 0.51, tsat: 72 },
  { date: "14 Feb 26", deepRed: 0.72, brown: 0.33, blood: 0.27, iron: 0.46, tsat: 63 },
  { date: "21 Mar 26", deepRed: 0.66, brown: 0.32, blood: 0.27, iron: 0.42, tsat: 54 },
  { date: "25 Apr 26", deepRed: 0.59, brown: 0.31, blood: 0.27, iron: 0.38, tsat: 48 },
];

// Crescent-shaped polygon, percent-coords (0..100) of the FacePlate box.
const LASSO: [number, number][] = [
  [20, 47], [25, 43], [32, 41], [40, 40], [48, 41],
  [55, 43], [60, 47], [58, 51], [50, 54], [40, 55],
  [30, 53], [22, 50],
];

export function RoiScreen() {
  const current = SCANS[SCANS.length - 1];
  const earliest = SCANS[0];
  const ironDeltaPct = Math.round(
    ((current.iron - earliest.iron) / earliest.iron) * 100,
  );

  return (
    <main className="px-7 pb-12">
      {/* Title row */}
      <section
        className="flex justify-between items-end gap-6 pt-6 pb-5"
        style={{ borderBottom: `1px solid ${t.hairline2}` }}
      >
        <div>
          <div
            className="uppercase font-medium mb-1.5"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Region of Interest · Periorbital crescent
          </div>
          <h2
            className="font-serif-display"
            style={{ fontSize: 32, lineHeight: 1.05, color: t.ink, margin: 0 }}
          >
            Periorbital iron index
            <span
              className="font-mono-fine"
              style={{
                marginLeft: 14,
                fontSize: 13,
                color: t.muted,
                letterSpacing: "0.02em",
              }}
            >
              v2 · saved 25 Apr
            </span>
          </h2>
        </div>
        <div
          style={{
            padding: "10px 14px",
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
          }}
        >
          <div
            className="uppercase font-medium"
            style={{ fontSize: 10, letterSpacing: "0.12em", color: t.muted }}
          >
            Stub
          </div>
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, maxWidth: 240 }}>
            Lasso math + per-channel sampling not yet wired to live data — values
            below are the design target.
          </div>
        </div>
      </section>

      {/* Drawing canvas + big number stamp */}
      <section className="grid gap-5 pt-6" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        {/* Drawing canvas */}
        <FacePlate
          kind="deepRed"
          label="deepRedMap · periorbital"
          sub={`scan ${current.date}`}
          style={{ height: 460 }}
        >
          {/* Polygon lasso overlay */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polygon
              points={LASSO.map((p) => p.join(",")).join(" ")}
              fill="rgba(255,255,255,0.08)"
              stroke="#fff"
              strokeWidth="0.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {LASSO.map((p, i) => (
              <circle
                key={i}
                cx={p[0]}
                cy={p[1]}
                r="0.5"
                fill="#fff"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.15"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {/* tool palette */}
          <div
            className="absolute"
            style={{
              top: 10,
              right: 10,
              display: "flex",
              gap: 6,
              padding: 4,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(4px)",
              borderRadius: 6,
              zIndex: 3,
            }}
          >
            {["lasso", "rect", "edit"].map((tool) => (
              <button
                key={tool}
                type="button"
                className="font-mono-fine"
                style={{
                  padding: "5px 10px",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tool === "lasso" ? t.ink : "#fff",
                  background: tool === "lasso" ? "#fff" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {tool}
              </button>
            ))}
          </div>
        </FacePlate>

        {/* Number stamp + sparkline */}
        <div
          className="flex flex-col"
          style={{
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            padding: "24px 24px 22px",
          }}
        >
          <div
            className="uppercase font-medium"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Periorbital iron index
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span
              className="font-serif-display"
              style={{ fontSize: 96, color: t.ink, lineHeight: 0.95 }}
            >
              {current.iron.toFixed(2)}
            </span>
            <span
              className="font-mono-fine"
              style={{ fontSize: 13, color: t.faint }}
            >
              /1.00
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="font-mono-fine"
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                color: ironDeltaPct < 0 ? t.sage : t.rose,
                background: ironDeltaPct < 0 ? t.sageSoft : t.roseSoft,
                padding: "3px 8px",
                borderRadius: 3,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {ironDeltaPct}% · 4 months
            </span>
            <span style={{ fontSize: 12, color: t.muted }}>vs first scan</span>
          </div>

          {/* sparkline (0..1 → spark 0..100) */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-1.5">
              <div
                className="uppercase font-mono-fine"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: t.muted,
                }}
              >
                iron index across 4 scans
              </div>
              <div
                className="font-mono-fine"
                style={{ fontSize: 10.5, color: t.faint }}
              >
                lower = better
              </div>
            </div>
            <Spark
              values={SCANS.map((s) => s.iron * 100)}
              w={260}
              h={56}
              color={t.ink2}
              dotColor={t.clay}
              min={20}
              max={70}
            />
            <div className="flex justify-between mt-2">
              {SCANS.map((s) => (
                <span
                  key={s.date}
                  className="font-mono-fine"
                  style={{ fontSize: 10, color: t.faint }}
                >
                  {s.date}
                </span>
              ))}
            </div>
          </div>

          {/* Systemic link */}
          <div
            className="mt-6 pt-5"
            style={{ borderTop: `1px dashed ${t.hairline}` }}
          >
            <div
              className="uppercase font-medium"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Paired with systemic
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>
                TSat {earliest.tsat}% → {current.tsat}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 6, lineHeight: 1.5 }}>
              Iron index −{Math.abs(ironDeltaPct)}% over 4 months · paired with
              TSat coming down. Dermal stain and systemic iron move together —
              that&apos;s the whole point of the feature.
            </div>
          </div>
        </div>
      </section>

      {/* Per-channel mini-cards */}
      <section className="pt-6">
        <div
          className="uppercase font-medium mb-3"
          style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
        >
          Channel means inside the ROI · last scan
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { label: "deepRedMap", values: SCANS.map((s) => s.deepRed * 100), last: current.deepRed },
            { label: "brownMap", values: SCANS.map((s) => s.brown * 100), last: current.brown },
            { label: "bloodmap", values: SCANS.map((s) => s.blood * 100), last: current.blood },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                background: t.surface,
                border: `1px solid ${t.hairline}`,
                borderRadius: 6,
                padding: "14px 16px",
              }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-mono-fine uppercase"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    color: t.muted,
                  }}
                >
                  {row.label}
                </span>
                <span style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>
                  {row.last.toFixed(2)}
                </span>
              </div>
              <div className="mt-2">
                <Spark
                  values={row.values}
                  w={220}
                  h={32}
                  color={t.ink2}
                  dotColor={t.clay}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-2 mt-7">
        <PillBtn primary sm>
          Save ROI
        </PillBtn>
        <PillBtn sm>Share URL with ROI</PillBtn>
        <PillBtn sm>Add to plan as monitoring target</PillBtn>
      </div>
    </main>
  );
}
