"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ImageStack from "@/components/ImageStack";
import MetricStrip from "@/components/MetricStrip";
import RadarChart from "@/components/RadarChart";
import WrinkleFaceMap from "@/components/WrinkleFaceMap";
import AsymmetryView from "@/components/AsymmetryView";
import SeverityMatrix from "@/components/SeverityMatrix";
import AdviceCards from "@/components/AdviceCards";
import RawInspector from "@/components/RawInspector";
import AgingMorph from "@/components/AgingMorph";
import ComparePanel from "@/components/ComparePanel";
import { DIRECTION_NAME } from "@/lib/constants";
import type { ReportPayload } from "@/lib/types";

type Source = "sample" | "live";
const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

interface PersistedView {
  id?: string;
  lang?: string;
  dir?: -1 | 0 | 1;
  base?: string;
  layers?: string;     // comma-separated overlay field names
  cmp?: string;        // compare-to id
  cmpLang?: string;
}

function readUrl(): PersistedView {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    id: sp.get("id") ?? undefined,
    lang: sp.get("lang") ?? undefined,
    dir: sp.has("dir") ? (parseInt(sp.get("dir") as string) as -1 | 0 | 1) : undefined,
    base: sp.get("base") ?? undefined,
    layers: sp.get("layers") ?? undefined,
    cmp: sp.get("cmp") ?? undefined,
    cmpLang: sp.get("cmpLang") ?? undefined,
  };
}
function writeUrl(p: PersistedView) {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (next !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, "", next);
  }
}

function PageInner() {
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [source, setSource] = useState<Source>("sample");
  const [reportId, setReportId] = useState<string>(SAMPLE_ID);
  const [lang, setLang] = useState<string>("en");
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison state
  const [reportB, setReportB] = useState<ReportPayload | null>(null);
  const [reportBId, setReportBId] = useState<string>("");
  const [reportBLang, setReportBLang] = useState<string>("en");
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState<string | null>(null);

  // ImageStack persistent settings (lifted so they survive direction switches and URL state)
  const [baseField, setBaseField] = useState<string | undefined>(undefined);
  const [overlays, setOverlays] = useState<Record<string, { enabled: boolean; opacity: number; blend: "screen" | "multiply" | "normal" }>>({});

  // First-mount: read URL.
  const initialRead = useRef(false);
  useEffect(() => {
    if (initialRead.current) return;
    initialRead.current = true;
    const p = readUrl();
    if (p.id) setReportId(p.id);
    if (p.lang) setLang(p.lang);
    if (p.dir != null) setDirection(p.dir);
    if (p.base) setBaseField(p.base);
    if (p.layers) {
      const ov: typeof overlays = {};
      for (const item of p.layers.split(",")) {
        if (!item) continue;
        const [field, opStr] = item.split(":");
        const op = opStr ? Math.max(0, Math.min(1, parseFloat(opStr))) : 0.7;
        ov[field] = { enabled: true, opacity: op, blend: "screen" };
      }
      setOverlays(ov);
    }
    if (p.cmp) setReportBId(p.cmp);
    if (p.cmpLang) setReportBLang(p.cmpLang);
  }, []);

  // Initial load: if URL has id, fetch live; otherwise sample.
  useEffect(() => {
    if (!initialRead.current) return;
    const p = readUrl();
    let cancel = false;
    async function go() {
      if (p.id && p.id !== SAMPLE_ID) {
        await loadLive(p.id, p.lang ?? "en", { skipUrl: true });
      } else {
        try {
          const r = await fetch("/sample-report.json");
          const data: ReportPayload = await r.json();
          if (cancel) return;
          setReport(data);
          setSource("sample");
          setReportId(data.datas.diagnosis.id);
        } catch (e) {
          setError(`failed to load sample: ${(e as Error).message}`);
        }
      }
      if (p.cmp) {
        loadCompare(p.cmp, p.cmpLang ?? "en", { skipUrl: true });
      }
    }
    go();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLive = useCallback(async (id: string, language: string, opts: { skipUrl?: boolean } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/report/${encodeURIComponent(id)}?lang=${encodeURIComponent(language)}`);
      const data: ReportPayload = await r.json();
      if (data.code !== 200) {
        setError(`API ${data.code}: ${data.message ?? "unknown error"}`);
        return;
      }
      setReport(data);
      setSource("live");
      setReportId(id);
      setLang(language);
      if (!opts.skipUrl) {
        const cur = readUrl();
        writeUrl({ ...cur, id, lang: language });
      }
    } catch (e) {
      setError(`fetch failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSample = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/sample-report.json")
      .then((r) => r.json())
      .then((data: ReportPayload) => {
        setReport(data);
        setSource("sample");
        setReportId(data.datas.diagnosis.id);
        setLang("en");
        writeUrl({});
      })
      .finally(() => setLoading(false));
  }, []);

  const loadCompare = useCallback(async (id: string, language: string, opts: { skipUrl?: boolean } = {}) => {
    setLoadingB(true);
    setErrorB(null);
    try {
      const r = await fetch(`/api/report/${encodeURIComponent(id)}?lang=${encodeURIComponent(language)}`);
      const data: ReportPayload = await r.json();
      if (data.code !== 200) {
        setErrorB(`API ${data.code}: ${data.message ?? "unknown error"}`);
        return;
      }
      setReportB(data);
      setReportBId(id);
      setReportBLang(language);
      if (!opts.skipUrl) {
        const cur = readUrl();
        writeUrl({ ...cur, cmp: id, cmpLang: language });
      }
    } catch (e) {
      setErrorB(`fetch failed: ${(e as Error).message}`);
    } finally {
      setLoadingB(false);
    }
  }, []);

  const swapAB = useCallback(() => {
    if (!reportB) return;
    const oldA = report;
    const oldAId = reportId;
    const oldALang = lang;
    setReport(reportB);
    setReportId(reportB.datas.diagnosis.id);
    setLang(reportBLang);
    setSource("live");
    if (oldA) {
      setReportB(oldA);
      setReportBId(oldAId);
      setReportBLang(oldALang);
    }
    const cur = readUrl();
    writeUrl({ ...cur, id: reportB.datas.diagnosis.id, lang: reportBLang, cmp: oldAId, cmpLang: oldALang });
  }, [report, reportB, reportId, lang, reportBLang]);

  const clearCompare = useCallback(() => {
    setReportB(null);
    setReportBId("");
    setErrorB(null);
    const cur = readUrl();
    delete cur.cmp;
    delete cur.cmpLang;
    writeUrl(cur);
  }, []);

  // URL sync for direction / image-stack state
  useEffect(() => {
    if (!initialRead.current) return;
    const cur = readUrl();
    cur.dir = direction;
    if (baseField) cur.base = baseField;
    const enabled = Object.entries(overlays)
      .filter(([, v]) => v.enabled)
      .map(([k, v]) => `${k}:${v.opacity.toFixed(2)}`);
    if (enabled.length) cur.layers = enabled.join(",");
    else delete cur.layers;
    writeUrl(cur);
  }, [direction, baseField, overlays]);

  const faces = useMemo(() => {
    if (!report) return [];
    return [...report.datas.diagnosis.diagnosisSkinList].sort((a, b) => a.direction - b.direction);
  }, [report]);

  const currentFace = useMemo(() => {
    return faces.find((f) => f.direction === direction) ?? faces[0];
  }, [faces, direction]);

  const frontFace = useMemo(() => faces.find((f) => f.direction === 0) ?? null, [faces]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        {error ?? "Loading sample report…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <Header
        customer={report.datas.customer}
        diagnosis={report.datas.diagnosis}
        reportId={reportId}
        lang={lang}
        source={source}
        onLoadId={loadLive}
        onLoadSample={loadSample}
        loading={loading}
      />

      {error && (
        <div className="max-w-[1600px] mx-auto px-4 mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">{error}</div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {/* direction picker */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/50">Direction:</span>
          {faces.map((f) => (
            <button
              key={f.id}
              onClick={() => setDirection(f.direction)}
              className={`px-3 py-1 rounded-full border transition ${
                f.direction === direction
                  ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-100"
                  : "border-white/10 hover:bg-white/5 text-white/70"
              }`}
            >
              {DIRECTION_NAME[f.direction]}
              <span className="ml-1.5 text-[10px] text-white/40">{Math.round(f.skinScore * 100)}</span>
            </button>
          ))}
          <span className="ml-auto text-white/40">
            Captured: <span className="font-mono">{report.datas.diagnosis.directions}</span> (front | right | left bitmask)
          </span>
        </div>

        {/* current-direction metric strip */}
        <MetricStrip face={currentFace} />

        {/* main split: image viewer + analysis panels */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(380px,1fr)] gap-4">
          <ImageStack
            key={currentFace.id}
            face={currentFace}
            initialBase={baseField}
            initialOverlays={overlays}
            onChange={(s) => {
              setBaseField(s.baseField);
              setOverlays(s.overlays);
            }}
          />
          <div className="space-y-4">
            <RadarChart faces={faces} />
            {frontFace && <WrinkleFaceMap face={frontFace} />}
            <AsymmetryView faces={faces} />
          </div>
        </div>

        {/* Aging morph (only if front face has the assets) */}
        {frontFace && frontFace.jsonAging && frontFace.imgDaylight && (
          <AgingMorph face={frontFace} />
        )}

        {/* full-width severity matrix */}
        <SeverityMatrix faces={faces} />

        {/* Compare to another report */}
        <ComparePanel
          a={report}
          b={reportB}
          loading={loadingB}
          error={errorB}
          direction={direction}
          onLoad={loadCompare}
          onSwap={swapAB}
          onClear={clearCompare}
        />

        {report.datas.symptomDescList.length > 0 && (
          <AdviceCards list={report.datas.symptomDescList} />
        )}

        <RawInspector data={report} />

        <footer className="text-[10px] text-white/30 py-4 border-t border-white/5">
          Data sourced via <span className="font-mono">/meicepro-api/open/diagnosis/get/{reportId}/{lang}</span> · proxied through{" "}
          <span className="font-mono">/api/report/[id]</span> · images via <span className="font-mono">/api/img</span>
        </footer>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/60">Loading…</div>}>
      <PageInner />
    </Suspense>
  );
}
