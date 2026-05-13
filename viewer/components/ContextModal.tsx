"use client";

/**
 * Pre-scan context checklist modal.
 *
 * Covers the highest-stakes Tier B items + free-text chief complaint (Tier A).
 * Stored locally via lib/context.ts — never logged, never synced off-device.
 */

import { useEffect, useRef, useState } from "react";
import { MockBadge, PillBtn, t } from "@/components/ds";
import {
  defaultTierA,
  defaultTierB,
  loadContext,
  saveContext,
  type PatientContext,
  type TierB,
} from "@/lib/context";

const ZONE_OPTIONS = [
  { key: "periorbitalL", label: "Left periorbital" },
  { key: "periorbitalR", label: "Right periorbital" },
  { key: "leftCheekUpperMedial", label: "Left cheek" },
  { key: "rightCheekUpperMedial", label: "Right cheek" },
  { key: "nose", label: "Nose" },
  { key: "chin", label: "Chin" },
  { key: "forehead", label: "Forehead" },
];

const FITZ_OPTIONS: { value: 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 1, label: "I — Always burns, never tans" },
  { value: 2, label: "II — Usually burns, tans minimally" },
  { value: 3, label: "III — Sometimes burns, tans uniformly" },
  { value: 4, label: "IV — Burns minimally, always tans" },
  { value: 5, label: "V — Rarely burns, tans profusely" },
  { value: 6, label: "VI — Never burns, deeply pigmented" },
];

export function ContextModal({
  diagId,
  chiefComplaintDefault,
  isSample,
  onClose,
  onSave,
}: {
  diagId: string;
  chiefComplaintDefault?: string;
  isSample?: boolean;
  onClose: () => void;
  onSave: (ctx: PatientContext) => void;
}) {
  const initialCtx = loadContext(diagId);

  const [chiefComplaint, setChiefComplaint] = useState(
    initialCtx?.tierA.chiefComplaintNotes ?? chiefComplaintDefault ?? "",
  );
  const [tierB, setTierB] = useState<TierB>(
    initialCtx?.tierB ?? defaultTierB(),
  );

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setBool(field: keyof TierB, val: boolean) {
    setTierB((prev) => ({ ...prev, [field]: val }));
  }

  function toggleZone(zone: string) {
    setTierB((prev) => {
      const exists = prev.activeAcneInZone.includes(zone);
      return {
        ...prev,
        activeAcneInZone: exists
          ? prev.activeAcneInZone.filter((z) => z !== zone)
          : [...prev.activeAcneInZone, zone],
      };
    });
  }

  function handleSave() {
    const ctx: PatientContext = {
      tierA: {
        ...defaultTierA(chiefComplaint),
        chiefComplaintNotes: chiefComplaint,
      },
      tierB,
      capturedAt: new Date().toISOString(),
      isSampleDefaults: false,
    };
    saveContext(diagId, ctx);
    onSave(ctx);
    onClose();
  }

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        style={{
          background: t.bg,
          border: `1px solid ${t.hairline}`,
          borderRadius: 8,
          width: "min(680px, 96vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${t.hairline}`,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div
              className="uppercase font-medium mb-1"
              style={{ fontSize: 10.5, letterSpacing: "0.12em", color: t.muted }}
            >
              Pre-scan checklist
            </div>
            <div
              className="font-serif-display"
              style={{ fontSize: 26, color: t.ink, lineHeight: 1.1 }}
            >
              Clinical context
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSample && <MockBadge>Sample defaults — review</MockBadge>}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.muted,
                fontSize: 20,
                lineHeight: 1,
                padding: "4px 8px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 12, color: t.ink2, lineHeight: 1.55, marginBottom: 20 }}>
            Stored locally only — never transmitted. Flags modify displayed prior
            probability labels; they do not autonomously change treatment decisions.
          </p>

          {/* Chief complaint (Tier A — auto-populated from API) */}
          <Section title="Chief complaint" kicker="Tier A · carries forward to substrate">
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 6 }}>
                Free text — populated from scan record if available
              </div>
              <textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  background: t.surface,
                  border: `1px solid ${t.hairline}`,
                  borderRadius: 4,
                  padding: "8px 10px",
                  fontSize: 13,
                  color: t.ink,
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                placeholder="Petechiae, bruising, intermittent swelling…"
              />
            </label>
          </Section>

          {/* Tier B — highest-stakes items */}
          <Section title="Safety flags" kicker="Tier B · gates recommendations">
            <div className="grid gap-3">
              <CheckRow
                label="Current isotretinoin"
                sub="Contraindicates ablative and most non-ablative laser"
                checked={tierB.currentIsotretinoin}
                onChange={(v) => setBool("currentIsotretinoin", v)}
              />
              <CheckRow
                label="Keloid or hypertrophic scar history"
                sub="Gates any skin-breaking or ablative procedure"
                checked={tierB.keloidHx}
                onChange={(v) => setBool("keloidHx", v)}
              />
              <CheckRow
                label="Procedure in last 6 weeks"
                sub="Energy, injection, or ablative — defer all recommendations"
                checked={tierB.procedureLast6Weeks}
                onChange={(v) => setBool("procedureLast6Weeks", v)}
              />
              <CheckRow
                label="Current anticoagulants"
                sub="Warfarin, NOAC, high-dose aspirin, heparin — modify bruise risk"
                checked={tierB.anticoagulants}
                onChange={(v) => setBool("anticoagulants", v)}
              />
              <CheckRow
                label="Active rosacea flare"
                sub="Defer energy until quiescent — bloodmap readings unreliable"
                checked={tierB.activeRosaceaFlare}
                onChange={(v) => setBool("activeRosaceaFlare", v)}
              />
            </div>
          </Section>

          {/* Active acne zones */}
          <Section title="Active acne zones" kicker="Tier B · treat acne first; defer IPL">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              {ZONE_OPTIONS.map((z) => {
                const on = tierB.activeAcneInZone.includes(z.key);
                return (
                  <button
                    key={z.key}
                    type="button"
                    onClick={() => toggleZone(z.key)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 4,
                      border: on
                        ? `1.5px solid ${t.clay}`
                        : `1px solid ${t.hairline}`,
                      background: on ? t.claySoft : t.surface,
                      color: on ? t.clay : t.ink2,
                      fontSize: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: on ? 500 : 400,
                    }}
                  >
                    {z.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Fitzpatrick override */}
          <Section title="Fitzpatrick override" kicker="Tier B · overrides API + algorithm">
            <div style={{ fontSize: 11.5, color: t.ink2, marginBottom: 10, lineHeight: 1.45 }}>
              Leave unset to use the device-derived or self-reported value.
              Only override if you have a clinical reason — e.g. visibly inconsistent self-report.
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button
                type="button"
                onClick={() => setTierB((p) => ({ ...p, fitzpatrickOverride: null }))}
                style={{
                  padding: "7px 10px",
                  borderRadius: 4,
                  border: tierB.fitzpatrickOverride === null
                    ? `1.5px solid ${t.teal}`
                    : `1px solid ${t.hairline}`,
                  background: tierB.fitzpatrickOverride === null ? t.tealSoft : t.surface,
                  color: tierB.fitzpatrickOverride === null ? t.teal : t.ink2,
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  gridColumn: "1 / -1",
                  fontWeight: tierB.fitzpatrickOverride === null ? 500 : 400,
                }}
              >
                Use API value (recommended)
              </button>
              {FITZ_OPTIONS.map((opt) => {
                const on = tierB.fitzpatrickOverride === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setTierB((p) => ({
                        ...p,
                        fitzpatrickOverride: on ? null : opt.value,
                      }))
                    }
                    style={{
                      padding: "7px 10px",
                      borderRadius: 4,
                      border: on
                        ? `1.5px solid ${t.clay}`
                        : `1px solid ${t.hairline}`,
                      background: on ? t.claySoft : t.surface,
                      color: on ? t.clay : t.ink2,
                      fontSize: 11.5,
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: on ? 500 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 18px",
            borderTop: `1px solid ${t.hairline}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <PillBtn onClick={onClose}>Cancel</PillBtn>
          <PillBtn primary onClick={handleSave}>
            Save context
          </PillBtn>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {kicker && (
        <div
          className="font-mono-fine uppercase"
          style={{ fontSize: 10, letterSpacing: "0.1em", color: t.muted, marginBottom: 4 }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{ fontSize: 14, fontWeight: 500, color: t.ink, marginBottom: 12 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        cursor: "pointer",
        padding: "10px 12px",
        borderRadius: 4,
        border: checked
          ? `1.5px solid ${t.clay}`
          : `1px solid ${t.hairline}`,
        background: checked ? t.claySoft : t.surface,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: t.clay, flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: 13, color: checked ? t.clay : t.ink, fontWeight: checked ? 500 : 400 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.4, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </label>
  );
}
