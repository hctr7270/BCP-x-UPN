export type CommunityRole = "citizen" | "merchant";
export type Profile = { role: CommunityRole; name: string; motivation: string; zone: string };
export type Offer = { id: string; title: string; cost: number; place: string; emoji: string };
export const COMMERCE_QR = "SUMA-VALORES-COMERCIO-VALIDADO-2026";
export const ZONES = ["🎓 Campus UPN Los Olivos", "🚏 Av. Alfredo Mendiola / Paraderos", "🌳 Parque Zonal Los Olivos"];
export const MOTIVATIONS = {
  citizen: ["🌍 Cuidar mi barrio y universidad", "🎁 Ganar descuentos y pasajes", "🚦 Mejorar el respeto en el transporte", "🤝 Ser parte del cambio positivo"],
  merchant: ["📈 Atraer más vecinos a mi local", "✨ Mantener mi cuadra limpia y ordenada", "💙 Apoyar los valores en mi comunidad"],
};
export function validProfile(profile: Profile) {
  return (profile.role === "citizen" || profile.role === "merchant") && profile.name.trim().length > 0 && profile.name.trim().length <= 80 && MOTIVATIONS[profile.role].includes(profile.motivation) && ZONES.includes(profile.zone);
}
export function validOffer(title: string, cost: number) { return title.trim().length > 0 && title.trim().length <= 100 && Number.isInteger(cost) && cost > 0 && cost <= 100000; }
export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase(); }
export function displayZone(zone: string) { return zone.replace(/^\S+\s/, ""); }
export function newWitnessPin() {
  const values = new Uint32Array(1); crypto.getRandomValues(values);
  return String(1000 + (values[0] ?? 0) % 9000);
}