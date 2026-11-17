import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { ProgressBar } from "@/components/app/ProgressBar";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad – Suma Valores" },
      { name: "description", content: "Ranking amistoso semanal de sectores de Los Olivos y actividad verificada." },
      { property: "og:title", content: "Comunidad – Suma Valores" },
      { property: "og:description", content: "Mira cómo suma tu sector esta semana en Los Olivos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Community,
});

function Community() {
  const { collective, feed } = useCivic();
  const sectors = [
    { name: "Campus UPN Los Olivos", actions: collective },
    { name: "Parque Zonal Lloque Yupanqui", actions: 388 },
    { name: "Paradero Panamericana", actions: 301 },
  ].sort((a, b) => b.actions - a.actions);
  const max = Math.max(...sectors.map((s) => s.actions));
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-5 px-4 pt-4">
      <div>
        <h1 className="text-2xl font-extrabold">Comunidad</h1>
        <p className="text-sm text-muted-foreground">Todos suman. ¡Aquí celebramos cada acción!</p>
      </div>
      <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 flex items-center gap-2 font-bold"><Trophy className="h-5 w-5 text-energy" /> Ranking semanal de sectores</h2>
        <ul className="space-y-4">
          {sectors.map((s, i) => (
            <motion.li key={s.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{medals[i]} {s.name}</span><span className="text-muted-foreground">{s.actions} acciones</span></div>
              <ProgressBar value={(s.actions / max) * 100} barClass={i === 0 ? "bg-energy" : "bg-primary"} />
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Sin listas negras ni penalizaciones: solo reconocemos lo bueno 💙</p>
      </section>
      <section>
        <h2 className="mb-3 font-bold">Actividad verificada reciente</h2>
        <ul className="space-y-2">
          {feed.map((f, i) => (
            <motion.li key={f.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl bg-card p-3 text-xs shadow-[var(--shadow-soft)]">
              <b>{f.name}</b> {f.text} • <span className="text-muted-foreground">{f.ago}</span> • <b className="text-eco">+{f.pts} pts</b>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  );
}
