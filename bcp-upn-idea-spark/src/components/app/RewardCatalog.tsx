import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./Sheet";
import { useCivic } from "@/lib/civic-store";
import { REWARDS } from "@/lib/civic-rules";
import { celebrate } from "./celebrate";

export function RewardCatalog({ compact = false }: { compact?: boolean }) {
  const s = useCivic(); const rewards = [...REWARDS, ...s.offers];
  const [coupon, setCoupon] = useState<{ code: string; title: string } | null>(null);
  return <section><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-bold">{compact ? "🎁 Beneficios listos para ti" : "Beneficios"}</h2>{compact && <Link to="/beneficios" className="text-xs font-semibold text-primary">Ver todos →</Link>}</div><ul className="space-y-3">{rewards.map((r) => <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]"><span className="text-2xl">{r.emoji}</span><div className="min-w-0 flex-1"><h3 className="break-words text-xs font-bold">{r.title}</h3><p className="text-[10px] text-muted-foreground">{r.place}</p><p className="text-xs font-bold text-energy">{r.cost} pts</p></div><Button size="sm" disabled={s.points < r.cost} onClick={() => { const code = s.redeem(r.id); if (code) { setCoupon({ code, title: r.title }); void celebrate(); } }} className="h-auto w-20 shrink-0 whitespace-normal rounded-xl py-2 text-[11px]">{s.points >= r.cost ? "Canjear ahora" : `Faltan ${r.cost - s.points} pts`}</Button></li>)}</ul>
    {!compact && s.redemptions.length > 0 && <div className="mt-5"><h2 className="mb-2 text-sm font-bold">Mis cupones</h2>{s.redemptions.map((r) => <Button key={r.id} variant="outline" onClick={() => setCoupon({ code: r.code, title: r.title ?? rewards.find((x) => x.id === r.rewardId)?.title ?? "Beneficio" })} className="mb-2 h-auto w-full justify-start whitespace-normal p-3 text-left text-xs">{r.title ?? rewards.find((x) => x.id === r.rewardId)?.title} · {r.used ? "Canjeado en comercio" : "Listo para usar"}</Button>)}</div>}
    <Sheet open={coupon !== null} onClose={() => setCoupon(null)} title="Tu cupón está listo 🎉">{coupon && <div className="flex flex-col items-center text-center"><p className="text-sm font-semibold">{coupon.title}</p><div className="my-4 rounded-xl bg-card p-4"><QRCodeSVG value={coupon.code} size={190} marginSize={4} /></div><p className="break-all font-mono text-xs font-bold text-primary">{coupon.code}</p><p className="mt-2 text-xs text-muted-foreground">Muestra este código en caja del comercio aliado.</p></div>}</Sheet>
  </section>;
}