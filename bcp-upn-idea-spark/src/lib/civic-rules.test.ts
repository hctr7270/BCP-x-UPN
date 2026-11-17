import { describe, it, expect } from "vitest";
import { applySeat, applyAssist, applyAlert, applyRecognition, applyCourtesy, applyQueue, applyCrossing, initialState, applyBin, applyQr, applyRescue, applyRedeem } from "./civic-rules";

describe("civic rules", () => {
  it("bin bonus gives +10 only once per day", () => {
    const a = applyBin(initialState(), "2026-11-14")!;
    expect(a.points).toBe(350);
    expect(applyBin(a, "2026-11-14")).toBeNull();
    expect(applyBin(a, "2026-11-15")!.points).toBe(360);
  });
  it("QR gives +10 and a stamp", () => {
    const s = applyQr(initialState());
    expect(s.points).toBe(350);
    expect(s.stamps).toBe(4);
  });
  it("rescue gives +15 and +2% cleanliness", () => {
    const s = applyRescue(initialState());
    expect(s.points).toBe(355);
    expect(s.cleanliness).toBe(86);
  });
  it("redeem requires enough points", () => {
    const s = applyRedeem(initialState(), "vale", "X")!;
    expect(s.points).toBe(90);
    expect(applyRedeem(s, "cafe", "Y")).toBeNull();
  });
  it("fila justa gives +15 and +1 collective", () => {
    const s = applyQueue(initialState());
    expect(s.points).toBe(355);
    expect(s.collective).toBe(421);
  });
  it("crossings give +10, max 2 per day", () => {
    const a = applyCrossing(initialState(), "d")!;
    const b = applyCrossing(a, "d")!;
    expect(b.points).toBe(360);
    expect(b.crossingsCount).toBe(2);
    expect(applyCrossing(b, "d")).toBeNull();
  });
  it("reset restores 340 pts, 420 actions, 0 crossings", () => {
    const s = initialState();
    expect([s.points, s.collective, s.crossingsCount]).toEqual([340, 420, 0]);
  });
  it("recognition gives +5, max 2 per day", () => {
    const a = applyRecognition(initialState(), "d", "Cedió el paso")!;
    const b = applyRecognition(a, "d", "x")!;
    expect(b.points).toBe(350);
    expect(b.collective).toBe(422);
    expect(applyRecognition(b, "d", "x")).toBeNull();
  });
  it("road courtesy gives +15", () => {
    expect(applyCourtesy(initialState(), "Bus").points).toBe(355);
  });
  it("seat gives +20, max 2 per day", () => {
    const a = applySeat(initialState(), "d", "Adulto mayor", "testigo")!;
    const b = applySeat(a, "d", "x", "y")!;
    expect(b.points).toBe(380);
    expect(applySeat(b, "d", "x", "y")).toBeNull();
  });
  it("assist and alert give +15 each", () => {
    expect(applyAssist(initialState(), "x").points).toBe(355);
    expect(applyAlert(initialState(), "x").points).toBe(355);
  });
  it("ally stamps cap at 5 and reset returns to 3", () => {
    let s = initialState();
    expect(s.stamps).toBe(3);
    s = applyQr(applyQr(applyQr(s)));
    expect(s.stamps).toBe(5);
  });
  it("bin photo is attached to the feed", () => {
    const s = applyBin(initialState(), "d", "data:x")!;
    expect(s.feed[0]!.photo).toBe("data:x");
  });
});
