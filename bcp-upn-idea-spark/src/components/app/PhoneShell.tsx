import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Users, Gift, Store, QrCode, Tags, Repeat2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResetDemo } from "./ResetDemo";
import { Onboarding } from "./Onboarding";
import { MerchantPortal } from "./MerchantPortal";
import { stopKindnessSensors } from "@/lib/kindness-sensors";
import { useCivic } from "@/lib/civic-store";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/comunidad", label: "Comunidad", icon: Users },
  { to: "/beneficios", label: "Beneficios", icon: Gift },
] as const;

export function PhoneShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const profile = useCivic((s) => s.profile);
  const [hydrated, setHydrated] = useState(false), [intro, setIntro] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);
  useEffect(() => {
    Promise.resolve(useCivic.persist.rehydrate()).then(() => setHydrated(true));
  }, []);
  const onboarding = !profile || intro;
  const merchant = profile?.role === "merchant";
  const currentTabs = merchant ? [{ to: "/", label: "Panel Local", icon: Store }, { to: "/comercio/validar", label: "Validar QR", icon: QrCode }, { to: "/comercio/ofertas", label: "Mis Ofertas", icon: Tags }] as const : tabs;
  return (
    <div className="min-h-screen bg-stage md:flex md:items-center md:justify-center md:py-8">
      <div className="relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-background md:h-[860px] md:max-h-[94vh] md:w-[400px] md:rounded-[3rem] md:border-[10px] md:border-foreground md:shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-2 z-50 hidden h-6 w-28 -translate-x-1/2 rounded-full bg-foreground md:block" />
        {hydrated && !onboarding && <div className="z-30 mt-3 flex flex-wrap justify-end gap-1 px-4 md:mt-8"><ResetDemo onReset={() => setResetEpoch((n) => n + 1)} /><Button variant="ghost" onClick={() => { stopKindnessSensors(); setIntro(true); }} className="h-auto rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground"><Repeat2 />Cambiar rol / Intro</Button></div>}
        <main className={cn("relative flex-1 overflow-y-auto overflow-x-hidden", onboarding ? "md:pt-6" : "pb-24")}>
          {!hydrated ? <div className="p-8 text-center text-sm text-primary">Suma Valores</div> : onboarding ? <Onboarding onComplete={() => { setIntro(false); void navigate({ to: "/" }); }} /> :
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${pathname}-${resetEpoch}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              {merchant && !pathname.startsWith("/comercio/") ? <MerchantPortal /> : !merchant && pathname.startsWith("/comercio/") ? <div className="p-5"><Link to="/" className="text-primary">Volver a mis desafíos</Link></div> : children}
            </motion.div>
          </AnimatePresence>}
        </main>
        <div id="phone-portal" />
        {hydrated && !onboarding && <nav className="absolute inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card/95 px-2 pb-4 pt-2 backdrop-blur">
          {currentTabs.map((t) => {
            const active = t.to === "/" ? pathname === "/" || pathname.startsWith("/desafios") : pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={cn("relative flex flex-1 flex-col items-center gap-1 py-1 text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}>
                {active && <motion.span layoutId="tab" className="absolute -top-2 h-1 w-10 rounded-full bg-energy" />}
                <t.icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </nav>}
      </div>
    </div>
  );
}
