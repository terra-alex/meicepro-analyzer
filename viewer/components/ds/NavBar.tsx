"use client";

import { t } from "./tokens";

export type ViewKey =
  | "report"
  | "substrate"
  | "compare"
  | "roi"
  | "bloodwork"
  | "plan";

const SOON: ReadonlySet<ViewKey> = new Set<ViewKey>(["bloodwork", "plan"]);

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: "report", label: "Report" },
  { key: "substrate", label: "Substrate" },
  { key: "compare", label: "Compare" },
  { key: "roi", label: "ROI" },
  { key: "bloodwork", label: "Bloodwork" },
  { key: "plan", label: "Plan" },
];

export function NavBar({
  active,
  onChange,
  right,
}: {
  active: ViewKey;
  onChange?: (k: ViewKey) => void;
  right?: React.ReactNode;
}) {
  return (
    <nav
      className="flex items-center gap-7 px-7 py-3 sticky top-0 z-30"
      style={{
        background: t.surface,
        borderBottom: `1px solid ${t.hairline}`,
      }}
    >
      <div
        className="flex items-center gap-2.5 pr-4"
        style={{ borderRight: `1px solid ${t.hairline2}` }}
      >
        <div
          className="grid place-items-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: t.ink,
            color: t.surface,
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: 14,
          }}
        >
          M
        </div>
        <span className="text-[12.5px] font-medium tracking-[-0.005em]">
          Meicepro
        </span>
      </div>
      <div className="flex gap-0.5">
        {NAV_ITEMS.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange?.(it.key)}
              className="relative px-3 py-1.5 rounded text-[12.5px] tracking-[-0.005em] cursor-pointer transition-colors"
              style={{
                color: isActive ? t.teal : t.muted,
                fontWeight: isActive ? 500 : 400,
                background: "transparent",
                border: "none",
              }}
            >
              {it.label}
              {SOON.has(it.key) && (
                <span
                  className="font-mono-fine"
                  style={{
                    marginLeft: 6,
                    fontSize: 8.5,
                    letterSpacing: "0.08em",
                    color: t.clay,
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  soon
                </span>
              )}
              {isActive && (
                <span
                  className="absolute left-3 right-3 -bottom-[13px] h-0.5"
                  style={{ background: t.teal, borderRadius: 1 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        {right ?? (
          <span
            className="font-mono-fine"
            style={{
              fontSize: 10.5,
              color: t.faint,
              letterSpacing: "0.04em",
            }}
          >
            v0.10.3 · alg 1.3.0.6
          </span>
        )}
      </div>
    </nav>
  );
}

/** Mobile bottom-bar nav — 5 icon buttons. */
export function MNavBar({
  active,
  onChange,
}: {
  active: ViewKey;
  onChange?: (k: ViewKey) => void;
}) {
  const ICONS: Record<ViewKey, React.ReactNode> = {
    report: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    substrate: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    compare: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="5" height="10" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="3" width="5" height="10" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    roi: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 6 Q3 3 6 3 L10 3 Q13 3 13 6 L13 10 Q13 13 10 13 L6 13 Q3 13 3 10 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="1.6 1.4"
        />
      </svg>
    ),
    plan: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <line x1="3" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="2" cy="4" r="0.8" fill="currentColor" />
        <circle cx="2" cy="8" r="0.8" fill="currentColor" />
        <circle cx="2" cy="12" r="0.8" fill="currentColor" />
      </svg>
    ),
    bloodwork: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2 C5.5 5 4 7 4 9.5 a4 4 0 0 0 8 0 C12 7 10.5 5 8 2 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };
  return (
    <nav
      className="grid sticky top-0 z-30"
      style={{
        gridTemplateColumns: "repeat(5, 1fr)",
        background: t.surface,
        borderBottom: `1px solid ${t.hairline}`,
      }}
    >
      {NAV_ITEMS.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange?.(it.key)}
            className="relative flex flex-col items-center justify-center gap-[3px] py-2.5 cursor-pointer"
            style={{
              color: isActive ? t.teal : t.muted,
              fontSize: 10,
              fontWeight: isActive ? 500 : 400,
              minHeight: 48,
              border: "none",
              background: "transparent",
            }}
          >
            {ICONS[it.key]}
            <span>{it.label}</span>
            {isActive && (
              <span
                className="absolute top-0 left-[20%] right-[20%] h-0.5"
                style={{ background: t.teal }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
