import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderEvidence } from "./order-rules";
import type { KindEvidence, Peer } from "./kindness-rules";
import { stopKindnessSensors } from "./kindness-sensors";
import { newWitnessPin, validOffer, validProfile, type Profile } from "./profile-rules";
import { addPassportAction, type PassportStats } from "./passport-rules";
import { applyBin, applyQr, applyRescue, applyRedeem, applyQueue, applyCrossing, applyRecognition, applyCourtesy, applySeat, applyAssist, applyAlert, initialState, todayKey, type CivicState } from "./civic-rules";

type Actions = {
  commitment: string;
  setCommitment: (text: string) => void;
  updatePassport: (profile: Profile) => boolean;
  setAvatar: (url: string | null) => void;
  register: (profile: Profile) => boolean;
  publishOffer: (title: string, cost: number) => boolean;
  acceptCoupon: (code: string) => "ok" | "used" | "invalid";
  receiveContainer: () => void;
  generateWitness: () => string;
  confirmWitness: () => boolean;
  validateBin: (photo?: string) => boolean;
  scanQr: () => void;
  rescue: (before?: string, after?: string) => void;
  redeem: (rewardId: string) => string | null;
  boardQueue: (evidence?: OrderEvidence) => void;
  cross: (evidence?: OrderEvidence) => boolean;
  recognize: (reason: string, peer?: Peer, evidence?: KindEvidence) => boolean;
  courtesy: (vehicle: string, evidence?: KindEvidence) => boolean;
  seat: (who: string, via: string) => boolean;
  assist: (k: string) => void;
  alert: (k: string) => void;
  reset: () => void;
};

export const useCivic = create<CivicState & Actions>()(
  persist(
    (set, get) => {
      const record = (next: CivicState, key: keyof PassportStats, detail: string) => {
        const current = get();
        set({ ...next, passportStats: addPassportAction(current.passportStats, key, next.points - current.points, detail) });
      };
      return ({
      ...initialState(),
      commitment: "",
      setCommitment: (commitment) => set({ commitment: commitment.slice(0, 280) }),
      setAvatar: (avatarUrl) => { if (avatarUrl === null || (avatarUrl.startsWith("data:image/") && avatarUrl.length < 1500000)) set({ avatarUrl }); },
      updatePassport: (profile) => {
        if (!validProfile(profile) || profile.role !== "citizen") return false;
        const rename = (items: CivicState["feed"]) => items.map((item) => item.id.startsWith("me-") && item.name !== "Ciudadano anónimo" ? { ...item, name: profile.name.trim() } : item);
        const s = get(); set({ profile: { ...profile, name: profile.name.trim() }, feed: rename(s.feed), orderFeed: rename(s.orderFeed), kindFeed: rename(s.kindFeed), helpFeed: rename(s.helpFeed) }); return true;
      },
      register: (profile) => { if (!validProfile(profile)) return false; set({ profile: { ...profile, name: profile.name.trim() } }); return true; },
      publishOffer: (title, cost) => {
        const s = get(); if (s.profile?.role !== "merchant" || !validOffer(title, cost)) return false;
        set({ offers: [...s.offers, { id: `offer-${crypto.randomUUID()}`, title: title.trim(), cost, place: s.profile.name, emoji: "🎁" }] }); return true;
      },
      acceptCoupon: (code) => {
        const s = get(); if (s.profile?.role !== "merchant") return "invalid";
        const coupon = s.redemptions.find((r) => r.code === code);
        if (!coupon) return "invalid"; if (coupon.used) return "used";
        set({ redemptions: s.redemptions.map((r) => r.code === code ? { ...r, used: true } : r), merchantCoupons: s.merchantCoupons + 1 }); return "ok";
      },
      receiveContainer: () => { const s = get(); if (s.profile?.role !== "merchant") return; set({ containersDate: todayKey(), containersCount: (s.containersDate === todayKey() ? s.containersCount : 0) + 1 }); },
      generateWitness: () => { if (get().profile?.role !== "merchant") return ""; const pin = newWitnessPin(); set({ witnessPin: pin }); return pin; },
      confirmWitness: () => { const s = get(); if (s.profile?.role !== "merchant" || !s.witnessPin) return false; set({ witnessedRescues: s.witnessedRescues + 1, witnessPin: null }); return true; },
      validateBin: (photo) => {
        const n = applyBin(get(), todayKey(), photo);
        if (!n) return false;
        record(n, "eco", "bin");
        return true;
      },
      scanQr: () => record(applyQr(get()), "eco", "recycle"),
      rescue: (b, a) => record(applyRescue(get(), b, a), "eco", "rescue"),
      redeem: (id) => {
        const code = `SV-${id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const n = applyRedeem(get(), id, code);
        if (!n) return null;
        set(n);
        return code;
      },
      boardQueue: (evidence) => record(applyQueue(get(), evidence), "order", "queue"),
      cross: (evidence) => {
        const n = applyCrossing(get(), todayKey(), evidence);
        if (!n) return false;
        record(n, "order", "crossing");
        return true;
      },
      recognize: (reason, peer, evidence) => {
        const n = applyRecognition(get(), todayKey(), reason, peer, evidence);
        if (!n) return false;
        record(n, "kind", "recognition");
        return true;
      },
      courtesy: (v, evidence) => {
        const current = get();
        const n = applyCourtesy(current, v, evidence);
        if (n === current) return false;
        record(n, "kind", "courtesy"); return true;
      },
      seat: (who, via) => {
        const n = applySeat(get(), todayKey(), who, via);
        if (!n) return false;
        record(n, "help", "seat");
        return true;
      },
      assist: (k) => record(applyAssist(get(), k), "help", "assist"),
      alert: (k) => record(applyAlert(get(), k), "help", "alert"),
      reset: () => { stopKindnessSensors(); const { profile, offers, avatarUrl } = get(); set({ ...initialState(), profile, offers, avatarUrl }); },
    }); },
    { name: "suma-valores", skipHydration: true },
  ),
);
