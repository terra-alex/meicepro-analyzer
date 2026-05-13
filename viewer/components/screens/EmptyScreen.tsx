"use client";

import { FormEvent, useState } from "react";
import { PillBtn, StatusPill, t } from "@/components/ds";

type Recent = { id: string; subj: string; name: string; date: string; composite: number };

const RECENT_FALLBACK: Recent[] = [
  { id: "4b6f68e4", subj: "MC-2104", name: "Alex V.", date: "25 Apr 2026", composite: 69 },
  { id: "e9132adc", subj: "MC-1987", name: "Helen R.", date: "22 Apr 2026", composite: 81 },
  { id: "71fe004b", subj: "MC-2061", name: "Joon K.", date: "18 Apr 2026", composite: 74 },
];

export function EmptyScreen({
  onSubmit,
  onSample,
  loading,
  error,
  recent = RECENT_FALLBACK,
}: {
  onSubmit: (id: string, lang: string) => void;
  onSample: () => void;
  loading: boolean;
  error: string | null;
  recent?: Recent[];
}) {
  const [id, setId] = useState("");
  const [lang, setLang] = useState("en");
  const [howOpen, setHowOpen] = useState(true);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!id.trim()) return;
    onSubmit(id.trim(), lang);
  }

  return (
    <main className="flex-1 grid pb-12" style={{ gridTemplateRows: "1fr auto" }}>
      <div
        className="grid w-full max-w-[1100px] mx-auto"
        style={{
          gridTemplateColumns: "1fr 480px 1fr",
          alignItems: "start",
          padding: "60px 36px 0",
        }}
      >
        <div />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StatusPill state="live" />
          </div>
          <div
            className="uppercase font-medium mb-3.5"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            Multispectral skin-analysis report viewer
          </div>
          <h1
            className="font-serif-display"
            style={{
              fontSize: 54,
              lineHeight: 1.02,
              color: t.ink,
              margin: 0,
              textWrap: "balance",
            }}
          >
            Open a scan to begin.
          </h1>
          <p
            className="mt-4 max-w-[420px]"
            style={{ fontSize: 14.5, lineHeight: 1.55, color: t.ink2 }}
          >
            Inspect 16 imaging channels, 7 composite scores, and per-region
            aging indices from a single MC900 capture. Compare scans, draw
            regions of interest, and track substrate-level pigment and vascular
            signals across time.
          </p>

          <form onSubmit={submit} className="mt-8">
            <label
              className="uppercase font-medium"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Diagnosis ID
            </label>
            <div className="mt-2 flex gap-2 items-stretch">
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="paste a UUID, e.g. 4b6f68e4-d6fc-4fac-87b4-…"
                className="font-mono-fine flex-1"
                style={{
                  padding: "11px 14px",
                  border: `1px solid ${t.hairline}`,
                  borderRadius: 6,
                  background: t.surface,
                  fontSize: 12.5,
                  color: t.ink,
                  outline: "none",
                }}
              />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="font-mono-fine"
                style={{
                  padding: "11px 12px",
                  border: `1px solid ${t.hairline}`,
                  borderRadius: 6,
                  background: t.surface,
                  fontSize: 12,
                  color: t.ink2,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {[
                  "en",
                  "zh",
                  "es",
                  "fr",
                  "de",
                  "it",
                  "pt",
                  "ja",
                  "ru",
                  "ar",
                  "tr",
                  "pl",
                  "nl",
                  "sk",
                  "el",
                  "he",
                  "hu",
                  "id",
                  "lt",
                  "th",
                  "uk",
                  "vi",
                ].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <PillBtn primary type="submit" disabled={loading}>
                {loading ? "Opening…" : "Open"}
              </PillBtn>
            </div>
            <div className="mt-3 flex items-center gap-3.5">
              <button
                type="button"
                onClick={onSample}
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
                Try sample report
              </button>
              <span style={{ fontSize: 12, color: t.faint }}>
                Or drop a{" "}
                <span className="font-mono-fine" style={{ color: t.muted }}>
                  diagnosis.json
                </span>{" "}
                file
              </span>
            </div>
            {error && (
              <div
                className="mt-3"
                style={{
                  fontSize: 12,
                  color: t.rose,
                  background: t.roseSoft,
                  border: `1px solid color-mix(in oklch, ${t.rose} 25%, transparent)`,
                  borderRadius: 4,
                  padding: "8px 12px",
                }}
              >
                {error}
              </div>
            )}
          </form>

          {/* Recent on this device */}
          <div className="mt-10">
            <div
              className="uppercase font-medium mb-3"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Recent on this device
            </div>
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.hairline}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {recent.map((r, i) => (
                <div
                  key={r.id}
                  className="grid items-center gap-3 px-4 py-3.5"
                  style={{
                    gridTemplateColumns: "1fr auto auto",
                    borderTop: i === 0 ? "none" : `1px solid ${t.hairline2}`,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 13, color: t.ink, fontWeight: 500 }}
                    >
                      {r.name}
                    </div>
                    <div
                      className="font-mono-fine"
                      style={{ fontSize: 11, color: t.muted }}
                    >
                      {r.subj} · {r.id}…
                    </div>
                  </div>
                  <div
                    className="font-mono-fine"
                    style={{ fontSize: 11, color: t.muted }}
                  >
                    {r.date}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-serif-display"
                      style={{ fontSize: 20, color: t.ink }}
                    >
                      {r.composite}
                    </span>
                    <span
                      className="font-mono-fine"
                      style={{ fontSize: 9.5, color: t.faint }}
                    >
                      /100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setHowOpen((v) => !v)}
              className="cursor-pointer w-full flex items-center justify-between"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: "inherit",
                color: t.muted,
              }}
            >
              <span
                className="uppercase font-medium"
                style={{ fontSize: 10.5, letterSpacing: "0.12em" }}
              >
                How it works
              </span>
              <span style={{ fontSize: 18, color: t.faint }}>
                {howOpen ? "−" : "+"}
              </span>
            </button>
            {howOpen && (
              <div
                className="grid gap-4 mt-4"
                style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
              >
                {[
                  {
                    n: "01",
                    title: "Capture",
                    body: "MC900 records 6 channels per direction — daylight, polarised, UV.",
                  },
                  {
                    n: "02",
                    title: "Analyse",
                    body: "On-device pipeline emits 10 heatmaps, 5 masks, composite scores.",
                  },
                  {
                    n: "03",
                    title: "Inspect",
                    body: "This viewer overlays substrate-level signals to support clinical reasoning.",
                  },
                ].map((s) => (
                  <div key={s.n}>
                    <div
                      className="font-mono-fine"
                      style={{ fontSize: 11, color: t.faint }}
                    >
                      {s.n}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        color: t.ink,
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.muted,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {s.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div />
      </div>
    </main>
  );
}
