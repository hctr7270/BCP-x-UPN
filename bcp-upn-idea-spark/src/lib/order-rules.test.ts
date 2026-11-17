import { describe, expect, it } from "vitest";
import { advanceCrossing, haversine, newCrossing, ORDER_QR, SKIP_QR, parseOrderQr, queueValid, type OrderPosition } from "./order-rules";
import { applyQueue, applyCrossing, initialState } from "./civic-rules";
const p: OrderPosition = { lat: -11.96, lng: -77.06, accuracy: 5, speed: 0, at: 1000 };
describe("real order rules", () => {
  it("Haversine reports real meters", () => { expect(haversine(p, p)).toBe(0); expect(haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 })).toBeCloseTo(111.195, 2); });
  it("requires staying inside 15 meters", () => {
    expect(queueValid(p, { ...p, lat: p.lat + 0.0001 }, 1000)).toBe(true);
    expect(queueValid(p, { ...p, lat: p.lat + 0.0002 }, 1000)).toBe(false);
  });
  it("does not accept stale or inaccurate GPS", () => {
    expect(queueValid(p, { ...p, accuracy: 16 }, 1000)).toBe(false);
    expect(queueValid(p, p, 16001)).toBe(false);
  });
  it("parses exact ordered and skipped QR payloads", () => {
    expect(parseOrderQr("SUMA-VALORES-FILA-ORDEN-OK-TURNO-03")).toBe("ordered");
    expect(parseOrderQr("SUMA-VALORES-FILA-SALTO-TURNO-06")).toBe("skip");
    expect(parseOrderQr(ORDER_QR + "x")).toBe("unknown"); expect(parseOrderQr(SKIP_QR)).toBe("skip");
  });
  it("requires four steps, a full three-second pause, then four additional steps", () => {
    let s = newCrossing();
    const tick = (now: number, step = false, moving = false) => { s = advanceCrossing(s, { now, step, moving, speed: 0, valid: true }); };
    for (let i = 0; i < 3; i++) tick(i * 400, true, true);
    expect(s.phase).toBe("approach"); tick(1200, true, true); expect(s.phase).toBe("pause");
    tick(1300); tick(4299); expect(s.phase).toBe("pause"); tick(4300); expect(s.phase).toBe("cross");
    for (let i = 0; i < 3; i++) tick(5000 + i * 400, true, true);
    expect(s.phase).toBe("cross"); tick(6200, true, true); expect(s.phase).toBe("done");
  });
  it("moving during the pause restarts its countdown", () => {
    const s = { ...newCrossing(), phase: "pause" as const, approach: 4, pauseStart: 1000 };
    expect(advanceCrossing(s, { now: 3900, step: true, moving: true, speed: 0, valid: true }).pauseStart).toBeNull();
  });
  it("vehicle speed at 12 km/h resets validation", () => {
    expect(advanceCrossing({ ...newCrossing(), phase: "cross", approach: 4, after: 3 }, { now: 1000, step: true, moving: true, speed: 12, valid: true })).toEqual(newCrossing());
  });
  it("missing sensor/GPS resets the crossing", () => {
    expect(advanceCrossing({ ...newCrossing(), approach: 3 }, { now: 1000, step: true, moving: true, speed: 0, valid: false })).toEqual(newCrossing());
  });
  it("persists queue wait and coordinates alongside +15 and +1", () => {
    const evidence = { mode: "real" as const, at: 1000, lat: p.lat, lng: p.lng, waitSeconds: 33, sequence: "#03 → #04" };
    const s = applyQueue(initialState(), evidence);
    expect(s.points).toBe(355); expect(s.collective).toBe(421); expect(s.orderFeed[0]?.orderEvidence).toEqual(evidence);
  });
  it("persists eight steps and three-second pause with +10, at most twice daily", () => {
    const evidence = { mode: "real" as const, at: 1000, steps: 8, pauseSeconds: 3 };
    const a = applyCrossing(initialState(), "day", evidence);
    if (!a) throw new Error("Expected first crossing");
    expect(a.points).toBe(350); expect(a.orderFeed[0]?.orderEvidence).toEqual(evidence);
    const b = applyCrossing(a, "day", evidence);
    if (!b) throw new Error("Expected second crossing");
    expect(b.crossingsCount).toBe(2); expect(applyCrossing(b, "day", evidence)).toBeNull();
    expect(initialState().points).toBe(340); expect(initialState().collective).toBe(420); expect(initialState().crossingsCount).toBe(0);
  });
});
