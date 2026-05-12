import type { DiagnosisSkin } from "./types";

// Symptom code → human label. Codes recovered from the JS bundle + symptomDescList.
export const SYMPTOM_LABEL: Record<string, string> = {
  "01": "UV Spots / Freckles",
  "02": "Brown Spots",
  "03": "Deep / UV Deep Spots",
  "04": "Sensitive (Red Area)",
  "06": "Texture",
  "07": "Pores",
  "08": "Porphyrin",
  "09": "Forehead Lines",
  "10": "Frown Lines (Glabellar)",
  "11": "Inter-ocular Wrinkles",
  "12": "Periorbital Wrinkles",
  "13": "Crow's Feet",
  "14": "Nasolabial Folds",
  "15": "Marionette Lines",
  "17": "Acne",
};

// Symptoms whose detail list uses the wrinkle severity scheme (skin pattern → deepest).
export const WRINKLE_SYMPTOMS = new Set(["09", "10", "11", "12", "13", "14", "15"]);

export const DEGREE_LABEL_DEFAULT: Record<number, string> = {
  1: "Mild",
  2: "Moderate",
  3: "Severe",
};

export const DEGREE_LABEL_WRINKLE: Record<number, string> = {
  1: "Skin pattern",
  2: "Shallow",
  3: "Moderate",
  4: "Deep",
  5: "Deeper",
  6: "Deepest",
};

// All wrinkle regions surfaced in the response. Each maps a key prefix that exists as
// {prefix}Score, {prefix}AgingIndex, {prefix}Weight on DiagnosisSkin and to a face
// silhouette region for the heatmap.
export const WRINKLE_REGIONS = [
  { key: "Forehead", label: "Forehead", code: "09" },
  { key: "Glabellar", label: "Frown / Glabellar", code: "10" },
  { key: "Betweeneye", label: "Inter-ocular", code: "11" },
  { key: "Undereye", label: "Periorbital", code: "12" },
  { key: "Side", label: "Crow's feet", code: "13" },
  { key: "Nasofolds", label: "Nasolabial", code: "14" },
  { key: "Cormouth", label: "Marionette", code: "15" },
] as const;

// All radar metrics + the underlying score key on DiagnosisSkin. Higher score = better.
export const RADAR_METRICS = [
  { key: "uvspotScore", label: "UV Spots", short: "UV", code: "02-uv" },
  { key: "brownspotScore", label: "Brown Spots", short: "Brown", code: "02" },
  { key: "redspotScore", label: "Red Area", short: "Red", code: "04" },
  { key: "poreScore", label: "Pores", short: "Pore", code: "07" },
  { key: "textureScore", label: "Texture", short: "Tex", code: "06" },
  { key: "surfacespotScore", label: "Surface Spots", short: "Surf", code: "02-surf" },
  { key: "acneScore", label: "Acne", short: "Acne", code: "17" },
] as const;

// Image-layer catalogue. `kind` distinguishes raw photographs from semi-transparent
// overlay masks (so the UI can blend them together).
export type LayerKind = "base" | "overlay" | "heatmap";

export interface LayerSpec {
  field: keyof DiagnosisSkin;
  label: string;
  kind: LayerKind;
  group: string;
  hint?: string;
}

export const LAYERS: LayerSpec[] = [
  // Raw photographs — pick one as the background.
  { field: "imgDaylight", label: "Daylight", kind: "base", group: "Photos" },
  { field: "imgCross", label: "Cross-polarised", kind: "base", group: "Photos", hint: "Reduces specular glare; great for pigment" },
  { field: "imgParallel", label: "Parallel-polarised", kind: "base", group: "Photos", hint: "Emphasises surface texture / oil" },
  { field: "imgUv", label: "UV", kind: "base", group: "Photos", hint: "Sun damage + porphyrins fluoresce" },
  { field: "imgUvSpecial", label: "UV (special)", kind: "base", group: "Photos" },
  { field: "imgUvHighContrast", label: "UV high-contrast", kind: "base", group: "Photos" },
  { field: "imgWood", label: "Wood's lamp", kind: "base", group: "Photos" },

  // Heatmap-style JPGs that work well as additive overlays.
  { field: "imgBloodmap", label: "Blood map", kind: "heatmap", group: "Vascular" },
  { field: "imgRedhotmap", label: "Red hotmap", kind: "heatmap", group: "Vascular" },
  { field: "imgRedmap", label: "Red map", kind: "heatmap", group: "Vascular" },
  { field: "imgDeepRedMap", label: "Deep red map", kind: "heatmap", group: "Vascular" },
  { field: "imgBrownmap", label: "Brown map", kind: "heatmap", group: "Pigment" },
  { field: "imgDeepBrownMap", label: "Deep brown map", kind: "heatmap", group: "Pigment" },
  { field: "imgBrownHotmap", label: "Brown hotmap", kind: "heatmap", group: "Pigment" },
  { field: "imgDeepSpotPng", label: "Deep spots", kind: "heatmap", group: "Pigment" },
  { field: "imgDeepGraySpotPng", label: "Deep gray spots", kind: "heatmap", group: "Pigment" },
  { field: "imgCoolMap", label: "Cool map", kind: "heatmap", group: "Tone" },
  { field: "imgSurfaceSpotAging", label: "Surface aging", kind: "heatmap", group: "Aging" },

  // Semi-transparent detection masks.
  { field: "imgAcnePng", label: "Acne mask", kind: "overlay", group: "Detection" },
  { field: "imgRedAcnePng", label: "Inflamed acne mask", kind: "overlay", group: "Detection" },
  { field: "imgPorePng", label: "Pore mask", kind: "overlay", group: "Detection" },
  { field: "imgTexturePng", label: "Texture mask", kind: "overlay", group: "Detection" },
  { field: "imgSurfaceSpotPng", label: "Surface spot mask", kind: "overlay", group: "Detection" },
  { field: "imgBrownSpotPng", label: "Brown spot mask", kind: "overlay", group: "Detection" },
  { field: "imgSensitiveAreaPng", label: "Sensitive / red area", kind: "overlay", group: "Detection" },

  // Region-specific wrinkle masks (front-face only mostly).
  { field: "imgWrinklePng", label: "All wrinkles", kind: "overlay", group: "Wrinkles" },
  { field: "imgForeheadPng", label: "Forehead lines", kind: "overlay", group: "Wrinkles" },
  { field: "imgGlabellarPng", label: "Frown / glabellar", kind: "overlay", group: "Wrinkles" },
  { field: "imgBetweeneyePng", label: "Inter-ocular", kind: "overlay", group: "Wrinkles" },
  { field: "imgUndereyePng", label: "Periorbital", kind: "overlay", group: "Wrinkles" },
  { field: "imgNasofoldsPng", label: "Nasolabial", kind: "overlay", group: "Wrinkles" },
  { field: "imgCormouthPng", label: "Marionette", kind: "overlay", group: "Wrinkles" },
  { field: "imgSidePng", label: "Side annotations", kind: "overlay", group: "Wrinkles" },
  { field: "imgAging", label: "Aging composite", kind: "overlay", group: "Wrinkles" },
];

// Score → severity bucket. Higher score = healthier skin.
export type SeverityBucket = "ok" | "mild" | "moderate" | "severe";

export function severityFromScore(score: number | null | undefined): SeverityBucket {
  if (score == null) return "ok";
  if (score >= 0.85) return "ok";
  if (score >= 0.7) return "mild";
  if (score >= 0.5) return "moderate";
  return "severe";
}

// Aging index 0..50ish → severity. Higher = worse aging.
export function severityFromAgingIndex(idx: number | null | undefined): SeverityBucket {
  if (idx == null || idx < 0) return "ok";
  if (idx < 10) return "mild";
  if (idx < 20) return "moderate";
  return "severe";
}

export const SEVERITY_COLOR: Record<SeverityBucket, { bg: string; fg: string; ring: string; chip: string }> = {
  ok:       { bg: "bg-emerald-500/15", fg: "text-emerald-300", ring: "ring-emerald-500/30", chip: "bg-emerald-500/25 text-emerald-200" },
  mild:     { bg: "bg-lime-500/15",    fg: "text-lime-300",    ring: "ring-lime-500/30",    chip: "bg-lime-500/25 text-lime-100"     },
  moderate: { bg: "bg-amber-500/15",   fg: "text-amber-300",   ring: "ring-amber-500/30",   chip: "bg-amber-500/25 text-amber-100"   },
  severe:   { bg: "bg-rose-500/15",    fg: "text-rose-300",    ring: "ring-rose-500/30",    chip: "bg-rose-500/25 text-rose-100"     },
};

export const SEVERITY_LABEL: Record<SeverityBucket, string> = {
  ok: "Excellent",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export const DIRECTION_NAME: Record<-1 | 0 | 1, string> = {
  [-1]: "Left",
  0: "Front",
  1: "Right",
};
