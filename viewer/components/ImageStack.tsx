"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LAYERS, type LayerSpec } from "@/lib/constants";
import type { DiagnosisSkin } from "@/lib/types";
import { stringField } from "@/lib/util";

interface OverlayState {
  enabled: boolean;
  opacity: number; // 0..1
  blend: "screen" | "multiply" | "normal";
}

interface Props {
  face: DiagnosisSkin;
  // Optional: persist active layers / base across direction switches via lifted state.
  initialBase?: string;
  initialOverlays?: Record<string, OverlayState>;
  onChange?: (s: { baseField: string; overlays: Record<string, OverlayState> }) => void;
  // Optional render-prop for an extra panel above the layer controls (used by the morph).
  extraPanel?: React.ReactNode;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

export default function ImageStack({ face, initialBase, initialOverlays, onChange, extraPanel }: Props) {
  // Only show layers where the URL is actually present on this direction.
  const available = useMemo(() => {
    return LAYERS.map((l) => ({ spec: l, url: stringField(face, l.field as string) }))
      .filter((x): x is { spec: LayerSpec; url: string } => !!x.url);
  }, [face]);

  const bases = available.filter((x) => x.spec.kind === "base");
  const heatmaps = available.filter((x) => x.spec.kind === "heatmap");
  const overlays = available.filter((x) => x.spec.kind === "overlay");

  const [baseField, setBaseField] = useState<string>(() => {
    if (initialBase && bases.some((b) => b.spec.field === initialBase)) return initialBase;
    return bases[0]?.spec.field as string;
  });
  const [overlayState, setOverlayState] = useState<Record<string, OverlayState>>(initialOverlays ?? {});

  // Tell parent on every change so URL state can sync.
  useEffect(() => {
    onChange?.({ baseField, overlays: overlayState });
    // Don't depend on onChange identity — only emit when content actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseField, overlayState]);

  const baseUrl = bases.find((b) => b.spec.field === baseField)?.url ?? bases[0]?.url ?? null;

  // Pan + zoom — kept in image-coordinate units so wheel-zoom-toward-cursor is stable.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);

  // Reset zoom/pan when the base image changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImgDim(null);
  }, [baseUrl]);

  // Drag-to-pan
  const drag = useRef<{ active: boolean; startX: number; startY: number; basePan: { x: number; y: number } }>({
    active: false, startX: 0, startY: 0, basePan: { x: 0, y: 0 },
  });

  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, basePan: pan };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setPan({ x: drag.current.basePan.x + dx, y: drag.current.basePan.y + dy });
  }
  function endDrag() { drag.current.active = false; }

  // Native wheel listener (passive: false so we can preventDefault).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      const rect = el!.getBoundingClientRect();
      const cx = ev.clientX - rect.left - rect.width / 2;
      const cy = ev.clientY - rect.top - rect.height / 2;
      const factor = Math.exp(-ev.deltaY * 0.0015);
      setZoom((z) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor));
        // Keep the point under the cursor stationary in image space.
        const ratio = next / z;
        setPan((p) => ({
          x: cx + (p.x - cx) * ratio,
          y: cy + (p.y - cy) * ratio,
        }));
        return next;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function bumpZoom(by: number) {
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * by)));
  }

  function toggle(field: string, defaults: Partial<OverlayState> = {}) {
    setOverlayState((s) => {
      const cur = s[field];
      if (cur?.enabled) {
        return { ...s, [field]: { ...cur, enabled: false } };
      }
      return {
        ...s,
        [field]: {
          enabled: true,
          opacity: cur?.opacity ?? defaults.opacity ?? 0.7,
          blend: cur?.blend ?? defaults.blend ?? "screen",
        },
      };
    });
  }

  function setOpacity(field: string, opacity: number) {
    setOverlayState((s) => ({ ...s, [field]: { ...(s[field] ?? { enabled: true, blend: "screen" }), enabled: true, opacity } }));
  }
  function setBlend(field: string, blend: OverlayState["blend"]) {
    setOverlayState((s) => ({ ...s, [field]: { ...(s[field] ?? { enabled: true, opacity: 0.7 }), enabled: true, blend } }));
  }

  const activeOverlays = available.filter((x) => x.spec.kind !== "base" && overlayState[x.spec.field as string]?.enabled);

  // Stage aspect = image aspect when known, else 9/16 portrait fallback.
  const aspect = imgDim ? imgDim.w / imgDim.h : 9 / 16;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-3 h-full">
      {/* Image stage */}
      <div
        ref={stageRef}
        className="panel relative overflow-hidden select-none"
        style={{ aspectRatio: aspect, minHeight: 480 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {baseUrl ? (
          <div
            className="absolute inset-0 origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (drag.current.active ? "grabbing" : "grab") : "default",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={baseUrl}
              alt="base"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              className="absolute inset-0 w-full h-full object-contain layer-blend-normal pointer-events-none"
            />
            {activeOverlays.map(({ spec, url }) => {
              const st = overlayState[spec.field as string]!;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={spec.field as string}
                  src={url}
                  alt={spec.label}
                  draggable={false}
                  className={`absolute inset-0 w-full h-full object-contain pointer-events-none layer-blend-${st.blend}`}
                  style={{ opacity: st.opacity }}
                />
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">No image for this direction</div>
        )}

        {/* Zoom controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1 bg-black/40 rounded-md p-1">
          <button onClick={() => bumpZoom(1.3)} className="px-2 text-sm hover:bg-white/10 rounded">＋</button>
          <button onClick={reset} className="px-2 text-[10px] hover:bg-white/10 rounded font-mono">{zoom.toFixed(1)}×</button>
          <button onClick={() => bumpZoom(1 / 1.3)} className="px-2 text-sm hover:bg-white/10 rounded">−</button>
        </div>

        {/* Pan hint */}
        {zoom > 1 && (
          <div className="absolute left-3 top-3 text-[10px] text-white/40 bg-black/40 px-1.5 py-0.5 rounded">
            drag to pan · scroll to zoom
          </div>
        )}

        {/* Active overlay legend */}
        {activeOverlays.length > 0 && (
          <div className="absolute left-3 bottom-3 flex flex-wrap gap-1 max-w-[60%]">
            {activeOverlays.map(({ spec }) => (
              <span key={spec.field as string} className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-100">
                {spec.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Layer controls */}
      <div className="panel-2 p-3 overflow-y-auto max-h-[680px]">
        {extraPanel}
        <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Base photo</div>
        <select
          value={baseField}
          onChange={(e) => setBaseField(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm mb-3"
        >
          {bases.map((b) => (
            <option key={b.spec.field as string} value={b.spec.field as string}>{b.spec.label}</option>
          ))}
        </select>

        <Section title="Heatmaps" items={heatmaps} state={overlayState} onToggle={toggle} onOpacity={setOpacity} onBlend={setBlend} defaultBlend="screen" />
        <Section title="Detection masks" items={overlays} state={overlayState} onToggle={toggle} onOpacity={setOpacity} onBlend={setBlend} defaultBlend="normal" />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  state,
  onToggle,
  onOpacity,
  onBlend,
  defaultBlend,
}: {
  title: string;
  items: { spec: LayerSpec; url: string }[];
  state: Record<string, OverlayState>;
  onToggle: (f: string, d?: Partial<OverlayState>) => void;
  onOpacity: (f: string, o: number) => void;
  onBlend: (f: string, b: OverlayState["blend"]) => void;
  defaultBlend: OverlayState["blend"];
}) {
  if (items.length === 0) return null;
  const groups = items.reduce<Record<string, { spec: LayerSpec; url: string }[]>>((acc, it) => {
    (acc[it.spec.group] ??= []).push(it);
    return acc;
  }, {});
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">{title}</div>
      {Object.entries(groups).map(([g, list]) => (
        <div key={g} className="mb-2">
          <div className="text-[10px] text-white/40 mb-0.5">{g}</div>
          {list.map(({ spec }) => {
            const st = state[spec.field as string];
            const enabled = !!st?.enabled;
            return (
              <div key={spec.field as string} className="mb-1.5">
                <button
                  onClick={() => onToggle(spec.field as string, { blend: defaultBlend })}
                  className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1 rounded transition ${enabled ? "bg-cyan-500/20 text-cyan-100" : "hover:bg-white/5 text-white/70"}`}
                  title={spec.hint ?? spec.label}
                >
                  <span className={`w-2 h-2 rounded-sm ${enabled ? "bg-cyan-400" : "bg-white/20"}`} />
                  <span className="flex-1 truncate">{spec.label}</span>
                </button>
                {enabled && (
                  <div className="pl-4 mt-1 flex items-center gap-2">
                    <input
                      type="range" min={0} max={100} value={Math.round((st.opacity ?? 0.7) * 100)}
                      onChange={(e) => onOpacity(spec.field as string, parseInt(e.target.value) / 100)}
                      className="flex-1 accent-cyan-400"
                    />
                    <select
                      value={st.blend}
                      onChange={(e) => onBlend(spec.field as string, e.target.value as OverlayState["blend"])}
                      className="bg-black/30 border border-white/10 rounded text-[10px] px-1 py-0.5"
                    >
                      <option value="screen">screen</option>
                      <option value="multiply">multiply</option>
                      <option value="normal">normal</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
