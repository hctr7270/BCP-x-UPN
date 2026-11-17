import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Armchair, CheckCircle2, Compass, Nfc, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { MAX_SEATS, seatsToday, todayKey } from "@/lib/civic-rules";
import { ProgressBar } from "@/components/app/ProgressBar";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { Sheet } from "@/components/app/Sheet";
import { FloatingPoints } from "@/components/app/FloatingPoints";
import { ResetDemo } from "@/components/app/ResetDemo";
import { celebrate } from "@/components/app/celebrate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/desafios/cadena-de-ayuda")({
  head: () => ({
    meta: [
      { title: "Cadena de Ayuda – Suma Valores" },
      { name: "description", content: "Cede el asiento, asiste a otros o alerta de forma segura en Los Olivos y suma puntos." },
      { property: "og:title", content: "Desafío Cadena de Ayuda – Suma Valores" },
      { property: "og:description", content: "Cede el asiento, asiste o alerta de forma segura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpChain,
});

const WHO = ["👵 Adulto mayor", "🤰 Mujer embarazada", "🩼 Persona con movilidad reducida"];
const VIA = ["📱 Confirmación directa del beneficiario", "👀 Confirmación de testigo / cobrador en ruta (sin app)"];
const ASSIST = ["🧭 Orientar a visitante / estudiante nuevo", "🛍️ Ayudar con paquetes o silla de ruedas", "🩹 Asistencia en incidente menor"];
const ALERTS = ["🚨 Situación de acoso / riesgo en transporte", "🏥 Emergencia médica cercana", "🔦 Punto oscuro / peligro en vía"];
const strip = (x: string) => x.replace(/^\S+\s/, "");

function HelpChain() {
  const s = useCivic();
  const [sheet, setSheet] = useState<"seat" | "assist" | "alert" | null>(null);
  const [float, setFloat] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const seats = seatsToday(s, todayKey());
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
        <h1 className="text-2xl font-extrabold">Cadena de Ayuda</h1>
        <p className="text-sm text-muted-foreground">Cede el asiento, asiste o alerta de forma segura</p>
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold text-muted-foreground">Zona: Corredor Norte & Campus UPN Los Olivos</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-help/15 px-2.5 py-1 text-xs font-bold text-help">96% Red de Apoyo Activa</span>
          <span className="text-right text-xs text-muted-foreground">52 actos solidarios registrados hoy</span>
        </div>
        <ProgressBar value={96} barClass="bg-help" className="mt-3" />
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Validación dual NFC/Testigo activa:</b> Si el beneficiario no usa smartphone, un testigo cercano o conductor confirma el gesto (máx. 2/día).</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Elige cómo sumar</h2>
        <ActionCard icon={Armchair} iconBg="bg-help text-help-foreground" title='"Asiento Solidario" – Tap NFC/QR' desc="Cede el asiento en buses o salas de espera." pts="+20 pts">
          <span className={cn("mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold", seats >= MAX_SEATS ? "bg-eco/15 text-eco" : "bg-secondary text-secondary-foreground")}>Asientos solidarios hoy: {seats}/{MAX_SEATS}</span>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSheet("seat")} className="mt-3 w-full rounded-xl bg-help py-2.5 text-sm font-bold text-help-foreground">Registrar asiento cedido</motion.button>
        </ActionCard>
        <ActionCard icon={Compass} iconBg="bg-primary text-primary-foreground" title="Asistencia Rápida en Campus / Calle" desc="Ayuda a quien necesita orientación o apoyo físico." pts="+15 pts">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSheet("assist")} className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">Registrar asistencia ciudadana</motion.button>
        </ActionCard>
        <div className="rounded-2xl border-2 border-caution bg-primary p-4 text-primary-foreground shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-caution text-primary"><ShieldAlert className="h-5 w-5" /></div>
            <div className="flex-1"><p className="text-sm font-bold">"Alerta Segura Discreta"</p><p className="text-[11px] opacity-80">Reporta acoso, emergencias o zonas de riesgo sin exponerte.</p></div>
            <span className="text-xs font-bold text-caution">+15 pts</span>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSheet("alert")} className="mt-3 w-full rounded-xl bg-caution py-2.5 text-sm font-bold text-primary">Activar Alerta Segura Discreta</motion.button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-help" /> En vivo: Cadena de Ayuda</h2>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {s.helpFeed.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-help/15 text-xs font-bold text-help">{f.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1 text-xs"><p><b>{f.name}</b> {f.text}</p><p className="text-muted-foreground">{f.ago}</p></div>
                <span className="text-xs font-bold text-eco">+{f.pts} pts</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <FlowSheet key={`s${resetKey}`} open={sheet === "seat"} onClose={() => setSheet(null)} title="Asiento Solidario"
        groups={[{ label: "¿A quién cediste el asiento?", options: WHO }, { label: "Validación (Anti-Trampa + Inclusión)", options: VIA }]}
        disabled={seats >= MAX_SEATS} disabledMsg="Ya registraste tus 2 asientos solidarios de hoy 🙌 ¡Gracias por tu gran corazón!"
        cta="Simular Tap NFC en respaldo de asiento (+20 pts)" duration={1200}
        scanMsg="Leyendo etiqueta NFC Asiento #07 – Ruta Los Olivos..."
        doneMsg={(v) => (v[1]!.startsWith("👀") ? "¡Gesto solidario confirmado por testigo en ruta!" : "¡Gesto solidario confirmado por el beneficiario!")}
        onDone={(v) => { if (s.seat(strip(v[0]!), v[1]!.startsWith("👀") ? "testigo" : "beneficiario")) reward(20); }} />
      <FlowSheet key={`a${resetKey}`} open={sheet === "assist"} onClose={() => setSheet(null)} title="Asistencia ciudadana"
        groups={[{ label: "¿Cómo ayudaste?", options: ASSIST }]} cta="Simular confirmación de ayuda (+15 pts)" duration={1000}
        scanMsg="Validando ayuda con testigo cercano..." doneMsg={() => "¡Ayuda confirmada! +15 pts por sumar a la cadena"}
        onDone={(v) => { s.assist(strip(v[0]!)); reward(15); }} />
      <FlowSheet key={`l${resetKey}`} open={sheet === "alert"} onClose={() => setSheet(null)} title="Alerta Segura Discreta" discreetToggle
        groups={[{ label: "Tipo de alerta", options: ALERTS }]} cta="Simular envío de alerta segura (+15 pts)" duration={1500}
        scanMsg="Enviando ubicación GPS encriptada a Seguridad UPN / Serenazgo Los Olivos..."
        doneMsg={() => "✅ Unidad de apoyo alertada de forma anónima. Gracias por proteger a tu comunidad (+15 pts)"}
        onDone={(v) => { s.alert(strip(v[0]!)); reward(15); }} />
    </div>
  );
}

function ActionCard({ icon: Icon, iconBg, title, desc, pts, children }: { icon: typeof Compass; iconBg: string; title: string; desc: string; pts: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}><Icon className="h-5 w-5" /></div>
        <div className="flex-1"><p className="text-sm font-bold">{title}</p><p className="text-[11px] text-muted-foreground">{desc}</p></div>
        <span className="text-xs font-bold text-energy">{pts}</span>
      </div>
      {children}
    </div>
  );
}

type FlowProps = {
  open: boolean; onClose: () => void; title: string;
  groups: { label: string; options: string[] }[];
  cta: string; duration: number; scanMsg: string; doneMsg: (v: string[]) => string;
  onDone: (v: string[]) => void; disabled?: boolean; disabledMsg?: string; discreetToggle?: boolean;
};

function FlowSheet({ open, onClose, title, groups, cta, duration, scanMsg, doneMsg, onDone, disabled, disabledMsg, discreetToggle }: FlowProps) {
  const [values, setValues] = useState<string[]>(() => groups.map((g) => g.options[0]!));
  const [phase, setPhase] = useState<"idle" | "scan" | "done">("idle");
  const [discreet, setDiscreet] = useState(false);
  const close = () => { setPhase("idle"); onClose(); };
  const run = () => {
    setPhase("scan");
    setTimeout(() => { setPhase("done"); onDone(values); }, duration);
  };
  return (
    <Sheet open={open} onClose={close} title={title}>
      <div className={cn("space-y-4 transition-opacity", discreet && "opacity-60")}>
        {groups.map((g, gi) => (
          <div key={g.label}>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => (
                <button key={o} disabled={phase !== "idle"} onClick={() => setValues((v) => v.map((x, i) => (i === gi ? o : x)))}
                  className={cn("rounded-full border px-3 py-1.5 text-left text-xs font-semibold", values[gi] === o ? "border-help bg-help text-help-foreground" : "border-border bg-card")}>{o}</button>
              ))}
            </div>
          </div>
        ))}
        {discreetToggle && (
          <button role="switch" aria-checked={discreet} onClick={() => setDiscreet((d) => !d)} className="flex w-full items-center justify-between rounded-2xl bg-secondary p-3 text-sm font-semibold">
            Modo pantalla discreta (silencioso)
            <span className={cn("relative h-6 w-11 rounded-full transition-colors", discreet ? "bg-help" : "bg-muted-foreground/30")}>
              <motion.span layout className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-card shadow", discreet ? "right-0.5" : "left-0.5")} />
            </span>
          </button>
        )}
      </div>
      {phase !== "idle" && (
        <div className="relative mt-4 flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-foreground">
          {phase === "done" ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="h-12 w-12 text-eco" /></motion.div>
          ) : (
            <>
              {[0, 0.3, 0.6].map((d) => (
                <motion.div key={d} className="absolute h-14 w-14 rounded-full border-2 border-help" animate={{ scale: [0.4, 2.4], opacity: [1, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: d }} />
              ))}
              <Nfc className="h-8 w-8 text-primary-foreground" />
            </>
          )}
          <p className="absolute inset-x-3 bottom-2 text-center text-[11px] font-semibold text-primary-foreground">{phase === "scan" ? scanMsg : doneMsg(values)}</p>
        </div>
      )}
      {disabled && phase === "idle" && <p className="mt-4 rounded-2xl bg-secondary p-3 text-center text-xs">{disabledMsg}</p>}
      {phase === "done" ? (
        <button onClick={close} className="mt-4 w-full rounded-2xl bg-eco py-3 text-sm font-bold text-eco-foreground">¡Genial!</button>
      ) : (
        <button disabled={phase === "scan" || disabled} onClick={run} className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{cta}</button>
      )}
    </Sheet>
  );
}
