/**
 * Patient context — localStorage CRUD keyed by diagnosisId.
 * All data is PII. Never log, never sync off-device.
 * Storage key: meicepro:context:<diagnosisId>
 */

export interface TierA {
  /** Recurrent Valsalva-raising activity (vomiting, heavy lift, eating-disorder hx) */
  valsalvaHx: boolean;
  /** Current pregnancy */
  pregnancy: boolean;
  /** Hormonal contraception (OCP, levonorgestrel IUD, etc.) */
  hormonalContraception: boolean;
  /** Known HFE mutation or documented ferritin elevation */
  hfeKnownOrFerritinHigh: boolean;
  /** Sun exposure within last 14 days */
  recentSunExposure14d: boolean;
  /**
   * Free-text chief complaint. Auto-populated from diagnosis.diagnosisCc when
   * available, but clinician may edit it here.
   */
  chiefComplaintNotes: string;
}

export interface TierB {
  /**
   * Clinician Fitzpatrick override (1..6). null = use API-derived value.
   * When set, this takes precedence over algorithm + self-report.
   */
  fitzpatrickOverride: 1 | 2 | 3 | 4 | 5 | 6 | null;
  /** Currently on oral isotretinoin */
  currentIsotretinoin: boolean;
  /** Personal or family history of keloid scarring */
  keloidHx: boolean;
  /** Any procedure (energy/injection/ablative) performed in the last 6 weeks */
  procedureLast6Weeks: boolean;
  /** Current anticoagulants (warfarin, NOAC, high-dose aspirin, heparin) */
  anticoagulants: boolean;
  /**
   * Active acne in one or more anatomical zones.
   * Values are ZoneKey strings; empty array = none.
   */
  activeAcneInZone: string[];
  /** Active rosacea flare (not in remission) */
  activeRosaceaFlare: boolean;
}

export interface PatientContext {
  tierA: TierA;
  tierB: TierB;
  /** ISO-8601 UTC timestamp of last save */
  capturedAt: string;
  /**
   * When true this context was pre-populated with sample defaults and
   * the clinician has not yet reviewed it.
   */
  isSampleDefaults?: boolean;
}

function storageKey(diagId: string): string {
  return `meicepro:context:${diagId}`;
}

export function loadContext(diagId: string): PatientContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(diagId));
    if (!raw) return null;
    return JSON.parse(raw) as PatientContext;
  } catch {
    return null;
  }
}

export function saveContext(diagId: string, ctx: PatientContext): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(diagId), JSON.stringify(ctx));
  } catch {
    // Silently fail — storage quota or private browsing
  }
}

export function clearContext(diagId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(diagId));
  } catch {
    // ignore
  }
}

/** Default TierA — all flags off. chiefComplaint will be set from API at call site. */
export function defaultTierA(chiefComplaintNotes = ""): TierA {
  return {
    valsalvaHx: false,
    pregnancy: false,
    hormonalContraception: false,
    hfeKnownOrFerritinHigh: false,
    recentSunExposure14d: false,
    chiefComplaintNotes,
  };
}

/** Default TierB — all flags off, no override. */
export function defaultTierB(): TierB {
  return {
    fitzpatrickOverride: null,
    currentIsotretinoin: false,
    keloidHx: false,
    procedureLast6Weeks: false,
    anticoagulants: false,
    activeAcneInZone: [],
    activeRosaceaFlare: false,
  };
}

/** Sample-mode defaults — reasonable baseline for demo; flagged as unreviewed. */
export function sampleDefaults(diagId: string): PatientContext {
  return {
    tierA: defaultTierA("Sample context — not a real patient record."),
    tierB: defaultTierB(),
    capturedAt: new Date().toISOString(),
    isSampleDefaults: true,
  };
}
