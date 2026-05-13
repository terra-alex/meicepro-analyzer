"use client";

import { t } from "./tokens";

export function StatusPill({
  state = "live",
  age,
}: {
  state?: "live" | "stale";
  age?: string;
}) {
  if (state === "live") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px]"
        style={{
          border: `1px solid ${t.hairline}`,
          background: t.surface,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: t.teal,
            boxShadow: `0 0 0 2px ${t.tealSoft}`,
          }}
        />
        <span
          className="font-mono-fine"
          style={{
            fontSize: 10.5,
            color: t.ink2,
            letterSpacing: "0.04em",
          }}
        >
          live
        </span>
      </div>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px]"
      style={{
        border: `1px solid color-mix(in oklch, ${t.clay} 30%, transparent)`,
        background: t.claySoft,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden>
        <circle cx="6" cy="6" r="5" fill="none" stroke={t.clay} strokeWidth="1.1" />
        <path
          d="M6 3 V6 L8 7.5"
          fill="none"
          stroke={t.clay}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-mono-fine"
        style={{
          fontSize: 10.5,
          color: t.clay,
          letterSpacing: "0.04em",
        }}
      >
        stale{age ? ` (${age})` : ""}
      </span>
    </div>
  );
}
