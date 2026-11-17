export type OrderPosition = { lat: number; lng: number; accuracy: number; speed: number; at: number };
export type OrderEvidence = {
  mode: "real" | "backup"; at: number; lat?: number | undefined; lng?: number | undefined;
  waitSeconds?: number; steps?: number; pauseSeconds?: number; speed?: number | undefined;
  sessionId?: string; sequence?: string;
};
export const ORDER_QR = "SUMA-VALORES-FILA-ORDEN-OK-TURNO-03";
export const SKIP_QR = "SUMA-VALORES-FILA-SALTO-TURNO-06";
export const QUEUE_RADIUS = 15;
export const WALKING_SPEED = 12;
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function freshGps(p: OrderPosition | null, now: number) {
  return Boolean(p && now - p.at <= 15000 && p.accuracy <= QUEUE_RADIUS);
}
export function queueValid(anchor: OrderPosition | null, current: OrderPosition | null, now: number) {
  return Boolean(anchor && current && freshGps(current, now) && haversine(anchor, current) <= QUEUE_RADIUS);
}
export function parseOrderQr(value: string): "ordered" | "skip" | "unknown" {
  return value === ORDER_QR ? "ordered" : value === SKIP_QR ? "skip" : "unknown";
}
export type Crossing = { phase: "approach" | "pause" | "cross" | "done"; approach: number; after: number; pauseStart: number | null };
export const newCrossing = (): Crossing => ({ phase: "approach", approach: 0, after: 0, pauseStart: null });
export function advanceCrossing(s: Crossing, input: { now: number; step: boolean; moving: boolean; speed: number; valid: boolean }): Crossing {
  if (!input.valid || input.speed >= WALKING_SPEED) return newCrossing();
  if (s.phase === "done") return s;
  if (s.phase === "approach") {
    const approach = s.approach + Number(input.step);
    return { ...s, approach, phase: approach >= 4 ? "pause" : "approach" };
  }
  if (s.phase === "pause") {
    if (input.moving) return { ...s, pauseStart: null };
    const pauseStart = s.pauseStart ?? input.now;
    return { ...s, pauseStart, phase: input.now - pauseStart >= 3000 ? "cross" : "pause" };
  }
  const after = s.after + Number(input.step);
  return { ...s, after, phase: after >= 4 ? "done" : "cross" };
}