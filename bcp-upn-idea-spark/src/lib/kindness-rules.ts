export const PEERS = [
  { id: "ANDRES-M", name: "Andrés M.", payload: "SUMA-VALORES-P2P-ANDRES-M-2026" },
  { id: "VALERIA-M", name: "Valeria M.", payload: "SUMA-VALORES-P2P-VALERIA-M-2026" },
] as const;
export type Peer = { id: string; name: string; payload: string };
export type RecognizedPeer = { id: string; name: string; at: number };
export type KindPosition = { lat: number; lng: number; accuracy: number; at: number };
export type KindEvidence = {
  source: "real" | "backup";
  at: number;
  position?: KindPosition;
  peerId?: string;
  recipientPoints?: number;
  averageDb?: number;
  peakDb?: number;
  durationMs?: number;
  acousticScale?: "estimated-not-calibrated";
};
export const DAY_MS = 86400000;
export const QUIET_MS = 4000;
export const NOISE_LIMIT = 85;
export function seedRecognizedPeers(now = Date.now()): RecognizedPeer[] {
  return [{ id: "VALERIA-M", name: "Valeria M.", at: now - 2 * DAY_MS }];
}
export function parsePassport(payload: string): Peer | null {
  const known = PEERS.find((p) => p.payload === payload);
  if (known) return known;
  if (payload.startsWith("SUMA-VALORES-USER-")) {
    const name = payload.slice("SUMA-VALORES-USER-".length).trim();
    if (!name || name.length > 80) return null;
    return { id: `USER-${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()}`, name, payload };
  }
  const match = /^SUMA-VALORES-P2P-([A-Z0-9]+(?:-[A-Z0-9]+){0,4})-2026$/.exec(payload);
  const id = match?.[1];
  return id ? { id, name: id.replaceAll("-", " "), payload } : null;
}
export function recentRecognition(peers: RecognizedPeer[], id: string, now: number) {
  return peers.find((p) => p.id === id && now - p.at < 7 * DAY_MS);
}
export function estimatedDb(samples: ArrayLike<number>): number {
  let squares = 0;
  for (let i = 0; i < samples.length; i++) squares += (samples[i] ?? 0) ** 2;
  const rms = Math.sqrt(squares / Math.max(1, samples.length));
  // Browser microphones expose digital amplitude, not calibrated sound pressure.
  return Math.max(0, Math.min(120, 100 + 20 * Math.log10(Math.max(rms, 0.00001))));
}
export type QuietWindow = { start: number; lastAt: number; total: number; count: number; peak: number };
export function advanceQuiet(window: QuietWindow | null, db: number, at: number) {
  if (!Number.isFinite(db) || db >= NOISE_LIMIT) return { window: null, done: false };
  const base = window && at - window.lastAt <= 500 ? window : { start: at, lastAt: at, total: 0, count: 0, peak: 0 };
  const next = { ...base, lastAt: at, total: base.total + db, count: base.count + 1, peak: Math.max(base.peak, db) };
  return { window: next, done: at - next.start >= QUIET_MS };
}