"use client";

/**
 * Contextual inline prompt shown under a ZoneVerdict when a Tier A flag
 * becomes relevant. Lets the clinician confirm/deny without leaving the screen.
 *
 * Prompts do NOT automatically change the verdict — they save the flag and
 * the parent re-runs useSubstrateVerdicts with the updated context.
 */

import { t } from "@/components/ds";
import type { PatientContext, TierA } from "@/lib/context";
import type { ZoneVerdict } from "@/lib/clinical/types";

export type ContextPromptDef = {
  id: string;
  question: string;
  why: string;
  flagKey: keyof TierA;
};

/**
 * Compute which prompts are relevant for a given verdict + gender.
 * Returns an empty array when no contextual prompts apply.
 */
export function relevantPrompts(
  v: ZoneVerdict,
  gender: number | null | undefined,
  ctx: PatientContext | null,
): ContextPromptDef[] {
  const prompts: ContextPromptDef[] = [];
  const isPeriorbital = v.zone === "periorbitalL" || v.zone === "periorbitalR";
  const isMalarZone =
    v.zone === "leftCheekUpperMedial" || v.zone === "rightCheekUpperMedial";
  const isFemaleOrUnknown = gender == null || gender === 0;

  // Hemosiderin periorbital → Valsalva prompt
  if (v.substrate === "hemosiderin" && isPeriorbital) {
    if (!ctx?.tierA.valsalvaHx) {
      prompts.push({
        id: "valsalvaHx",
        question: "Does this patient have a history of Valsalva-raising activities?",
        why: "Recurrent vomiting, heavy weight-training, chronic coughing or eating-disorder history raise the prior for periorbital hemosiderin. Documenting this upgrades the evidence score.",
        flagKey: "valsalvaHx",
      });
    }
    if (!ctx?.tierA.hfeKnownOrFerritinHigh) {
      prompts.push({
        id: "hfeKnownOrFerritinHigh",
        question: "Known HFE mutation or elevated serum ferritin?",
        why: "Hereditary haemochromatosis variants and chronic iron-overload states promote periorbital hemosiderin deposition. Labs first recommended before Nd:YAG.",
        flagKey: "hfeKnownOrFerritinHigh",
      });
    }
  }

  // Diffuse-malar melanin_melasma in female (or unknown gender) → hormonal prompts
  if (
    (v.substrate === "melanin_melasma" || v.substrate === "melanin_pih") &&
    isMalarZone &&
    isFemaleOrUnknown
  ) {
    if (!ctx?.tierA.pregnancy) {
      prompts.push({
        id: "pregnancy",
        question: "Is the patient currently pregnant?",
        why: "Pregnancy markedly raises the melasma prior via oestrogen-driven MSH elevation. This also modifies which interventions are safe to recommend.",
        flagKey: "pregnancy",
      });
    }
    if (!ctx?.tierA.hormonalContraception) {
      prompts.push({
        id: "hormonalContraception",
        question: "Currently on hormonal contraception (OCP, levonorgestrel IUD)?",
        why: "Hormonal contraception raises melasma prior through the same MSH pathway as pregnancy. Often the single biggest modifiable driver.",
        flagKey: "hormonalContraception",
      });
    }
  }

  // Any melanin verdict → recent sun exposure prompt
  if (v.substrate.startsWith("melanin") && !ctx?.tierA.recentSunExposure14d) {
    prompts.push({
      id: "recentSunExposure14d",
      question: "Sun exposure in the last 14 days?",
      why: "Transient melanin inflation from recent UV exposure can make the brownMap read appear more severe. A 4-week wash-out is recommended before using this as a treatment baseline.",
      flagKey: "recentSunExposure14d",
    });
  }

  return prompts;
}

export function ContextPromptCard({
  prompt,
  onConfirm,
  onDeny,
}: {
  prompt: ContextPromptDef;
  onConfirm: () => void;
  onDeny: () => void;
}) {
  return (
    <div
      style={{
        background: t.amberSoft,
        border: `1px solid color-mix(in oklch, ${t.amber} 30%, transparent)`,
        borderRadius: 5,
        padding: "12px 14px",
        marginTop: 8,
      }}
    >
      <div
        className="font-mono-fine uppercase"
        style={{ fontSize: 9.5, letterSpacing: "0.1em", color: t.amber, marginBottom: 6 }}
      >
        Context · prior adjustment
      </div>
      <div style={{ fontSize: 12.5, color: t.ink, fontWeight: 500, marginBottom: 4 }}>
        {prompt.question}
      </div>
      <div style={{ fontSize: 11, color: t.ink2, lineHeight: 1.45, marginBottom: 10 }}>
        {prompt.why}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          style={{
            padding: "5px 12px",
            borderRadius: 4,
            border: `1px solid ${t.amber}`,
            background: t.amber,
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Yes — apply
        </button>
        <button
          type="button"
          onClick={onDeny}
          style={{
            padding: "5px 12px",
            borderRadius: 4,
            border: `1px solid ${t.hairline}`,
            background: t.surface,
            color: t.ink2,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          No
        </button>
      </div>
    </div>
  );
}
