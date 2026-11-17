import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { CHALLENGES } from "@/lib/challenges";
import { CivicPassport } from "@/components/app/CivicPassport";
import { ProgressBar } from "@/components/app/ProgressBar";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { cn } from "@/lib/utils";
import { RewardCatalog } from "@/components/app/RewardCatalog";
import { displayZone } from "@/lib/profile-rules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio – Suma Valores, Pasaporte Cívico" },
      { name: "description", content: "Tu pasaporte cívico: suma puntos con acciones positivas en UPN Los Olivos." },
      { property: "og:title", content: "Suma Valores – Pasaporte Cívico" },
      { property: "og:description", content: "Suma puntos con acciones positivas en tu barrio y campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { collective, collectiveGoal, profile } = useCivic();
  return (
    <div className="space-y-5 px-4 pt-4">
      <CivicPassport />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-energy"><Users className="h-4 w-4" /> Meta colectiva del sector</div>
        <h2 className="mt-1 text-lg font-bold">{displayZone(profile?.zone ?? "Campus UPN Los Olivos")}</h2>
        <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground"><AnimatedNumber value={collective} /></span> / {collectiveGoal} acciones esta semana</p>
        <ProgressBar value={(collective / collectiveGoal) * 100} className="mt-3" />
        <p className="mt-3 text-xs text-muted-foreground">Al llegar a 500 acciones, todos desbloquean <b className="text-primary">20% de descuento en Cafetería Central</b> 🎉</p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Tus desafíos cívicos</h2>
          {CHALLENGES.every((c) => c.active) && (
            <span className="rounded-full bg-energy/15 px-2.5 py-1 text-[10px] font-semibold text-energy">✨ Pasaporte Cívico Completo (4/4 Desafíos Activos)</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGES.map((c, i) => {
            const body = (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileTap={{ scale: c.active ? 0.96 : 1 }}
                className={cn("relative flex h-full flex-col rounded-2xl border-2 bg-card p-4 shadow-[var(--shadow-soft)]", c.active ? (c.tone === "energy" ? "border-energy" : c.tone === "kind" ? "border-kind" : c.tone === "help" ? "border-help" : "border-eco") : "border-transparent opacity-70")}>
                <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", c.active ? (c.tone === "energy" ? "bg-energy text-energy-foreground" : c.tone === "kind" ? "bg-kind text-kind-foreground" : c.tone === "help" ? "bg-help text-help-foreground" : "bg-eco text-eco-foreground") : "bg-muted text-muted-foreground")}>
                  <c.icon className="h-5 w-5" />
                </div>
                {!c.active && <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />}
                <h3 className="text-sm font-bold leading-tight">{c.title}</h3>
                <p className="mt-1 flex-1 text-[11px] text-muted-foreground">{c.subtitle}</p>
                <span className={cn("mt-3 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold", c.active ? (c.tone === "energy" ? "bg-energy/15 text-energy" : c.tone === "kind" ? "bg-kind/15 text-kind" : c.tone === "help" ? "bg-help/15 text-help" : "bg-eco/15 text-eco") : "bg-muted text-muted-foreground")}>{c.badge}</span>
              </motion.div>
            );
            if (c.id === "espacios-limpios") return <Link key={c.id} to="/desafios/espacios-limpios">{body}</Link>;
            if (c.id === "cadena-de-ayuda") return <Link key={c.id} to="/desafios/cadena-de-ayuda">{body}</Link>;
            if (c.id === "buena-convivencia") return <Link key={c.id} to="/desafios/buena-convivencia">{body}</Link>;
            if (c.id === "modo-orden") return <Link key={c.id} to="/desafios/modo-orden">{body}</Link>;
            return (
              <Link key={c.id} to="/desafios/$id" params={{ id: c.id }}>{body}</Link>
            );
          })}
        </div>
      </section>
      <RewardCatalog compact />
    </div>
  );
}
