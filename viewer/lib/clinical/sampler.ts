"use client";

// Browser-only canvas pixel sampler. Loads a proxied OSS image into an
// OffscreenCanvas, samples the polygon's bounding-box crop with a point-in-
// polygon test, returns normalised 0..1 channel means + optional mask coverage.

import type { ChannelKey, NormPoint, SampleOrFail } from "./types";

interface SampleOptions {
  /** When the channel is a binary mask, also compute coverage above this 0..255 cutoff. */
  maskCutoff?: number;
}

function pointInPolygon(x: number, y: number, poly: NormPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = obj;
    await new Promise<void>((res2, rej) => {
      img.onload = () => res2();
      img.onerror = () => rej(new Error("decode"));
    });
    return img;
  } finally {
    // Revoke after a tick so the caller can still draw from it.
    setTimeout(() => URL.revokeObjectURL(obj), 1000);
  }
}

export async function sampleZone(
  url: string | null,
  channel: ChannelKey,
  polygon: NormPoint[],
  signal?: AbortSignal,
  opts: SampleOptions = {},
): Promise<SampleOrFail> {
  if (!url) return { channel, error: "no_url" };
  let img: HTMLImageElement;
  try {
    img = await loadImage(url, signal);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "decode") return { channel, error: "decode" };
    return { channel, error: "fetch_failed" };
  }
  const W = img.naturalWidth, H = img.naturalHeight;
  if (!W || !H) return { channel, error: "decode" };

  // Polygon bbox in pixels.
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const bx = Math.max(0, Math.floor(minX * W));
  const by = Math.max(0, Math.floor(minY * H));
  const bw = Math.min(W - bx, Math.ceil((maxX - minX) * W));
  const bh = Math.min(H - by, Math.ceil((maxY - minY) * H));
  if (bw <= 0 || bh <= 0) return { channel, error: "decode" };

  // Use a regular <canvas> for broad browser support.
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(W, H)
      : (() => {
          const c = document.createElement("canvas");
          c.width = W;
          c.height = H;
          return c;
        })();
  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext(
    "2d",
  ) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return { channel, error: "decode" };
  try {
    ctx.drawImage(img, 0, 0);
  } catch {
    return { channel, error: "taint" };
  }
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(bx, by, bw, bh).data;
  } catch {
    return { channel, error: "taint" };
  }

  let sumR = 0, sumG = 0, sumB = 0, sumChroma = 0, n = 0;
  let masked = 0;        // pixels above maskCutoff brightness (for binary masks)
  let chromaHits = 0;    // pixels with strong colour signal (for heatmaps)
  const cutoff = opts.maskCutoff;
  // 0..1 cutoff for "this pixel is genuinely lit up in the heatmap, not skin gray".
  // 0.18 ≈ 46/255 — generously above typical skin tone chroma (~0.05–0.10) while
  // catching faint heatmap signal that's clearly coloured rather than gray.
  const CHROMA_HOT = 0.18;
  for (let y = 0; y < bh; y++) {
    const py = (by + y) / H;
    for (let x = 0; x < bw; x++) {
      const px = (bx + x) / W;
      if (!pointInPolygon(px, py, polygon)) continue;
      const idx = (y * bw + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      sumR += r;
      sumG += g;
      sumB += b;
      // Chromatic saturation away from grayscale: 0 for pure gray skin,
      // ~0.3–0.6 for a saturated false-color heatmap overlay pixel.
      const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      sumChroma += chroma;
      if (chroma > CHROMA_HOT) chromaHits++;
      n++;
      if (cutoff != null && (r + g + b) / 3 > cutoff) masked++;
    }
  }
  if (n === 0) return { channel, error: "decode" };

  const meanRGB = (sumR + sumG + sumB) / (3 * n) / 255;
  const chroma = sumChroma / n;
  const chromaCoverage = chromaHits / n;
  const coverage = cutoff != null ? masked / n : undefined;
  return { channel, mean: meanRGB, chroma, chromaCoverage, coverage };
}
