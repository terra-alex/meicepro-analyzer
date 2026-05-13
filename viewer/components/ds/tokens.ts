// Design tokens — mirror app/globals.css and design-handoff shared.jsx.
// Where possible, primitives read from CSS variables so palette tweaks
// happen in one place. These exports exist for the few spots that need
// raw values inside SVG / inline-style attributes.

export const t = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-alt)",
  ink: "var(--ink)",
  ink2: "var(--ink-2)",
  muted: "var(--muted)",
  faint: "var(--faint)",
  hairline: "var(--hairline)",
  hairline2: "var(--hairline-2)",
  teal: "var(--teal)",
  tealSoft: "var(--teal-soft)",
  clay: "var(--clay)",
  claySoft: "var(--clay-soft)",
  sage: "var(--sage)",
  sageSoft: "var(--sage-soft)",
  amber: "var(--amber)",
  amberSoft: "var(--amber-soft)",
  rose: "var(--rose)",
  roseSoft: "var(--rose-soft)",
} as const;

// Multispectral placeholder gradients — used by <FacePlate /> only.
// We never fake faces; these are tinted plates with a head silhouette.
export const channelGradient: Record<string, string> = {
  daylight: "linear-gradient(150deg, #E6D8C2 0%, #C8A981 60%, #8E6E48 100%)",
  cross: "linear-gradient(150deg, #DCD4C5 0%, #B4A085 60%, #75614A 100%)",
  parallel: "linear-gradient(150deg, #E6D5BC 0%, #C29F76 60%, #875F35 100%)",
  uv: "linear-gradient(150deg, #2A2240 0%, #50396E 50%, #1A1330 100%)",
  bloodmap: "linear-gradient(150deg, #2A0F18 0%, #7B2030 50%, #C84B5C 100%)",
  redmap: "linear-gradient(150deg, #2A0F18 0%, #973340 50%, #DA5E68 100%)",
  deepRed: "linear-gradient(150deg, #1A0810 0%, #6B1A28 50%, #AF3848 100%)",
  brownmap: "linear-gradient(150deg, #2C1808 0%, #7B4A20 50%, #B57A40 100%)",
  deepBrown: "linear-gradient(150deg, #1A0E04 0%, #5A3818 50%, #94632F 100%)",
  coolmap: "linear-gradient(150deg, #1A2238 0%, #3B4E72 50%, #6B82A8 100%)",
  surfaceAging: "linear-gradient(150deg, #281B0E 0%, #785A33 50%, #B89868 100%)",
};

export type Severity = {
  bucket: "ok" | "mild" | "mod" | "sev" | "na";
  label: string;
  color: string;
  soft: string;
};

export function severityFromScore(s: number | null | undefined): Severity {
  if (s == null)
    return { bucket: "na", label: "—", color: t.muted, soft: t.hairline2 };
  if (s >= 85)
    return { bucket: "ok", label: "Excellent", color: t.sage, soft: t.sageSoft };
  if (s >= 70)
    return { bucket: "mild", label: "Mild", color: t.teal, soft: t.tealSoft };
  if (s >= 50)
    return { bucket: "mod", label: "Moderate", color: t.amber, soft: t.amberSoft };
  return { bucket: "sev", label: "Severe", color: t.rose, soft: t.roseSoft };
}
