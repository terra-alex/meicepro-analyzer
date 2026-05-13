"use client";

import ComparePanel from "@/components/ComparePanel";
import { SectionTitle, t } from "@/components/ds";
import type { ReportPayload } from "@/lib/types";

export function CompareScreen({
  a,
  b,
  loading,
  error,
  direction,
  onLoad,
  onSwap,
  onClear,
}: {
  a: ReportPayload;
  b: ReportPayload | null;
  loading: boolean;
  error: string | null;
  direction: -1 | 0 | 1;
  onLoad: (id: string, lang: string) => void;
  onSwap: () => void;
  onClear: () => void;
}) {
  return (
    <main className="px-7 pb-12">
      <section className="pt-6 pb-5 max-w-[1100px]">
        <div
          className="uppercase font-medium mb-2"
          style={{ fontSize: 10.5, letterSpacing: "0.18em", color: t.muted }}
        >
          Compare
        </div>
        <h1
          className="font-serif-display"
          style={{
            fontSize: 42,
            lineHeight: 1.05,
            color: t.ink,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Two scans · score deltas + symptom-count deltas.
        </h1>
        <p
          className="mt-3 max-w-[760px]"
          style={{ fontSize: 14, color: t.muted, lineHeight: 1.55 }}
        >
          Load any second diagnosis ID below. Positive deltas (improvement) appear
          in sage; regressions in clay. Same-direction radars and image
          thumbnails sit side-by-side.
        </p>
      </section>
      <ComparePanel
        a={a}
        b={b}
        loading={loading}
        error={error}
        direction={direction}
        onLoad={onLoad}
        onSwap={onSwap}
        onClear={onClear}
      />
    </main>
  );
}
