"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DiagnosisSkin } from "@/lib/types";

type Pt = { x: number; y: number };
type Tri = { x: number; y: number; z: number };

interface AgingJson {
  padding: number;
  start_pts: Pt[];
  target_pts: Pt[];
  tri_idx: Tri[];
}

interface Props {
  face: DiagnosisSkin; // expected to be a face with both imgDaylight and jsonAging
}

// Canvas-based triangle warp:
// for each triangle (i,j,k) take the source pixels at start_pts and
// re-project them onto the destination triangle defined by lerp(start, target, t).
//
// This reproduces the "what would my face look like after aging" preview that
// the H5 only ever animates passively. Here we expose it as a scrubbable slider.
export default function AgingMorph({ face }: Props) {
  const imgUrl = face.imgDaylight;
  const meshUrl = face.jsonAging;

  const [t, setT] = useState(0); // 0..1
  const [mesh, setMesh] = useState<AgingJson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgReady, setImgReady] = useState(false);

  // Load mesh JSON.
  useEffect(() => {
    if (!meshUrl) return;
    setMesh(null);
    setError(null);
    fetch(meshUrl)
      .then((r) => r.json() as Promise<AgingJson>)
      .then(setMesh)
      .catch((e) => setError(`mesh fetch failed: ${e.message}`));
  }, [meshUrl]);

  // Pre-load image so we can drawImage from it.
  // Routed through /api/img to dodge OSS missing CORS headers — without this
  // the canvas would taint and drawImage would throw a SecurityError.
  useEffect(() => {
    if (!imgUrl) return;
    setImgReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgReady(true);
    };
    img.onerror = () => setError("image load failed (crossOrigin?)");
    img.src = `/api/img?url=${encodeURIComponent(imgUrl)}`;
  }, [imgUrl]);

  // Pre-compute interpolated points for the current t.
  const currentPts = useMemo<Pt[] | null>(() => {
    if (!mesh) return null;
    const out: Pt[] = new Array(mesh.start_pts.length);
    for (let i = 0; i < mesh.start_pts.length; i++) {
      const s = mesh.start_pts[i];
      const tg = mesh.target_pts[i];
      out[i] = { x: s.x + (tg.x - s.x) * t, y: s.y + (tg.y - s.y) * t };
    }
    return out;
  }, [mesh, t]);

  // Render the warp on every change.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !mesh || !imgReady || !currentPts) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    if (t === 0) {
      // No warp — just draw the source image directly.
      ctx.drawImage(img, 0, 0);
      return;
    }

    // The aging.json points are normalised to [0..1] across the image. Some
    // datasets include a padding hint; we treat it as informational and map
    // straight through (mapping with padding produced visibly worse results
    // empirically — landmarks line up against the raw image).
    const sx = (p: Pt) => p.x * W;
    const sy = (p: Pt) => p.y * H;

    for (const tri of mesh.tri_idx) {
      const i = tri.x, j = tri.y, k = tri.z;
      const s0 = mesh.start_pts[i], s1 = mesh.start_pts[j], s2 = mesh.start_pts[k];
      const d0 = currentPts[i],     d1 = currentPts[j],     d2 = currentPts[k];

      const sx0 = sx(s0), sy0 = sy(s0);
      const sx1 = sx(s1), sy1 = sy(s1);
      const sx2 = sx(s2), sy2 = sy(s2);
      const dx0 = sx(d0), dy0 = sy(d0);
      const dx1 = sx(d1), dy1 = sy(d1);
      const dx2 = sx(d2), dy2 = sy(d2);

      // Solve affine [a c e ; b d f] mapping (sxN, syN) → (dxN, dyN).
      // det of the source triangle.
      const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
      if (Math.abs(denom) < 1e-9) continue;

      const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
      const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
      const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom;
      const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
      const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
      const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom;

      ctx.save();
      // Slight inflation prevents single-pixel cracks between adjacent triangles.
      const cx = (dx0 + dx1 + dx2) / 3;
      const cy = (dy0 + dy1 + dy2) / 3;
      const inflate = 0.6;
      ctx.beginPath();
      ctx.moveTo(dx0 + (dx0 - cx > 0 ? inflate : -inflate), dy0 + (dy0 - cy > 0 ? inflate : -inflate));
      ctx.lineTo(dx1 + (dx1 - cx > 0 ? inflate : -inflate), dy1 + (dy1 - cy > 0 ? inflate : -inflate));
      ctx.lineTo(dx2 + (dx2 - cx > 0 ? inflate : -inflate), dy2 + (dy2 - cy > 0 ? inflate : -inflate));
      ctx.closePath();
      ctx.clip();

      ctx.setTransform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx.restore();
    }
  }, [mesh, currentPts, t, imgReady]);

  if (!imgUrl || !meshUrl) {
    return (
      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--ink)] mb-1">Aging morph</h3>
        <p className="text-xs text-[var(--muted)]">
          Front face required (needs both <span className="font-mono">imgDaylight</span> and <span className="font-mono">jsonAging</span>).
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-medium text-[var(--ink)]">Aging morph (predicted)</h3>
        {error && <span className="text-[10px] text-[var(--rose)]">{error}</span>}
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>Now</span>
          <input
            type="range" min={0} max={100} value={Math.round(t * 100)}
            onChange={(e) => setT(parseInt(e.target.value) / 100)}
            className="w-64 accent-amber-400"
          />
          <span>Aged</span>
          <span className="kbd ml-2 w-12 text-center">{Math.round(t * 100)}%</span>
          <button
            type="button"
            onClick={() => setT(t === 0 ? 1 : 0)}
            className="ml-1 px-2 py-0.5 rounded border border-[var(--hairline)] hover:bg-[var(--surface-alt)] text-[10px]"
          >
            {t === 0 ? "Skip to aged" : "Reset"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Reference: the source image */}
        <div className="panel-2 relative aspect-[9/16] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="now" className="absolute inset-0 w-full h-full object-contain" />
          <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-[var(--ink)]">Now</span>
        </div>
        {/* Morphed canvas */}
        <div className="panel-2 relative aspect-[9/16] overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ objectFit: "contain" }}
          />
          <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--amber-soft)] text-[var(--amber)]">Aged + {Math.round(t * 100)}%</span>
          {!imgReady && <span className="text-xs text-[var(--muted)]">loading source image…</span>}
          {imgReady && !mesh && !error && <span className="text-xs text-[var(--muted)]">loading mesh…</span>}
        </div>
      </div>

      <div className="text-[10px] text-[var(--faint)] mt-2">
        {mesh ? `${mesh.start_pts.length} landmarks · ${mesh.tri_idx.length} triangles · padding ${mesh.padding}px (informational)` : "—"}
      </div>
    </div>
  );
}
