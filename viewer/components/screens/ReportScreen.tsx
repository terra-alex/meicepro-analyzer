"use client";

import { useMemo } from "react";
import ImageStack from "@/components/ImageStack";
import RadarChart from "@/components/RadarChart";
import WrinkleFaceMap from "@/components/WrinkleFaceMap";
import AsymmetryView from "@/components/AsymmetryView";
import SeverityMatrix from "@/components/SeverityMatrix";
import AgingMorph from "@/components/AgingMorph";
import { ScoreChip, SectionTitle, t } from "@/components/ds";
import type { ReportPayload, DiagnosisSkin } from "@/lib/types";
import { numField, nullableNumField } from "@/lib/util";

const HERO_KEYS = [
  { key: "skinScore", label: "Skin" },
  { key: "wrinkleScore", label: "Wrinkle" },
] as const;

// Canonical metric field names — must match RADAR_METRICS / sample-report.json
const STRIP_KEYS = [
  { key: "uvspotScore", label: "UV" },
  { key: "brownspotScore", label: "Brown" },
  { key: "redspotScore", label: "Red" },
  { key: "poreScore", label: "Pore" },
  { key: "textureScore", label: "Texture" },
  { key: "surfacespotScore", label: "Surface" },
  { key: "acneScore", label: "Acne" },
] as const;

export function ReportScreen({
  report,
  direction,
  baseField,
  overlays,
  onImageStackChange,
}: {
  report: ReportPayload;
  direction: -1 | 0 | 1;
  baseField: string | undefined;
  overlays: Record<string, { enabled: boolean; opacity: number; blend: "screen" | "multiply" | "normal" }>;
  onImageStackChange: (s: {
    baseField: string | undefined;
    overlays: Record<string, { enabled: boolean; opacity: number; blend: "screen" | "multiply" | "normal" }>;
  }) => void;
}) {
  const faces = useMemo(
    () =>
      [...report.datas.diagnosis.diagnosisSkinList].sort(
        (a, b) => a.direction - b.direction,
      ),
    [report],
  );
  const currentFace = useMemo(
    () => faces.find((f) => f.direction === direction) ?? faces[0],
    [faces, direction],
  );
  const frontFace = useMemo(
    () => faces.find((f) => f.direction === 0) ?? null,
    [faces],
  );

  // The single most meaningful "aging index" the device reports per-face is
  // brownspotAgingIndex; the global skinAge is shown separately in the header.
  const agingIdx = frontFace ? nullableNumField(frontFace, "brownspotAgingIndex") : null;
  const skinAge = frontFace ? nullableNumField(frontFace, "skinAge") : null;

  // hero "look at this first" callout — substrate-aware
  const heroCallout = useMemo(() => computeHeroCallout(faces), [faces]);

  return (
    <main className="px-7 pb-12">
      {/* Hero strip */}
      <section
        className="grid gap-5 pt-6 pb-6"
        style={{ gridTemplateColumns: "1.05fr 1.55fr 0.95fr" }}
      >
        {/* Headline scores — editorial */}
        <div
          className="flex flex-col"
          style={{
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            padding: "22px 24px",
          }}
        >
          <div className="flex justify-between items-baseline">
            <div
              className="uppercase font-medium"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Headline
            </div>
            <div
              className="font-mono-fine"
              style={{ fontSize: 10.5, color: t.faint }}
            >
              front face
            </div>
          </div>
          <div className="flex items-baseline gap-9 mt-3 flex-wrap">
            {HERO_KEYS.map((h) => {
              const v = currentFace ? Math.round(numField(currentFace, h.key) * 100) : null;
              return (
                <div key={h.key}>
                  <div
                    className="font-serif-display"
                    style={{ fontSize: 64, lineHeight: 0.95, color: t.ink }}
                  >
                    {v ?? "—"}
                  </div>
                  <div
                    className="uppercase font-medium mt-1.5"
                    style={{ fontSize: 10.5, letterSpacing: "0.10em", color: t.muted }}
                  >
                    {h.label}
                  </div>
                </div>
              );
            })}
            {agingIdx != null && agingIdx > 0 && (
              <div>
                <div
                  className="font-serif-display"
                  style={{ fontSize: 64, lineHeight: 0.95, color: t.ink }}
                >
                  {agingIdx}
                </div>
                <div
                  className="uppercase font-medium mt-1.5"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.10em",
                    color: t.muted,
                  }}
                >
                  Brown-spot aging
                </div>
              </div>
            )}
            {skinAge != null && skinAge > 0 && (
              <div>
                <div
                  className="font-serif-display"
                  style={{ fontSize: 64, lineHeight: 0.95, color: t.ink }}
                >
                  {Math.round(skinAge)}
                </div>
                <div
                  className="uppercase font-medium mt-1.5"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.10em",
                    color: t.muted,
                  }}
                >
                  Skin age
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Look at this first callout */}
        <div
          style={{
            background: t.surface,
            border: `1px solid color-mix(in oklch, ${t.clay} 18%, ${t.hairline})`,
            borderRadius: 6,
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              className="uppercase font-medium mb-2"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.16em",
                color: t.clay,
              }}
            >
              Look at this first
            </div>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.45,
                color: t.ink,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {heroCallout.title}
            </div>
          </div>
          <div
            className="mt-3"
            style={{ fontSize: 12.5, color: t.ink2, lineHeight: 1.55 }}
          >
            {heroCallout.body}
          </div>
        </div>

        {/* Direction quick switcher (live data) */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.hairline}`,
            borderRadius: 6,
            padding: "18px 20px",
          }}
        >
          <div
            className="uppercase font-medium mb-3"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            By direction
          </div>
          <div className="grid gap-2.5">
            {[
              { dir: -1 as const, label: "Left" },
              { dir: 0 as const, label: "Front" },
              { dir: 1 as const, label: "Right" },
            ].map(({ dir, label }) => {
              const face = faces.find((f) => f.direction === dir);
              const v = face ? Math.round(numField(face, "skinScore") * 100) : null;
              const active = dir === direction;
              return (
                <div
                  key={dir}
                  className="flex items-baseline justify-between"
                  style={{ borderBottom: `1px solid ${t.hairline2}`, paddingBottom: 8 }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: active ? t.ink : t.ink2,
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-serif-display"
                    style={{
                      fontSize: 22,
                      color: active ? t.ink : t.muted,
                    }}
                  >
                    {v ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7-up secondary score strip (demoted) */}
      <section className="pb-5">
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {STRIP_KEYS.map((s) => {
            const raw = currentFace ? nullableNumField(currentFace, s.key) : null;
            const v = raw != null ? Math.round(raw * 100) : null;
            return <ScoreChip key={s.key} label={s.label} value={v} />;
          })}
        </div>
      </section>

      {/* Main analysis split */}
      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(380px, 1fr)" }}
      >
        <ImageStack
          key={currentFace.id}
          face={currentFace}
          initialBase={baseField}
          initialOverlays={overlays}
          onChange={onImageStackChange}
        />
        <div className="space-y-4">
          <RadarChart faces={faces} />
          {frontFace && <WrinkleFaceMap face={frontFace} />}
          <AsymmetryView faces={faces} />
        </div>
      </section>

      {frontFace &&
        frontFace.jsonAging &&
        frontFace.imgDaylight &&
        !frontFace.jsonAging.includes("example.invalid") && (
          <section className="mt-5">
            <SectionTitle kicker="Predicted" title="Aging morph" />
            <AgingMorph face={frontFace} />
          </section>
        )}

      <section className="mt-5">
        <SectionTitle kicker="Per direction × severity" title="Symptom severity matrix" />
        <SeverityMatrix faces={faces} />
      </section>
    </main>
  );
}

function computeHeroCallout(faces: DiagnosisSkin[]) {
  // Lightweight heuristic for the "look at this first" line. Future work:
  // wire to substrate-callout logic in lib/.
  const front = faces.find((f) => f.direction === 0);
  if (!front)
    return {
      title: "Open a scan to see the headline finding.",
      body: "The viewer surfaces a single most-actionable finding here once a report is loaded.",
    };
  const red = numField(front, "redScore");
  const brown = numField(front, "brownScore");
  if (red < 0.7 && brown < 0.75) {
    return {
      title:
        "Asymmetric red & brown signal — start with the substrate inspector for the periorbital region.",
      body: "deepRedMap and brownMap both flag the same anatomy on the front face; substrate inspector decomposes whether the dominant signal is melanin, hemosiderin, or active vasculature.",
    };
  }
  return {
    title: "Headline scores in the normal range — explore by direction.",
    body: "No single zone is screaming. Use the radar to spot per-direction asymmetry, then drill into any flagged region via Substrate.",
  };
}
