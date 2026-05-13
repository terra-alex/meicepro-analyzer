/**
 * Fitzpatrick skin-type resolution.
 *
 * Priority (highest → lowest):
 *  1. Clinician override stored in PatientContext (tierB.fitzpatrickOverride)
 *  2. Algorithm-derived from the front DiagnosisSkin face
 *  3. Self-reported from the customer record
 *  4. Unknown
 *
 * Never silently default to "III" — that is a known source of IPL over-fluence.
 */

import type { DiagnosisSkin, Customer } from "@/lib/types";
import type { PatientContext } from "@/lib/context";

export type FitzpatrickSource =
  | "override"   // clinician-entered in context
  | "algorithm"  // device-derived from front capture
  | "self-report" // from customer.skinType questionnaire
  | "unknown";

export interface ResolvedFitzpatrick {
  /** 1..6, or null when genuinely unknown. */
  value: 1 | 2 | 3 | 4 | 5 | 6 | null;
  source: FitzpatrickSource;
  /** Short display label, e.g. "III (algorithm)" */
  label: string;
}

function clampFitz(n: number | null | undefined): 1 | 2 | 3 | 4 | 5 | 6 | null {
  if (n == null || n < 1 || n > 6 || !Number.isInteger(n)) return null;
  return n as 1 | 2 | 3 | 4 | 5 | 6;
}

function toRoman(n: 1 | 2 | 3 | 4 | 5 | 6): string {
  return ["I", "II", "III", "IV", "V", "VI"][n - 1];
}

export function resolveFitzpatrick(
  face: DiagnosisSkin | null | undefined,
  customer: Customer | null | undefined,
  context: PatientContext | null | undefined,
): ResolvedFitzpatrick {
  // 1. Clinician override
  const override = clampFitz(context?.tierB?.fitzpatrickOverride ?? null);
  if (override != null) {
    return {
      value: override,
      source: "override",
      label: `${toRoman(override)} (override)`,
    };
  }

  // 2. Algorithm-derived from front face
  const algo = clampFitz(face?.skinType ?? null);
  if (algo != null) {
    return {
      value: algo,
      source: "algorithm",
      label: `${toRoman(algo)} (algorithm)`,
    };
  }

  // 3. Self-reported from customer record
  const selfReport = clampFitz(customer?.skinType ?? null);
  if (selfReport != null) {
    return {
      value: selfReport,
      source: "self-report",
      label: `${toRoman(selfReport)} (self-report)`,
    };
  }

  // 4. Unknown — never silently default
  return { value: null, source: "unknown", label: "Unknown" };
}
