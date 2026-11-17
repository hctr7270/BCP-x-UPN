import type { OrderEvidence } from "./order-rules";
import type { Offer, Profile } from "./profile-rules";
import { emptyPassportStats, type PassportStats } from "./passport-rules";
import { recentRecognition, seedRecognizedPeers, type KindEvidence, type Peer, type RecognizedPeer } from "./kindness-rules";
export type FeedItem = { id: string; name: string; text: string; ago: string; pts: number; photo?: string; before?: string; after?: string; tag?: string; orderEvidence?: OrderEvidence; kindEvidence?: KindEvidence };

export const MAX_STAMPS = 5;
export const ALLY_QR_PAYLOAD = "SUMA-VALORES-BODEGA-DON-PEPE-2026";
export type Redemption = { id: string; rewardId: string; code: string; used?: boolean; title?: string };

export type CivicState = {
  avatarUrl: string | null;
  passportStats: PassportStats;
  bestStreak: number;
  profile: Profile | null;
  offers: Offer[];
  merchantCoupons: number;
  containersDate: string | null;
  containersCount: number;
  witnessPin: string | null;
  witnessedRescues: number;
  points: number;
  streak: number;
  collective: number;
  collectiveGoal: number;
  cleanliness: number;
  activeToday: number;
  binBonusDate: string | null;
  stamps: number;
  feed: FeedItem[];
  redemptions: Redemption[];
  orderFeed: FeedItem[];
  crossingsDate: string | null;
  crossingsCount: number;
  kindFeed: FeedItem[];
  recogDate: string | null;
  recogCount: number;
  recognizedPeers: RecognizedPeer[];
  helpFeed: FeedItem[];
  seatDate: string | null;
  seatCount: number;
};

export const MAX_SEATS = 2;

export const MAX_RECOG = 2;

export const MAX_CROSSINGS = 2;

export const REWARDS = [
  { id: "cafe", title: "Café americano gratis en UPN", place: "Cafetería Central UPN", cost: 150, emoji: "☕" },
  { id: "vale", title: "Vale S/ 5 en Bodegas Aliadas", place: "Bodega Don Pepe y aliados", cost: 250, emoji: "🛒" },
  { id: "pasaje", title: "Pasaje corto corredor aliado", place: "Corredor Panamericana Norte", cost: 200, emoji: "🚌" },
] as const;

export const initialState = (): CivicState => ({
  avatarUrl: null, passportStats: emptyPassportStats(), bestStreak: 7,
  profile: null, offers: [], merchantCoupons: 19, containersDate: null, containersCount: 0, witnessPin: null, witnessedRescues: 0,
  points: 340,
  streak: 5,
  collective: 420,
  collectiveGoal: 500,
  cleanliness: 84,
  activeToday: 68,
  binBonusDate: null,
  stamps: 3,
  feed: [
    { id: "f1", name: "Mateo G.", text: "usó un tacho en Paradero UPN", ago: "hace 2 min", pts: 10 },
    { id: "f2", name: "Sofía L.", text: "completó Misión Rescate con testigo", ago: "hace 9 min", pts: 15 },
    { id: "f3", name: "Diego R.", text: "entregó envases en Bodega Don Pepe", ago: "hace 14 min", pts: 10 },
    { id: "f4", name: "Valeria P.", text: "usó un tacho en Av. Alfredo Mendiola", ago: "hace 21 min", pts: 10 },
  ],
  redemptions: [],
  orderFeed: [
    { id: "o1", name: "Valeria M.", text: "abordó en orden (#03) en Paradero UPN", ago: "hace 2 min", pts: 15 },
    { id: "o2", name: "Jorge T.", text: "completó Trayecto Seguro en Puente UPN", ago: "hace 7 min", pts: 10 },
    { id: "o3", name: "Lucía F.", text: "abordó en orden (#11) en Paradero UPN", ago: "hace 12 min", pts: 15 },
  ],
  crossingsDate: null,
  crossingsCount: 0,
  kindFeed: [
    { id: "k1", name: "Camila R.", text: "reconoció a Andrés M. por 'Cedió el paso'", ago: "hace 3 min", pts: 5 },
    { id: "k2", name: "Lucía V.", text: "validó Cortesía Vial sin claxon en Av. Alfredo Mendiola", ago: "hace 8 min", pts: 15 },
    { id: "k3", name: "Renzo C.", text: "reconoció a Mariana S. por 'Trato amable'", ago: "hace 15 min", pts: 5 },
  ],
  recogDate: null,
  recogCount: 0,
  recognizedPeers: seedRecognizedPeers(),
  helpFeed: [
    { id: "h1", name: "Camila R.", text: "cedió asiento a adulto mayor (validado por testigo)", ago: "hace 2 min", pts: 20 },
    { id: "h2", name: "Diego P.", text: "envió Alerta Segura Discreta en Paradero UPN", ago: "hace 11 min", pts: 15 },
    { id: "h3", name: "Ana Q.", text: "orientó a un estudiante nuevo en Campus UPN", ago: "hace 18 min", pts: 15 },
  ],
  seatDate: null,
  seatCount: 0,
});

// Feed keeps only the 8 newest items so stored photos stay small.
const me = (s: CivicState, text: string, pts: number, extra: Partial<FeedItem> = {}): FeedItem[] =>
  [{ id: `me-${Date.now()}-${s.points}`, name: s.profile?.role === "citizen" ? s.profile.name : "Camila R.", text, ago: "ahora", pts, ...extra }, ...s.feed].slice(0, 8);

export const binUsedToday = (s: CivicState, today: string) => s.binBonusDate === today;

export function applyBin(s: CivicState, today: string, photo?: string): CivicState | null {
  if (binUsedToday(s, today)) return null;
  return { ...s, points: s.points + 10, collective: s.collective + 1, binBonusDate: today, activeToday: s.activeToday + 1,
    feed: me(s, "validó un tacho con IA + GPS", 10, photo ? { photo, tag: "Verificado por IA + GPS Real" } : {}) };
}

export function applyQr(s: CivicState): CivicState {
  return { ...s, points: s.points + 10, collective: s.collective + 1, stamps: Math.min(MAX_STAMPS, s.stamps + 1),
    feed: me(s, "entregó envases en Bodega Don Pepe", 10) };
}

export function applyRescue(s: CivicState, before?: string, after?: string): CivicState {
  return { ...s, points: s.points + 15, collective: s.collective + 1, cleanliness: Math.min(100, s.cleanliness + 2),
    feed: me(s, "completó Misión Rescate con testigo", 15, before && after ? { before, after, tag: "Antes / Después reales" } : {}) };
}

export function applyRedeem(s: CivicState, rewardId: string, code: string): CivicState | null {
  const r = [...REWARDS, ...s.offers].find((x) => x.id === rewardId);
  if (!r || s.points < r.cost) return null;
  return { ...s, points: s.points - r.cost, redemptions: [{ id: code, rewardId, code, title: r.title }, ...s.redemptions] };
}

export const crossingsToday = (s: CivicState, today: string) => (s.crossingsDate === today ? s.crossingsCount : 0);

const meOrder = (s: CivicState, text: string, pts: number, orderEvidence?: OrderEvidence) => {
  const item = { id: `me-o-${s.orderFeed.length}-${s.points}`, name: s.profile?.role === "citizen" ? s.profile.name : "Camila R.", text, ago: "ahora", pts, ...(orderEvidence ? { orderEvidence } : {}) };
  return { orderFeed: [item, ...s.orderFeed].slice(0, 12), feed: [{ ...item, id: item.id + "-g" }, ...s.feed].slice(0, 12) };
};

export function applyQueue(s: CivicState, evidence?: OrderEvidence): CivicState {
  return { ...s, points: s.points + 15, collective: s.collective + 1, ...meOrder(s, "abordó en orden (#04) en Paradero UPN", 15, evidence) };
}

export function applyCrossing(s: CivicState, today: string, evidence?: OrderEvidence): CivicState | null {
  const n = crossingsToday(s, today);
  if (n >= MAX_CROSSINGS) return null;
  return { ...s, points: s.points + 10, collective: s.collective + 1, crossingsDate: today, crossingsCount: n + 1,
    ...meOrder(s, "completó Trayecto Seguro en Puente UPN", 10, evidence) };
}

export const recogToday = (s: CivicState, today: string) => (s.recogDate === today ? s.recogCount : 0);

const meKind = (s: CivicState, text: string, pts: number, kindEvidence?: KindEvidence) => {
  const item = { id: `me-k-${s.kindFeed.length}-${s.points}`, name: s.profile?.role === "citizen" ? s.profile.name : "Camila R.", text, ago: "ahora", pts, ...(kindEvidence ? { kindEvidence } : {}) };
  return { kindFeed: [item, ...s.kindFeed].slice(0, 12), feed: [{ ...item, id: item.id + "-g" }, ...s.feed].slice(0, 12) };
};

export function applyRecognition(s: CivicState, today: string, reason: string, peer?: Peer, evidence?: KindEvidence): CivicState | null {
  const n = recogToday(s, today);
  if (n >= MAX_RECOG) return null;
  const at = evidence?.at ?? Date.now();
  if (peer && recentRecognition(s.recognizedPeers, peer.id, at)) return null;
  if (evidence?.source === "real" && (!peer || !evidence.position)) return null;
  return { ...s, points: s.points + 5, collective: s.collective + 1, recogDate: today, recogCount: n + 1,
    recognizedPeers: peer ? [...s.recognizedPeers.filter((p) => p.id !== peer.id), { id: peer.id, name: peer.name, at }] : s.recognizedPeers,
    ...meKind(s, `reconoció a ${peer?.name ?? "Andrés M."} por '${reason}'`, 5, evidence ? { ...evidence, ...(peer ? { peerId: peer.id } : {}), recipientPoints: 10 } : undefined) };
}

export function applyCourtesy(s: CivicState, vehicle: string, evidence?: KindEvidence): CivicState {
  if (evidence?.source === "real" && (!evidence.position || evidence.durationMs === undefined || evidence.durationMs < 4000 || evidence.peakDb === undefined || evidence.peakDb >= 85 || evidence.averageDb === undefined || !Number.isFinite(evidence.averageDb))) return s;
  return { ...s, points: s.points + 15, collective: s.collective + 1,
    ...meKind(s, `agradeció paso peatonal sin claxon (${vehicle})`, 15, evidence) };
}

export const seatsToday = (s: CivicState, today: string) => (s.seatDate === today ? s.seatCount : 0);

const meHelp = (s: CivicState, text: string, pts: number, name = s.profile?.role === "citizen" ? s.profile.name : "Camila R.") => {
  const item = { id: `me-h-${s.helpFeed.length}-${s.points}`, name, text, ago: "ahora", pts };
  return { helpFeed: [item, ...s.helpFeed].slice(0, 12), feed: [{ ...item, id: item.id + "-g" }, ...s.feed].slice(0, 12) };
};

export function applySeat(s: CivicState, today: string, who: string, via: string): CivicState | null {
  const n = seatsToday(s, today);
  if (n >= MAX_SEATS) return null;
  return { ...s, points: s.points + 20, collective: s.collective + 1, seatDate: today, seatCount: n + 1,
    ...meHelp(s, `cedió asiento a ${who.toLowerCase()} (validado por ${via})`, 20) };
}

export function applyAssist(s: CivicState, kind: string): CivicState {
  return { ...s, points: s.points + 15, collective: s.collective + 1, ...meHelp(s, `registró asistencia: ${kind.toLowerCase()}`, 15) };
}

export function applyAlert(s: CivicState, kind: string): CivicState {
  return { ...s, points: s.points + 15, ...meHelp(s, `envió Alerta Segura Discreta (${kind.toLowerCase()})`, 15, "Ciudadano anónimo") };
}

export const todayKey = () => new Date().toISOString().slice(0, 10);
