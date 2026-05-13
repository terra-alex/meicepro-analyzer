"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DirSeg,
  NavBar,
  PillBtn,
  ReportHeader,
  StatusPill,
  type Direction,
  type ViewKey,
} from "@/components/ds";
import {
  BloodworkScreen,
  CompareScreen,
  EmptyScreen,
  PlanScreen,
  ReportScreen,
  RoiScreen,
  SubstrateScreen,
} from "@/components/screens";
import { ContextModal } from "@/components/ContextModal";
import type { ReportPayload } from "@/lib/types";
import { numField } from "@/lib/util";
import { rememberReport } from "@/lib/recent";
import { loadContext, clearContext, type PatientContext } from "@/lib/context";

type Source = "sample" | "live";
const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

const DIR_TO_NUM: Record<Direction, -1 | 0 | 1> = {
  left: -1,
  front: 0,
  right: 1,
};
const NUM_TO_DIR: Record<-1 | 0 | 1, Direction> = {
  [-1]: "left",
  [0]: "front",
  [1]: "right",
};

interface PersistedView {
  id?: string;
  lang?: string;
  dir?: -1 | 0 | 1;
  base?: string;
  layers?: string;
  cmp?: string;
  cmpLang?: string;
  view?: ViewKey;
}

function readUrl(): PersistedView {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const v = sp.get("view");
  const view = v && ["report", "substrate", "compare", "roi", "bloodwork", "plan"].includes(v)
    ? (v as ViewKey)
    : undefined;
  return {
    id: sp.get("id") ?? undefined,
    lang: sp.get("lang") ?? undefined,
    dir: sp.has("dir") ? (parseInt(sp.get("dir") as string) as -1 | 0 | 1) : undefined,
    base: sp.get("base") ?? undefined,
    layers: sp.get("layers") ?? undefined,
    cmp: sp.get("cmp") ?? undefined,
    cmpLang: sp.get("cmpLang") ?? undefined,
    view,
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
  const [reportId, setReportId] = useState<string>("");
  const [lang, setLang] = useState<string>("en");
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("report");

  // Comparison state
  const [reportB, setReportB] = useState<ReportPayload | null>(null);
  const [reportBId, setReportBId] = useState<string>("");
  const [reportBLang, setReportBLang] = useState<string>("en");
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState<string | null>(null);

  // Patient context (localStorage, keyed by diagnosisId)
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  // ImageStack persistent settings
  const [baseField, setBaseField] = useState<string | undefined>(undefined);
  const [overlays, setOverlays] = useState<
    Record<string, { enabled: boolean; opacity: number; blend: "screen" | "multiply" | "normal" }>
  >({});

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
    if (p.view) setView(p.view);
  }, []);

  const loadLive = useCallback(
    async (id: string, language: string, opts: { skipUrl?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/report/${encodeURIComponent(id)}?lang=${encodeURIComponent(language)}`,
        );
        const data: ReportPayload = await r.json();
        if (data.code !== 200) {
          setError(`API ${data.code}: ${data.message ?? "unknown error"}`);
          return;
        }
        setReport(data);
        setSource("live");
        setReportId(id);
        setLang(language);
        rememberReport(data, language);
        if (!opts.skipUrl) {
          const cur = readUrl();
          writeUrl({ ...cur, id, lang: language });
        }
      } catch (e) {
        setError(`fetch failed: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
        const cur = readUrl();
        // keep view if user navigated already
        writeUrl({ view: cur.view });
      })
      .catch((e) => setError(`failed to load sample: ${(e as Error).message}`))
      .finally(() => setLoading(false));
  }, []);

  const loadCompare = useCallback(
    async (id: string, language: string, opts: { skipUrl?: boolean } = {}) => {
      setLoadingB(true);
      setErrorB(null);
      try {
        const r = await fetch(
          `/api/report/${encodeURIComponent(id)}?lang=${encodeURIComponent(language)}`,
        );
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
    },
    [],
  );

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
    writeUrl({
      ...cur,
      id: reportB.datas.diagnosis.id,
      lang: reportBLang,
      cmp: oldAId,
      cmpLang: oldALang,
    });
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

  // Initial load — once we've parsed the URL.
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
        } catch {
          // Empty state will surface explicitly via no-report below.
        }
      }
      if (p.cmp) {
        loadCompare(p.cmp, p.cmpLang ?? "en", { skipUrl: true });
      }
    }
    go();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL sync for direction / image-stack / view
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
    if (view !== "report") cur.view = view;
    else delete cur.view;
    writeUrl(cur);
  }, [direction, baseField, overlays, view]);

  // Load / refresh context whenever the diagnosis ID changes
  useEffect(() => {
    if (reportId) {
      setPatientContext(loadContext(reportId));
    } else {
      setPatientContext(null);
    }
  }, [reportId]);

  const faces = useMemo(() => {
    if (!report) return [];
    return [...report.datas.diagnosis.diagnosisSkinList].sort(
      (a, b) => a.direction - b.direction,
    );
  }, [report]);

  const dirScores = useMemo(() => {
    const out: Record<Direction, number | null> = { left: null, front: null, right: null };
    for (const f of faces) {
      const k = NUM_TO_DIR[f.direction as -1 | 0 | 1];
      out[k] = Math.round(numField(f, "skinScore") * 100);
    }
    return out;
  }, [faces]);

  const compositeScore = useMemo(() => {
    if (!report) return null;
    return Math.round((report.datas.diagnosis.skinScore ?? 0) * 100);
  }, [report]);

  const currentFace = useMemo(
    () => faces.find((f) => f.direction === direction) ?? faces[0],
    [faces, direction],
  );

  // No report → empty state.
  if (!report) {
    return (
      <div className="flex-1 flex flex-col" style={{ minHeight: "100vh" }}>
        <NavBar
          active={view}
          onChange={setView}
          right={<StatusPill state="live" />}
        />
        <EmptyScreen
          onSubmit={(id, l) => loadLive(id, l)}
          onSample={loadSample}
          loading={loading}
          error={error}
          onPickRecent={(entry) => loadLive(entry.id, entry.lang || "en")}
        />
      </div>
    );
  }

  const cus = report.datas.customer;
  const diag = report.datas.diagnosis;
  const isStale = source === "sample";

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: "100vh" }}>
      <NavBar active={view} onChange={setView} />
      <ReportHeader
        name={cus.cusName || "Subject"}
        subject={`${diag.deviceNo ?? "MC-?"} · ${cus.gender === 1 ? "M" : cus.gender === 0 ? "F" : "—"}${
          cus.birthday ? ` · ${ageFromBirthday(cus.birthday) ?? "—"}` : ""
        }`}
        captured={diag.createTime ?? "—"}
        composite={compositeScore}
        mode={
          /* Plan + Bloodwork are patient-global — direction doesn't apply. */
          view === "plan" || view === "bloodwork" ? null : (
            <DirSeg
              value={NUM_TO_DIR[direction]}
              onChange={(d) => setDirection(DIR_TO_NUM[d])}
              scores={dirScores}
            />
          )
        }
        modeRight={
          <>
            <StatusPill state={isStale ? "stale" : "live"} age={isStale ? "sample" : undefined} />
            <PillBtn sm onClick={() => setContextModalOpen(true)}>
              Context{patientContext && !patientContext.isSampleDefaults ? " ✓" : ""}
            </PillBtn>
            {view !== "compare" && (
              <PillBtn sm onClick={() => setView("compare")}>
                Compare
              </PillBtn>
            )}
            <PillBtn sm onClick={loadSample}>
              Reset
            </PillBtn>
          </>
        }
      />

      {error && (
        <div
          className="mx-7 mt-3"
          style={{
            fontSize: 12,
            color: "var(--rose)",
            background: "var(--rose-soft)",
            border: "1px solid color-mix(in oklch, var(--rose) 25%, transparent)",
            borderRadius: 4,
            padding: "8px 12px",
          }}
        >
          {error}
        </div>
      )}

      {view === "report" && (
        <ReportScreen
          report={report}
          direction={direction}
          baseField={baseField}
          overlays={overlays}
          onImageStackChange={(s) => {
            setBaseField(s.baseField);
            setOverlays(s.overlays);
          }}
        />
      )}
      {view === "substrate" && (
        <SubstrateScreen
          face={currentFace}
          direction={direction}
          patientContext={patientContext}
          gender={diag.customerQueryResponse?.gender ?? report.datas.customer.gender}
          onContextChange={(ctx) => setPatientContext(ctx)}
          diagId={reportId}
        />
      )}
      {view === "compare" && (
        <CompareScreen
          a={report}
          b={reportB}
          loading={loadingB}
          error={errorB}
          direction={direction}
          onLoad={loadCompare}
          onSwap={swapAB}
          onClear={clearCompare}
        />
      )}
      {view === "roi" && <RoiScreen face={currentFace} direction={direction} />}
      {view === "bloodwork" && <BloodworkScreen />}
      {view === "plan" && <PlanScreen />}

      <footer
        className="px-7 py-4"
        style={{
          fontSize: 10.5,
          color: "var(--faint)",
          borderTop: "1px solid var(--hairline-2)",
          marginTop: "auto",
        }}
      >
        Data via{" "}
        <span className="font-mono-fine" style={{ color: "var(--muted)" }}>
          /meicepro-api/open/diagnosis/get/{reportId}/{lang}
        </span>{" "}
        · proxied through{" "}
        <span className="font-mono-fine" style={{ color: "var(--muted)" }}>
          /api/report/[id]
        </span>{" "}
        · images via{" "}
        <span className="font-mono-fine" style={{ color: "var(--muted)" }}>
          /api/img
        </span>
      </footer>

      {contextModalOpen && (
        <ContextModal
          diagId={reportId}
          chiefComplaintDefault={diag.customerQueryResponse?.diagnosisCc ?? report.datas.customer.diagnosisCc ?? ""}
          isSample={isStale}
          onClose={() => setContextModalOpen(false)}
          onSave={(ctx) => setPatientContext(ctx)}
        />
      )}
    </div>
  );
}

function ageFromBirthday(s: string): number | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center"
          style={{ minHeight: "100vh", color: "var(--muted)" }}
        >
          Loading…
        </div>
      }
    >
      <PageInner />
    </Suspense>
  );
}
