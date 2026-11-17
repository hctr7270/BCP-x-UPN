import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Car, HeartHandshake, ShieldCheck } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { MAX_RECOG, recogToday, todayKey } from "@/lib/civic-rules";
import { ProgressBar } from "@/components/app/ProgressBar";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { KindP2P, KindRoad } from "@/components/app/KindnessActions";
import { Button } from "@/components/ui/button";
import { FloatingPoints } from "@/components/app/FloatingPoints";
import { ResetDemo } from "@/components/app/ResetDemo";
import { celebrate } from "@/components/app/celebrate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/desafios/buena-convivencia")({
  head: () => ({
    meta: [
      { title: "Buena Convivencia – Suma Valores" },
      { name: "description", content: "Reconoce gestos de respeto y cortesía vial en UPN Los Olivos y suma puntos." },
      { property: "og:title", content: "Desafío Buena Convivencia – Suma Valores" },
      { property: "og:description", content: "Respeta turnos, da el paso y convive sin agresiones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kindness,
});

function Kindness() {
  const s = useCivic();
  const [sheet, setSheet] = useState<"p2p" | "road" | null>(null);
  const [float, setFloat] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => useCivic.subscribe((state, previous) => {
    if (state.kindFeed[0]?.id === "k1" && previous.kindFeed[0]?.id !== "k1") { setSheet(null); setFloat(null); setResetKey((k) => k + 1); }
  }), []);
  const recog = recogToday(s, todayKey());
  const reward = (pts: number) => {
    void celebrate();
    setFloat(pts);
    setTimeout(() => setFloat(null), 1300);
  };

  return (
    <div className="space-y-5 px-4 pt-4">
      <FloatingPoints show={float !== null} pts={float ?? 0} />
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"><AnimatedNumber value={s.points} /> pts</span>
          <ResetDemo onReset={() => { setSheet(null); setResetKey((k) => k + 1); }} />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-extrabold">Buena Convivencia</h1>
        <p className="text-sm text-muted-foreground">Respeta turnos, da el paso y convive sin agresiones</p>
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold text-muted-foreground">Zona: Campus y Alrededores UPN Los Olivos</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-kind/15 px-2.5 py-1 text-xs font-bold text-kind">89% Índice de Cordialidad</span>
          <span className="text-right text-xs text-muted-foreground">94 gestos de respeto registrados hoy</span>
        </div>
        <ProgressBar value={89} barClass="bg-kind" className="mt-3" />
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Escudo anti-colusión activo:</b> Máx. 2 reconocimientos/día y bloqueo de intercambio repetido entre amigos (7 días).</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Elige cómo sumar</h2>
        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kind text-kind-foreground"><HeartHandshake className="h-5 w-5" /></div>
            <div className="flex-1"><p className="text-sm font-bold">Reconocimiento Express P2P</p><p className="text-[11px] text-muted-foreground">+5 pts por agradecer / +10 pts al ciudadano ejemplar</p></div>
          </div>
          <span className={cn("mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold", recog >= MAX_RECOG ? "bg-eco/15 text-eco" : "bg-secondary text-secondary-foreground")}>Reconocimientos enviados hoy: {recog}/{MAX_RECOG}</span>
          <Button onClick={() => setSheet("p2p")} className="mt-3 h-auto w-full whitespace-normal rounded-xl bg-kind py-2.5 text-sm font-bold text-kind-foreground">Reconocer gesto de respeto</Button>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Car className="h-5 w-5" /></div>
            <div className="flex-1"><p className="text-sm font-bold">Cortesía Vial – Paso Peatonal</p><p className="text-[11px] text-muted-foreground">Premia al conductor que te dio el paso sin claxon.</p></div>
            <span className="text-xs font-bold text-energy">+15 pts</span>
          </div>
          <Button onClick={() => setSheet("road")} className="mt-3 h-auto w-full whitespace-normal rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">Agradecer paso peatonal sin claxon</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-kind" /> En vivo: Buena Convivencia</h2>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {s.kindFeed.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kind/15 text-xs font-bold text-kind">{f.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1 text-xs"><p><b>{f.name}</b> {f.text}</p><p className="text-muted-foreground">{f.ago}</p>{f.kindEvidence && <p className="mt-1 text-[10px] text-muted-foreground">{f.kindEvidence.source === "backup" ? "Modo respaldo · No verificado" : "Verificado · Sensores reales"}{f.kindEvidence.averageDb !== undefined && ` • Promedio: ${Math.round(f.kindEvidence.averageDb)} dB estimados • Sin pico sonoro 4s`}{f.kindEvidence.recipientPoints && ` • +${f.kindEvidence.recipientPoints} pts asociados al ciudadano`}{f.kindEvidence.position && ` • GPS ${f.kindEvidence.position.lat.toFixed(5)}, ${f.kindEvidence.position.lng.toFixed(5)}`} • {new Date(f.kindEvidence.at).toLocaleString("es-PE")}</p>}</div>
                <span className="text-xs font-bold text-eco">+{f.pts} pts</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      {sheet === "p2p" && <KindP2P key={`p${resetKey}`} onClose={() => setSheet(null)} onReward={reward} />}
      {sheet === "road" && <KindRoad key={`r${resetKey}`} onClose={() => setSheet(null)} onReward={reward} />}
    </div>
  );
}
