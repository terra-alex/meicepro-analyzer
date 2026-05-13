"use client";

import { channelGradient, severityFromScore, t, type Severity } from "./tokens";

/* ─────────────────────────────────────────────────────────────────
 * ScoreChip — compact hairline card with severity colouring.
 * Big variant pulls the headline scores at editorial size.
 * ──────────────────────────────────────────────────────────────── */
export function ScoreChip({
  label,
  value,
  severity,
  big = false,
  sub,
}: {
  label: string;
  value: number | null | undefined;
  severity?: Severity;
  big?: boolean;
  sub?: string;
}) {
  const sev = severity ?? severityFromScore(value);
  return (
    <div
      className="flex flex-col min-w-0"
      style={{
        padding: big ? "16px 18px" : "12px 14px",
        background: t.surface,
        border: `1px solid ${t.hairline}`,
        borderRadius: 6,
        gap: big ? 8 : 4,
      }}
    >
      <div className="flex justify-between items-baseline gap-2">
        <div
          className="uppercase font-medium"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.08em",
            color: t.muted,
          }}
        >
          {label}
        </div>
        <div
          className="uppercase font-medium"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.06em",
            color: sev.color,
          }}
        >
          {sev.label}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-serif-display"
          style={{
            fontSize: big ? 56 : 34,
            lineHeight: 1,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          {value ?? "—"}
        </span>
        <span
          className="font-mono-fine"
          style={{ fontSize: 11, color: t.faint }}
        >
          /100
        </span>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: t.muted }}>{sub}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * SectionTitle — kicker + title with optional right slot.
 * ──────────────────────────────────────────────────────────────── */
export function SectionTitle({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-baseline mb-3.5">
      <div>
        {kicker && (
          <div
            className="uppercase font-medium mb-1"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.12em",
              color: t.muted,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          className="font-medium"
          style={{
            fontSize: 18,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * DirSeg — direction segmented control (Left / Front / Right) with
 * the per-direction composite in the chip.
 * ──────────────────────────────────────────────────────────────── */
export type Direction = "left" | "front" | "right";

export function DirSeg({
  value,
  onChange,
  scores = { left: 62, front: 75, right: 71 },
}: {
  value: Direction;
  onChange?: (v: Direction) => void;
  scores?: Record<Direction, number | null | undefined>;
}) {
  const opts: { key: Direction; label: string }[] = [
    { key: "left", label: "Left" },
    { key: "front", label: "Front" },
    { key: "right", label: "Right" },
  ];
  return (
    <div
      className="inline-flex p-[3px] gap-[2px]"
      style={{
        border: `1px solid ${t.hairline}`,
        borderRadius: 6,
        background: t.surface,
        overflow: "hidden",
      }}
    >
      {opts.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange?.(o.key)}
            className="inline-flex items-center gap-[7px] cursor-pointer transition-colors"
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: 4,
              background: active ? t.ink : "transparent",
              color: active ? t.surface : t.ink2,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
          >
            {o.label}
            <span
              className="font-mono-fine"
              style={{
                fontSize: 10,
                color: active ? "rgba(255,255,255,0.55)" : t.faint,
              }}
            >
              {scores[o.key] ?? "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PillBtn — pill-style button. Primary fills with ink; default is
 * hairline outline on surface.
 * ──────────────────────────────────────────────────────────────── */
export function PillBtn({
  children,
  onClick,
  primary,
  sm,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  sm?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        padding: sm ? "5px 11px" : "8px 14px",
        border: primary ? "none" : `1px solid ${t.hairline}`,
        background: primary ? t.ink : t.surface,
        color: primary ? t.surface : t.ink2,
        borderRadius: 6,
        fontSize: sm ? 11 : 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Spark — tiny sparkline.
 * ──────────────────────────────────────────────────────────────── */
export function Spark({
  values,
  w = 120,
  h = 28,
  color,
  dotColor,
  last = true,
  min = 0,
  max = 100,
}: {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
  dotColor?: string;
  last?: boolean;
  min?: number;
  max?: number;
}) {
  if (!values?.length) return null;
  const lineColor = color ?? t.ink2;
  const dot = dotColor ?? t.clay;
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return [x, y] as const;
  });
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const lastPt = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="block">
      <path
        d={d}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill={dot} />}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * FacePlate — placeholder multispectral panel. NEVER fakes a face;
 * a tinted plate + soft head silhouette + faint scanlines. Children
 * (e.g. real image, lasso overlay) render on top.
 * ──────────────────────────────────────────────────────────────── */
export function FacePlate({
  kind = "daylight",
  label,
  sub,
  children,
  style,
  dim = false,
  className,
}: {
  kind?: keyof typeof channelGradient;
  label?: string;
  sub?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  dim?: boolean;
  className?: string;
}) {
  const grad = channelGradient[kind] ?? channelGradient.daylight;
  // Make the SVG def id unique enough across many simultaneous instances.
  const slug = `fp-${kind}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div
      className={className}
      style={{
        position: "relative",
        background: grad,
        borderRadius: 6,
        overflow: "hidden",
        isolation: "isolate",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: dim ? 0.18 : 0.22,
          mixBlendMode: "overlay",
        }}
        aria-hidden
      >
        <defs>
          <radialGradient id={slug} cx="50%" cy="42%" r="42%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.20" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="225" rx="135" ry="175" fill={`url(#${slug})`} />
      </svg>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)",
        }}
      />
      {label && (
        <div
          className="font-mono-fine"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#fff",
            opacity: 0.85,
            background: "rgba(0,0,0,0.35)",
            padding: "3px 7px",
            borderRadius: 3,
            backdropFilter: "blur(4px)",
            zIndex: 1,
          }}
        >
          {label}
        </div>
      )}
      {sub && (
        <div
          className="font-mono-fine"
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "#fff",
            opacity: 0.65,
            zIndex: 1,
          }}
        >
          {sub}
        </div>
      )}
      {children}
    </div>
  );
}
