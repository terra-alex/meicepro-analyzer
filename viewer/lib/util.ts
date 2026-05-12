import type { DiagnosisSkin } from "./types";

// DiagnosisSkin has a known shape, but we read fields by computed key in several
// components. Wrap the cast in one place so the rest of the code stays clean.
export function fieldOf(face: DiagnosisSkin, key: string): unknown {
  return (face as unknown as Record<string, unknown>)[key];
}

export function numField(face: DiagnosisSkin, key: string): number {
  const v = fieldOf(face, key);
  return typeof v === "number" ? v : 0;
}

export function nullableNumField(face: DiagnosisSkin, key: string): number | null {
  const v = fieldOf(face, key);
  return typeof v === "number" ? v : null;
}

export function stringField(face: DiagnosisSkin, key: string): string | null {
  const v = fieldOf(face, key);
  return typeof v === "string" ? v : null;
}
