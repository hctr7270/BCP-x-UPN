import { describe, expect, it } from "vitest";
import { passportMrz, personalQr } from "./passport-rules";
import { parsePassport } from "./kindness-rules";
import { useCivic } from "./civic-store";
import { initialState } from "./civic-rules";
import { MOTIVATIONS, ZONES } from "./profile-rules";
describe("passport", () => {
  it("MRZ uses holder, streak 05 and actual 340 points", () => {
    const mrz = passportMrz("Luis Pérez", 340, 5);
    expect(mrz[0]).toBe("P<PER<LUIS<PEREZ<<UPN<LOS<OLIVOS<<<<<<<<<<");
    expect(mrz[1]).toBe("SV20260842<3PER<NIVEL03<RACHA05D<340PTS<<<<<<<<<<<");
  });
  it("personal QR is accepted by recognition decoder", () => {
    expect(personalQr("Luis Pérez")).toBe("SUMA-VALORES-USER-Luis Pérez");
    expect(parsePassport(personalQr("Luis Pérez"))?.name).toBe("Luis Pérez");
  });
  it("successful actions accumulate points while refused daily actions do not", () => {
    useCivic.setState(initialState());
    useCivic.getState().validateBin(); useCivic.getState().validateBin(); useCivic.getState().scanQr();
    expect(useCivic.getState().passportStats.eco).toEqual({ actions: 2, points: 20, details: { bin: 1, recycle: 1 } });
    useCivic.getState().boardQueue(); useCivic.getState().cross();
    expect(useCivic.getState().passportStats.order.points).toBe(25);
    useCivic.getState().recognize("Respeto"); useCivic.getState().courtesy("Taxi");
    expect(useCivic.getState().passportStats.kind.points).toBe(20);
    useCivic.getState().seat("Mayor", "Testigo"); useCivic.getState().assist("Orientación"); useCivic.getState().alert("Seguridad");
    expect(useCivic.getState().passportStats.help.points).toBe(50);
  });
  it("editing renames personal feeds but not anonymous alerts", () => {
    useCivic.setState(initialState()); useCivic.getState().assist("Orientación"); useCivic.getState().alert("Seguridad");
    useCivic.getState().updatePassport({ role: "citizen", name: "Luis", zone: ZONES[0] ?? "", motivation: MOTIVATIONS.citizen[0] ?? "" });
    expect(useCivic.getState().helpFeed[1]?.name).toBe("Luis"); expect(useCivic.getState().helpFeed[0]?.name).toBe("Ciudadano anónimo");
  });
  it("reset keeps photo/profile while zeroing statistics and restoring 340", () => {
    useCivic.setState(initialState()); useCivic.getState().setAvatar("data:image/jpeg;base64,ABC"); useCivic.getState().scanQr();
    useCivic.getState().reset(); expect(useCivic.getState().points).toBe(340); expect(useCivic.getState().avatarUrl).toBe("data:image/jpeg;base64,ABC"); expect(useCivic.getState().passportStats.eco.actions).toBe(0);
  });
});