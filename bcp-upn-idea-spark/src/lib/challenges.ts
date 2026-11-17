import { Leaf, ListOrdered, HeartHandshake, HandHelping, type LucideIcon } from "lucide-react";

export type Challenge = { id: string; title: string; subtitle: string; icon: LucideIcon; active: boolean; badge: string; tone?: "eco" | "energy" | "kind" | "help" };

// Flip `active` to unlock a challenge in later iterations.
export const CHALLENGES: Challenge[] = [
  { id: "espacios-limpios", title: "Espacios Limpios", subtitle: "Cuida parques, calles y espacios comunes", icon: Leaf, active: true, badge: "Disponible", tone: "eco" },
  { id: "modo-orden", title: "Modo Orden", subtitle: "Respeta colas, señales y normas sin supervisión", icon: ListOrdered, active: true, badge: "Disponible", tone: "energy" },
  { id: "buena-convivencia", title: "Buena Convivencia", subtitle: "Respeta turnos, da el paso y convive sin agresiones", icon: HeartHandshake, active: true, badge: "Disponible", tone: "kind" },
  { id: "cadena-de-ayuda", title: "Cadena de Ayuda", subtitle: "Cede el asiento, asiste o alerta de forma segura", icon: HandHelping, active: true, badge: "Disponible", tone: "help" },
];
