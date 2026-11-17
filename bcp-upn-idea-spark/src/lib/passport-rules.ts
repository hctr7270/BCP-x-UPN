export type ChallengeTotals = { actions: number; points: number; details: Record<string, number> };
export type PassportStats = Record<"eco" | "order" | "kind" | "help", ChallengeTotals>;
export function emptyPassportStats(): PassportStats {
  return { eco: { actions: 0, points: 0, details: {} }, order: { actions: 0, points: 0, details: {} }, kind: { actions: 0, points: 0, details: {} }, help: { actions: 0, points: 0, details: {} } };
}
export function addPassportAction(stats: PassportStats, key: keyof PassportStats, points: number, detail: string): PassportStats {
  const previous = stats[key];
  return { ...stats, [key]: { actions: previous.actions + 1, points: previous.points + points, details: { ...previous.details, [detail]: (previous.details[detail] ?? 0) + 1 } } };
}
export function mrzName(name: string) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "<").replace(/^<|<$/g, ""); }
export function passportMrz(name: string, points: number, streak: number) {
  return [`P<PER<${mrzName(name)}<<UPN<LOS<OLIVOS<<<<<<<<<<`, `SV20260842<3PER<NIVEL03<RACHA${String(streak).padStart(2, "0")}D<${points}PTS<<<<<<<<<<<`];
}
export function personalQr(name: string) { return `SUMA-VALORES-USER-${name.trim()}`; }