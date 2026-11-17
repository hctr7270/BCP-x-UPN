import { describe, expect, it } from "vitest";
import { advanceQuiet, DAY_MS, estimatedDb, parsePassport, PEERS, recentRecognition, seedRecognizedPeers, type KindEvidence, type QuietWindow } from "./kindness-rules";
import { applyCourtesy, applyRecognition, initialState } from "./civic-rules";
import { useCivic } from "./civic-store";
import { trackKindnessStop } from "./kindness-sensors";
const at = Date.UTC(2026, 10, 14);
const evidence: KindEvidence = { source: "real", at, position: { lat: -11.96, lng: -77.06, accuracy: 5, at } };
describe("real kindness rules", () => {
  it("decodes the two requested passports and rejects unrelated QR", () => {
    expect(parsePassport("SUMA-VALORES-P2P-ANDRES-M-2026")?.id).toBe("ANDRES-M");
    expect(parsePassport("SUMA-VALORES-P2P-VALERIA-M-2026")?.id).toBe("VALERIA-M");
    expect(parsePassport("SUMA-VALORES-BODEGA-DON-PEPE-2026")).toBeNull();
  });
  it("seeds Valeria two days ago and blocks for seven days", () => {
    const peers = seedRecognizedPeers(at);
    expect(peers[0]?.at).toBe(at - 2 * DAY_MS);
    expect(recentRecognition(peers, "VALERIA-M", at)?.id).toBe("VALERIA-M");
    expect(recentRecognition(peers, "VALERIA-M", at + 5 * DAY_MS)).toBeUndefined();
  });
  it("awards sender +5, stores recipient +10 and advances collective by one", () => {
    const s = applyRecognition(initialState(), "2026-11-14", "Cedió el paso", PEERS[0], evidence);
    expect(s?.points).toBe(345); expect(s?.collective).toBe(421);
    expect(s?.kindFeed[0]?.kindEvidence?.recipientPoints).toBe(10);
    expect(s?.kindFeed[0]?.kindEvidence?.position?.lat).toBe(-11.96);
    expect(s?.recognizedPeers.find((p) => p.id === "ANDRES-M")?.at).toBe(at);
  });
  it("repeated peer cannot earn again even on the next day", () => {
    const s = applyRecognition(initialState(), "2026-11-14", "Respeto", PEERS[0], evidence);
    if (!s) throw new Error("recognition failed");
    expect(applyRecognition(s, "2026-11-15", "Respeto", PEERS[0], { ...evidence, at: at + DAY_MS })).toBeNull();
  });
  it("caps recognition at two per day and resets count on the next day", () => {
    const a = applyRecognition(initialState(), "2026-11-14", "Respeto", PEERS[0], evidence);
    if (!a) throw new Error("first failed");
    const b = applyRecognition(a, "2026-11-14", "Respeto", { id: "LUCIA", name: "Lucía", payload: "" }, evidence);
    if (!b) throw new Error("second failed");
    expect(b.recogCount).toBe(2);
    expect(applyRecognition(b, "2026-11-14", "Respeto", { id: "DIEGO", name: "Diego", payload: "" }, evidence)).toBeNull();
    expect(applyRecognition(b, "2026-11-15", "Respeto", { id: "DIEGO", name: "Diego", payload: "" }, evidence)?.recogCount).toBe(1);
  });
  it("requires four uninterrupted seconds below 85 dB", () => {
    let window: QuietWindow | null = null;
    for (let t = 0; t < 4000; t += 100) { const r = advanceQuiet(window, 56, t); window = r.window; expect(r.done).toBe(false); }
    expect(advanceQuiet(window, 56, 4000).done).toBe(true);
    expect(advanceQuiet(window, 88, 4000).window).toBeNull();
    expect(advanceQuiet(window, 85, 4000).done).toBe(false);
    expect(advanceQuiet(window, 56, 4500).done).toBe(false);
  });
  it("RMS estimate responds to actual amplitude", () => {
    expect(estimatedDb([0.01, -0.01])).toBeCloseTo(60);
    expect(estimatedDb([0.3, -0.3])).toBeGreaterThan(85);
  });
  it("courtesy awards +15/+1 only with complete quiet real evidence", () => {
    const e = { ...evidence, averageDb: 56, peakDb: 70, durationMs: 4000 };
    expect(applyCourtesy(initialState(), "Taxi", e).points).toBe(355);
    expect(applyCourtesy(initialState(), "Taxi", e).collective).toBe(421);
    expect(applyCourtesy(initialState(), "Taxi", { ...e, peakDb: 88 }).points).toBe(340);
    expect(applyCourtesy(initialState(), "Taxi", { ...e, durationMs: 3999 }).points).toBe(340);
  });
  it("reset stops registered sensors and restores 340/420/0 plus only Valeria", () => {
    useCivic.getState().recognize("Respeto", PEERS[0], evidence);
    let stopped = false;
    const clean = trackKindnessStop(() => { stopped = true; });
    useCivic.getState().reset();
    expect(stopped).toBe(true);
    clean();
    expect([useCivic.getState().points, useCivic.getState().collective, useCivic.getState().recogCount]).toEqual([340, 420, 0]);
    expect(useCivic.getState().recognizedPeers.map((p) => p.id)).toEqual(["VALERIA-M"]);
  });
});