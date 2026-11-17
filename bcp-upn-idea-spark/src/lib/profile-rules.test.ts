import { describe, expect, it } from "vitest";
import { useCivic } from "./civic-store";
import { initialState, applyRedeem } from "./civic-rules";
import { COMMERCE_QR, MOTIVATIONS, ZONES, newWitnessPin, validOffer, validProfile, type Profile } from "./profile-rules";
const citizen: Profile = { role: "citizen", name: "María de los Ángeles", motivation: MOTIVATIONS.citizen[0] ?? "", zone: ZONES[0] ?? "" };
const merchant: Profile = { role: "merchant", name: "Bodega La Esquina", motivation: MOTIVATIONS.merchant[0] ?? "", zone: ZONES[1] ?? "" };
describe("onboarding and merchant demo", () => {
  it("registration preserves exact entered name and requires all four answers", () => {
    expect(validProfile(citizen)).toBe(true);
    expect(validProfile({ ...citizen, name: " " })).toBe(false);
    expect(validProfile({ ...citizen, motivation: "" })).toBe(false);
    useCivic.setState(initialState()); expect(useCivic.getState().register(citizen)).toBe(true);
    expect(useCivic.getState().profile?.name).toBe("María de los Ángeles"); expect(useCivic.getState().points).toBe(340);
  });
  it("merchant publishes Jugo natural 2x1 at 120 pts across role changes", () => {
    useCivic.setState(initialState()); useCivic.getState().register(merchant);
    expect(useCivic.getState().publishOffer("Jugo natural 2x1", 120)).toBe(true);
    useCivic.getState().register(citizen);
    const offer = useCivic.getState().offers[0]; expect(offer?.title).toBe("Jugo natural 2x1"); expect(offer?.cost).toBe(120);
    if (!offer) throw new Error("no offer");
    expect(applyRedeem(useCivic.getState(), offer.id, "SV-JUGO-TEST")?.points).toBe(220);
  });
  it("invalid offers and citizen publishing are rejected", () => {
    expect(validOffer("Jugo", 0)).toBe(false); expect(validOffer("Jugo", 1.5)).toBe(false);
    useCivic.setState(initialState()); useCivic.getState().register(citizen);
    expect(useCivic.getState().publishOffer("Jugo", 120)).toBe(false);
  });
  it("coupon validation adds one sale only once and rejects unknown QR", () => {
    useCivic.setState(initialState()); const code = useCivic.getState().redeem("cafe"); if (!code) throw new Error("no coupon");
    useCivic.getState().register(merchant);
    expect(useCivic.getState().acceptCoupon(code)).toBe("ok"); expect(useCivic.getState().merchantCoupons).toBe(20);
    expect(useCivic.getState().acceptCoupon(code)).toBe("used"); expect(useCivic.getState().merchantCoupons).toBe(20);
    expect(useCivic.getState().acceptCoupon("SV-FAKE-123456")).toBe("invalid");
  });
  it("witness PIN is four digits and confirmation consumes it once", () => {
    expect(newWitnessPin()).toMatch(/^[1-9]\d{3}$/);
    useCivic.setState(initialState()); useCivic.getState().register(merchant);
    expect(useCivic.getState().generateWitness()).toMatch(/^\d{4}$/);
    expect(useCivic.getState().confirmWitness()).toBe(true); expect(useCivic.getState().witnessedRescues).toBe(1);
    expect(useCivic.getState().confirmWitness()).toBe(false);
  });
  it("point-clean QR payload and daily container counter are concrete", () => {
    expect(COMMERCE_QR).toBe("SUMA-VALORES-COMERCIO-VALIDADO-2026");
    useCivic.setState(initialState()); useCivic.getState().register(merchant); useCivic.getState().receiveContainer();
    expect(useCivic.getState().containersCount).toBe(1);
  });
  it("reset restores 340/420 while retaining profile and published offers", () => {
    useCivic.setState(initialState()); useCivic.getState().register(merchant); useCivic.getState().publishOffer("Jugo", 120);
    useCivic.getState().reset(); expect(useCivic.getState().offers[0]?.cost).toBe(120);
    expect(useCivic.getState().profile?.name).toBe("Bodega La Esquina"); expect([useCivic.getState().points, useCivic.getState().collective]).toEqual([340, 420]);
  });
});