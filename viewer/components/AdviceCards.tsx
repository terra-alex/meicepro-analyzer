"use client";

import { useState } from "react";
import { SYMPTOM_LABEL } from "@/lib/constants";
import type { SymptomDesc } from "@/lib/types";

interface Props {
  list: SymptomDesc[];
}

export default function AdviceCards({ list }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Prefer the most specific entry (oem-specific over default '0') per symptom.
  const bySymptom = new Map<string, SymptomDesc>();
  for (const s of list) {
    const cur = bySymptom.get(s.symptom);
    if (!cur || (s.oemId && s.oemId !== "0")) bySymptom.set(s.symptom, s);
  }
  const items = [...bySymptom.values()].sort((a, b) => a.symptom.localeCompare(b.symptom));

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-medium text-[var(--ink)] mb-3">Advice (per symptom)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((s) => {
          const isOpen = open[s.symptom];
          return (
            <div key={s.id} className="panel-2 px-3 py-2">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setOpen((o) => ({ ...o, [s.symptom]: !o[s.symptom] }))}
              >
                <span className="text-sm">
                  <span className="kbd mr-2">{s.symptom}</span>
                  {SYMPTOM_LABEL[s.symptom] ?? "Unknown"}
                </span>
                <span className="text-xs text-[var(--faint)]">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="mt-2 text-xs text-[var(--ink-2)] space-y-2">
                  {s.reason && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">Reason</div>
                      <p className="whitespace-pre-line leading-snug">{s.reason}</p>
                    </div>
                  )}
                  {s.advise && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--faint)] mb-0.5">Advice</div>
                      <p className="whitespace-pre-line leading-snug">{s.advise}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
