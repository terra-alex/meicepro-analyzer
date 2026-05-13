"use client";

import { useState } from "react";

interface Props {
  data: unknown;
}

export default function RawInspector({ data }: Props) {
  const [open, setOpen] = useState(false);
  const [pretty, setPretty] = useState(true);
  return (
    <div className="panel p-4">
      <button className="flex items-center justify-between w-full text-left" onClick={() => setOpen((v) => !v)}>
        <h3 className="text-sm font-medium text-[var(--ink)]">Raw response</h3>
        <span className="text-xs text-[var(--faint)]">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <label className="text-[11px] text-[var(--muted)] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
            pretty-print
          </label>
          <pre className="text-[11px] font-mono leading-snug text-[var(--ink)] bg-[var(--ink)]/30 rounded p-2 overflow-auto max-h-[480px]">
            {pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)}
          </pre>
        </div>
      )}
    </div>
  );
}
