// LocalStorage-backed "Recent on this device" — keyed list of diagnoses the
// user has loaded recently. Used by the Empty state to surface previously-
// viewed reports for one-click reload.

import type { ReportPayload } from "@/lib/types";

export interface RecentEntry {
  id: string;
  shortId: string;        // 8-char display ID
  lang: string;
  name: string;
  subject: string;        // device + sex + age, compact
  date: string;           // capture date, ISO or human
  composite: number | null; // 0..100
  lastViewedAt: number;   // epoch ms
}

const KEY = "meicepro:recent";
const MAX = 8;

function read(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.id === "string");
  } catch {
    return [];
  }
}

function write(entries: RecentEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* quota or disabled — skip silently */
  }
}

export function listRecent(): RecentEntry[] {
  return read().sort((a, b) => b.lastViewedAt - a.lastViewedAt);
}

export function rememberReport(report: ReportPayload, lang: string): void {
  const diag = report.datas.diagnosis;
  const cus = report.datas.customer;
  if (!diag.id) return;
  const entry: RecentEntry = {
    id: diag.id,
    shortId: diag.id.slice(0, 8),
    lang,
    name: cus.cusName?.trim() || "Subject",
    subject: [
      diag.deviceNo ?? "MC-?",
      cus.gender === 1 ? "M" : cus.gender === 0 ? "F" : "—",
      cus.birthday ? ageFromBirthday(cus.birthday) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    date: (diag.createTime ?? "").split(" ")[0] || "—",
    composite:
      typeof diag.skinScore === "number"
        ? Math.round(diag.skinScore * 100)
        : null,
    lastViewedAt: Date.now(),
  };
  const existing = read().filter((e) => e.id !== entry.id);
  write([entry, ...existing]);
}

export function forgetRecent(id: string): void {
  write(read().filter((e) => e.id !== id));
}

function ageFromBirthday(s: string): string | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years > 0 && years < 150 ? `${years}` : null;
}
