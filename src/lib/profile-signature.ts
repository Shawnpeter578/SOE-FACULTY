export type SignatureMark = { kind: "typed" | "drawn"; value: string };
export type SavedSignature = SignatureMark & { revision: string };
export type SignaturePoint = [number, number];
export type SignatureStroke = SignaturePoint[];

export const SIGNATURE_NAME_LIMIT = 120;
export const SIGNATURE_DRAWING_LIMIT = 16000;
export const SIGNATURE_GRID_MAX = 999;

const drawingPattern = /^\d{1,3},\d{1,3}(?: \d{1,3},\d{1,3})+(?:\|\d{1,3},\d{1,3}(?: \d{1,3},\d{1,3})+)*$/;

export function parseSignature(input: unknown): SignatureMark | null {
  if (!input || typeof input !== "object" || !("kind" in input) || !("value" in input) || typeof input.value !== "string") return null;
  const value = input.value.trim();
  if (input.kind === "typed" && value.length > 0 && value.length <= SIGNATURE_NAME_LIMIT && !/[\p{Cc}]/u.test(value)) {
    return { kind: input.kind, value };
  }
  if (input.kind === "drawn" && value.length <= SIGNATURE_DRAWING_LIMIT && drawingPattern.test(value)) {
    return { kind: input.kind, value };
  }
  return null;
}

export function signatureStrokes(value: string): SignatureStroke[] {
  return value.split("|").map((stroke) => stroke.split(" ").map((point) => {
    const [x, y] = point.split(",");
    return [Number(x), Number(y)];
  }));
}
