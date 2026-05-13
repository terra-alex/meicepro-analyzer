"use client";

import { t } from "./tokens";

export function ReportHeader({
  name,
  subject,
  captured,
  composite,
  mode,
  modeRight,
}: {
  name: string;
  subject: string;
  captured: string;
  composite: number | null | undefined;
  mode?: React.ReactNode;
  modeRight?: React.ReactNode;
}) {
  return (
    <header
      className="flex items-end justify-between gap-6 px-7"
      style={{
        padding: "22px 28px 18px",
        borderBottom: `1px solid ${t.hairline}`,
        background: t.bg,
      }}
    >
      <div className="flex items-end gap-7 min-w-0">
        <div>
          <div
            className="uppercase mb-1"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.12em",
              color: t.muted,
            }}
          >
            Meicepro · Report
          </div>
          <div
            className="font-serif-display"
            style={{
              fontSize: 32,
              color: t.ink,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            className="font-mono-fine mt-1.5"
            style={{ fontSize: 12, color: t.muted }}
          >
            {subject} &nbsp;·&nbsp; captured {captured}
          </div>
        </div>
        <div style={{ height: 42, width: 1, background: t.hairline }} />
        <div>
          <div
            className="uppercase mb-1"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.12em",
              color: t.muted,
            }}
          >
            Composite
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-serif-display"
              style={{
                fontSize: 30,
                color: t.ink,
                lineHeight: 1,
              }}
            >
              {composite ?? "—"}
            </span>
            <span
              className="font-mono-fine"
              style={{ fontSize: 11, color: t.faint }}
            >
              /100
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {mode}
        {modeRight}
      </div>
    </header>
  );
}
