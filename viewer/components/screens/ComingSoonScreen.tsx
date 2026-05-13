"use client";

import { MockBadge, PillBtn, t } from "@/components/ds";

export function ComingSoonScreen({
  title,
  kicker,
  intent,
  bullets,
  needs,
}: {
  title: string;
  kicker: string;
  intent: string;
  bullets: string[];
  needs: string[];
}) {
  return (
    <main className="px-7 pb-12 pt-8">
      <section
        className="max-w-[760px] mx-auto"
        style={{
          background: t.surface,
          border: `1px solid ${t.hairline}`,
          borderRadius: 8,
          padding: "36px 40px",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="uppercase font-medium"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
          >
            {kicker}
          </span>
          <MockBadge>Coming soon · not wired</MockBadge>
        </div>
        <h2
          className="font-serif-display"
          style={{ fontSize: 40, lineHeight: 1.05, color: t.ink, margin: 0 }}
        >
          {title}
        </h2>
        <p
          className="mt-3"
          style={{ fontSize: 14.5, lineHeight: 1.55, color: t.ink2, maxWidth: 620 }}
        >
          {intent}
        </p>

        <div className="mt-7 grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div
              className="uppercase font-medium mb-2"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              What this screen will do
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: t.ink2, fontSize: 13, lineHeight: 1.6 }}>
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <div
              className="uppercase font-medium mb-2"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Blocked on
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: t.ink2, fontSize: 13, lineHeight: 1.6 }}>
              {needs.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-2 items-center">
          <PillBtn sm disabled>
            Generate {title.toLowerCase()}
          </PillBtn>
          <span
            className="font-mono-fine"
            style={{ fontSize: 11, color: t.faint }}
          >
            disabled — see future plan docs
          </span>
        </div>
      </section>
    </main>
  );
}
