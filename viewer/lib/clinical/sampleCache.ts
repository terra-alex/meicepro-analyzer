// Module-level cache for zone samples. Key = `${diagId}:${dir}:${zone}:${channel}`.
// Survives React re-renders; cleared on diagnosis change.

import type { SampleOrFail } from "./types";

const store = new Map<string, SampleOrFail>();

export const sampleCache = {
  get(key: string): SampleOrFail | undefined {
    return store.get(key);
  },
  set(key: string, v: SampleOrFail): void {
    store.set(key, v);
  },
  clearDiagnosis(diagId: string): void {
    for (const k of Array.from(store.keys())) {
      if (k.startsWith(`${diagId}:`)) store.delete(k);
    }
  },
  size(): number {
    return store.size;
  },
};
