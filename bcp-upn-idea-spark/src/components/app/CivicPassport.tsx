import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Check, ImagePlus, UserRound, X, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { AnimatedNumber } from "./AnimatedNumber";
import { useCivic } from "@/lib/civic-store";
import { CHALLENGES } from "@/lib/challenges";
import { MAX_STAMPS } from "@/lib/civic-rules";
import { displayZone, initials, MOTIVATIONS, ZONES } from "@/lib/profile-rules";
import { personalQr } from "@/lib/passport-rules";
import { compressPhoto, cropPhoto } from "@/lib/passport-photo";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

const LOGO = "UPN × BCP • UN MEJOR PERÚ 2026";

function Curves({ className }: { className?: string }) {
  return <svg viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
    <path d="M300 30 C190 0 120 80 130 190 C140 280 210 330 190 400 L300 400 Z" className="fill-pp-mint opacity-60" />
    <path d="M300 150 C230 220 130 260 110 330 C100 370 120 400 120 400 L300 400 Z" className="fill-pp-mint opacity-50" />
  </svg>;
}

function Avatar({ className, round = false }: { className?: string; round?: boolean }) {
  const { avatarUrl, profile } = useCivic();
  return <div className={cn("relative overflow-hidden border-2 border-pp-ink/80 bg-pp-mint", round ? "aspect-square rounded-full" : "aspect-[3/4] rounded-2xl", className)}>
    {avatarUrl ? <img src={avatarUrl} alt="Foto del titular" className="h-full w-full object-cover" /> :
      <div className="flex h-full flex-col items-center justify-center gap-1 text-pp-ink"><span className="font-display text-2xl font-extrabold">{initials(profile?.name ?? "")}</span><Camera className="h-4 w-4 opacity-60" /></div>}
  </div>;
}

export function CivicPassport() {
  const s = useCivic(); const [open, setOpen] = useState(false); const reduced = useReducedMotion();
  return <>
    <motion.button type="button" whileTap={reduced ? {} : { scale: 0.98, rotateY: -6 }} style={{ transformPerspective: 900, transformOrigin: "left center" }} onClick={() => setOpen(true)} aria-label="Abrir Mi Pasaporte Cívico"
      className="relative block w-full overflow-hidden rounded-l-md rounded-r-2xl border-l-4 border-pp-spine bg-pp-green p-4 pl-5 text-left text-pp-ink shadow-xl">
      <Curves className="opacity-60" />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-pp-ink/25 to-transparent" />
      <div className="relative flex items-end justify-between gap-2 py-3">
        <span className="font-display text-3xl font-extrabold leading-none -rotate-3">Pasaporte<br />Cívico</span>
        <span className="font-display text-sm font-bold -rotate-3">UPN × BCP<br />2026</span>
      </div>
      <div className="relative mt-2 flex items-center gap-3 rounded-2xl bg-pp-paper/90 p-2">
        <Avatar round className="w-11 shrink-0" />
        <p className="min-w-0 flex-1 truncate text-xs font-bold uppercase">{s.profile?.name} <span className="font-semibold normal-case">• Nivel 3 • <AnimatedNumber value={s.points} /> pts · 🔥 {s.streak}</span></p>
      </div>
      <motion.span animate={reduced ? {} : { scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="relative mt-3 inline-flex rounded-full bg-pp-ink px-3 py-1.5 text-xs font-bold text-pp-paper">Toca para abrir tu Pasaporte 📖</motion.span>
    </motion.button>
    {open && <PassportBook onClose={() => setOpen(false)} />}
  </>;
}

type View = "pages" | "edit" | "qr";
const PAGES = ["Identidad", "Equipaje", "Estadísticas", "Conexiones", "Sellos"];

function PassportBook({ onClose }: { onClose: () => void }) {
  const [el, setEl] = useState<HTMLElement | null>(null); const [page, setPage] = useState(0), [dir, setDir] = useState(1), [view, setView] = useState<View>("pages"), [coverOpen, setCoverOpen] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => setEl(document.getElementById("phone-portal")), []);
  useEffect(() => { const t = setTimeout(() => setCoverOpen(true), reduced ? 0 : 350); return () => clearTimeout(t); }, [reduced]);
  if (!el) return null;
  const go = (n: number) => { if (n < 0 || n >= PAGES.length) return; setDir(n > page ? 1 : -1); setPage(n); };
  const content = [<IdentityPage key={0} onEdit={() => setView("edit")} onQr={() => setView("qr")} />, <LuggagePage key={1} onEdit={() => setView("edit")} />, <StatsPage key={2} />, <ConnectionsPage key={3} />, <StampsPage key={4} onClose={onClose} />][page];
  return createPortal(<motion.div role="dialog" aria-label="Mi Pasaporte Cívico" className="absolute inset-0 z-50 flex flex-col bg-pp-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="flex items-center justify-between px-4 pb-2 pt-4 text-pp-paper">
      <Button variant="ghost" size="sm" className="text-pp-paper hover:bg-pp-paper/10 hover:text-pp-paper" onClick={() => setView(view === "edit" ? "pages" : "edit")}><Pencil />{view === "edit" ? "Ver pasaporte" : "Editar"}</Button>
      <span className="text-xs font-semibold opacity-70">{view === "pages" ? `${page + 1} / ${PAGES.length} · ${PAGES[page]}` : view === "edit" ? "Editar datos" : "Mi QR Cívico"}</span>
      <Button variant="ghost" size="sm" className="text-pp-paper hover:bg-pp-paper/10 hover:text-pp-paper" onClick={onClose}><X />Cerrar</Button>
    </div>
    <div className="relative min-h-0 flex-1 px-4" style={{ perspective: 1400 }}>
      {view === "pages" ? <>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={page} className="relative h-full" style={{ transformOrigin: dir > 0 ? "left center" : "right center" }}
            initial={reduced ? false : { rotateY: dir * 35, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={reduced ? {} : { rotateY: -dir * 35, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 26 }}
            drag={reduced ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={(_, i) => { if (i.offset.x < -60) go(page + 1); else if (i.offset.x > 60) go(page - 1); }}>
            {content}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 rounded-l-3xl bg-gradient-to-r from-pp-ink/30 to-transparent" />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>{!coverOpen || !reduced ? <motion.div key="cover" aria-hidden={coverOpen} className="pointer-events-none absolute inset-y-0 left-4 right-4 z-10" style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
          initial={{ rotateY: 0 }} animate={{ rotateY: coverOpen ? -165 : 0, opacity: coverOpen ? 0 : 1 }} transition={{ type: "spring", stiffness: 60, damping: 16, opacity: { delay: 0.5, duration: 0.3 } }}>
          <Cover />
        </motion.div> : null}</AnimatePresence>
      </> : <div className="h-full overflow-y-auto rounded-3xl bg-card p-4 text-foreground">{view === "edit" ? <PassportEditor onDone={() => setView("pages")} /> : <PersonalQr />}</div>}
    </div>
    {view === "pages" ? <div className="flex items-center justify-between gap-2 px-4 py-3 text-pp-paper">
      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => go(page - 1)} className="text-pp-paper hover:bg-pp-paper/10 hover:text-pp-paper"><ChevronLeft />Anterior</Button>
      <div className="flex gap-1.5">{PAGES.map((p, i) => <button key={p} aria-label={`Ir a página ${p}`} onClick={() => go(i)} className={cn("h-2 rounded-full transition-all", i === page ? "w-5 bg-pp-green" : "w-2 bg-pp-paper/40")} />)}</div>
      <Button variant="ghost" size="sm" disabled={page === PAGES.length - 1} onClick={() => go(page + 1)} className="text-pp-paper hover:bg-pp-paper/10 hover:text-pp-paper">Siguiente<ChevronRight /></Button>
    </div> : <div className="px-4 py-3"><Button variant="secondary" className="w-full" onClick={() => setView("pages")}>← Volver al pasaporte</Button></div>}
  </motion.div>, el);
}

function PageFrame({ className, children }: { className: string; children: ReactNode }) {
  return <div className={cn("relative h-full overflow-y-auto overflow-x-hidden rounded-3xl text-pp-ink", className)}>{children}</div>;
}

function Cover() {
  return <div className="relative flex h-full flex-col overflow-hidden rounded-l-md rounded-r-3xl border-l-4 border-pp-spine bg-pp-green text-pp-ink shadow-xl">
    <Curves />
    <div className="relative flex flex-1 flex-col items-center justify-center -rotate-[14deg]">
      <h2 className="font-display text-5xl font-medium leading-none tracking-tight">Pasaporte<br />Cívico</h2>
      <p className="mt-16 ml-24 font-display text-xl leading-tight">UPN × BCP<br />2026</p>
    </div>
  </div>;
}

function Capsule({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-center rounded-[18px] bg-pp-ink text-[11px]"><span className="min-w-[58px] shrink-0 pl-3 pr-1 font-bold text-pp-paper">{label}</span><span className="m-0.5 min-w-0 flex-1 break-words rounded-2xl bg-pp-paper px-3 py-1.5 font-semibold leading-tight text-pp-ink shadow-sm">{children}</span></div>;
}

const ROAD = "M-10 230 C80 200 40 140 150 130 C260 120 220 50 320 20";

function IdentityPage({ onEdit, onQr }: { onEdit: () => void; onQr: () => void }) {
  const s = useCivic(); const reduced = useReducedMotion();
  const balloons = CHALLENGES.map((c, i) => ({ text: `${["🌱", "🚦", "🤝", "💙"][i] ?? "✨"} ${c.title}: ${c.active ? "Activo" : "Próximamente"}`, pos: ["left-[4%] top-[6%]", "right-[4%] top-[24%]", "left-[6%] top-[46%]", "right-[5%] top-[64%]"][i] }));
  return <PageFrame className="flex flex-col bg-pp-green">
    <div className="relative p-4">
      <h2 className="text-center font-display text-base font-extrabold">PASAPORTE CÍVICO 2026</h2>
      <div className="mt-3 grid grid-cols-[92px_minmax(0,1fr)] gap-3">
        <div>
          <div className="relative"><Avatar className="border-pp-ink/20 shadow-md" />
            <span className="absolute -bottom-2 -right-3 flex h-12 w-12 -rotate-12 items-center justify-center rounded-full border-2 border-double border-pp-spine bg-pp-paper/90 text-center text-[6px] font-extrabold leading-tight text-pp-spine shadow">VERIFICADO<br />• UPN 2026 •</span></div>
          <button onClick={onEdit} className="mt-4 block text-left text-[10px] font-semibold underline">✎ Editar foto y datos</button>
          <button onClick={onQr} className="mt-1.5 block text-left text-[10px] font-semibold underline">📱 Ver mi QR Cívico</button>
        </div>
        <div className="space-y-2">
          <Capsule label="Titular:">{s.profile?.name}</Capsule>
          <Capsule label="Zona:">{displayZone(s.profile?.zone ?? "")}</Capsule>
          <Capsule label="Rango:">Agente de Cambio • Nivel 3</Capsule>
          <Capsule label="Racha:">🔥 {s.streak} días • {s.points} pts</Capsule>
          <Capsule label="Meta:">{s.profile?.motivation}</Capsule>
        </div>
      </div>
    </div>
    <div className="relative min-h-56 flex-1 overflow-hidden">
      <svg viewBox="0 0 300 260" className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <path d={ROAD} className="fill-none stroke-pp-ink" strokeWidth="26" />
        <path d={ROAD} className="fill-none stroke-pp-paper" strokeWidth="2" strokeDasharray="8 8" />
        {([[30, 150], [60, 90], [240, 190], [270, 140], [120, 60], [200, 230]] as [number, number][]).map(([x, y]) => <g key={`${x}-${y}`}><rect x={x - 1.5} y={y} width="3" height="14" className="fill-pp-ink" /><circle cx={x} cy={y - 4} r="11" className="fill-pp-lime" /></g>)}
        <g><rect x="-14" y="-10" width="28" height="14" rx="4" className="fill-pp-fuchsia" /><circle cx="-7" cy="5" r="3" className="fill-pp-ink" /><circle cx="7" cy="5" r="3" className="fill-pp-ink" />
          {!reduced && <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path={ROAD} />}</g>
      </svg>
      <span className="absolute bottom-2 left-3 font-display text-3xl font-extrabold text-pp-paper/40">Ruta Cívica</span>
      <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } } }}>
        {balloons.map((b) => <motion.span key={b.text} variants={{ h: { scale: 0, opacity: 0 }, s: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 12 } } }} className={cn("absolute max-w-[48%] rounded-xl bg-pp-paper px-2 py-1 text-[9px] font-bold shadow-md after:absolute after:-bottom-1.5 after:left-4 after:border-x-[6px] after:border-t-[6px] after:border-x-transparent after:border-t-pp-paper", b.pos)}>{b.text}</motion.span>)}
      </motion.div>
      <p className="absolute bottom-2 right-4 text-[7px] font-bold">{LOGO}</p>
    </div>
  </PageFrame>;
}

function LuggagePage({ onEdit }: { onEdit: () => void }) {
  const { profile, commitment, setCommitment } = useCivic(); const reduced = useReducedMotion();
  const tap = reduced ? {} : { y: -4, scale: 1.02 };
  return <PageFrame className="flex flex-col justify-evenly gap-4 bg-pp-green px-4 py-4 text-pp-green">
    <motion.div whileTap={tap} className="-ml-6 -rotate-3 bg-pp-paper px-6 py-3 shadow-md"><h2 className="font-display text-2xl">EQUIPAJE CÍVICO</h2><p className="text-xs">¡Compromisos antes de salir!</p></motion.div>
    <motion.button whileTap={tap} whileHover={tap} onClick={onEdit} className="ml-6 block w-[92%] rotate-[4deg] bg-pp-paper p-4 text-left shadow-md">
      <p className="text-xs italic">¿Qué acciones vas a impulsar hoy en tu barrio y universidad?</p>
      <p className="mt-3 font-display text-base font-bold text-pp-ink">{profile?.motivation}</p>
      <p className="mt-2 text-[10px] underline">Toca para cambiar tu meta</p>
    </motion.button>
    <motion.div whileTap={tap} className="w-[85%] -rotate-2 bg-pp-paper px-4 py-3 text-xs shadow-md">Valores que practico: <i>Respeto, Responsabilidad y Empatía</i></motion.div>
    <motion.label whileTap={tap} className="block w-[92%] -rotate-[4deg] bg-pp-paper p-4 text-xs shadow-md">Mi compromiso personal de hoy
      <textarea value={commitment} onChange={(e) => setCommitment(e.target.value)} maxLength={280} rows={3} placeholder="Ej.: Hoy ayudo a mantener limpio el paradero de la UPN." className="mt-2 w-full resize-none bg-transparent text-sm text-pp-ink outline-none placeholder:text-pp-green/50" />
    </motion.label>
  </PageFrame>;
}

const CHALLENGE_ROWS = [["eco", "Espacios Limpios"], ["order", "Modo Orden"], ["kind", "Buena Convivencia"], ["help", "Cadena de Ayuda"]] as const;

function JournalFrame({ children }: { children: ReactNode }) {
  return <PageFrame className="flex flex-col bg-pp-lavender">
    <p className="p-4 pb-0 text-right text-[9px] font-bold">UPN × BCP 2026</p>
    <div className="flex flex-1 flex-col px-4 pb-4">{children}</div>
    <div className="bg-pp-ink px-2 py-2 text-center"><p className="whitespace-nowrap font-display text-[34px] font-extrabold leading-none tracking-tight text-pp-lavender">Bitácora Cívica</p></div>
  </PageFrame>;
}

function StatsPage() {
  const s = useCivic();
  const contribution = Object.values(s.passportStats).reduce((t, r) => t + r.actions - (r.details["alert"] ?? 0), 0);
  return <JournalFrame>
    <h2 className="font-display text-xl font-bold">Mis desafíos y estadísticas:</h2>
    <div className="my-3 flex flex-1 flex-col justify-evenly gap-2">
      <div className="rounded-2xl bg-pp-paper p-3"><p className="text-xs font-bold">Nivel 3 → Nivel 4: {s.points} / 500 pts</p><ProgressBar value={s.points / 5} className="mt-2" /></div>
      {CHALLENGE_ROWS.map(([k, label]) => { const r = s.passportStats[k]; return <div key={k} className="flex items-center justify-between rounded-full bg-pp-paper px-4 py-2 text-xs"><b>{label}</b><span>{r.actions} acciones · {r.points} pts</span></div>; })}
      <div className="grid grid-cols-2 gap-2 text-center">{[["Aporte a la meta", contribution], ["Meta del sector", `${s.collective}/${s.collectiveGoal}`], ["Mejor racha", `${s.bestStreak} días`], ["Canjes", s.redemptions.length]].map(([l, v]) => <div key={l} className="rounded-2xl bg-pp-ink p-2 text-pp-paper"><p className="text-lg font-extrabold">{v}</p><p className="text-[9px] opacity-80">{l}</p></div>)}</div>
    </div>
  </JournalFrame>;
}



function ConnectionsPage() {
  const s = useCivic();
  const mine = [...s.feed.map((f) => ({ f, i: "🌱" })), ...s.orderFeed.map((f) => ({ f, i: "🚦" })), ...s.kindFeed.map((f) => ({ f, i: "🤝" })), ...s.helpFeed.map((f) => ({ f, i: "💙" }))].filter(({ f }) => f.id.startsWith("me-") && !f.id.endsWith("-g"));
  const rows = [{ t: `Bodega Don Pepe – Punto Limpio (${s.stamps}/${MAX_STAMPS} sellos)`, i: "DP" }, ...mine.map(({ f, i }) => ({ t: `${f.text} (+${f.pts} pts)`, i }))].slice(0, 6);
  while (rows.length < 6) rows.push({ t: "Por conectar – completa un desafío", i: "+" });

  return <JournalFrame>
    <h2 className="font-display text-xl font-bold">Con quiénes conecté en el camino:</h2>
    <div className="my-3 flex flex-1 flex-col justify-evenly gap-2">{rows.map((r, i) => <div key={i} className={cn("flex items-center gap-2", i % 2 && "flex-row-reverse")}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pp-ink text-[10px] font-extrabold text-pp-paper">{r.i}</span><span className={cn("flex-1 truncate rounded-full bg-pp-paper px-3 py-2 text-[10px] font-semibold", r.i === "+" && "opacity-60")}>{r.t}</span></div>)}</div>
  </JournalFrame>;
}

function StampsPage({ onClose }: { onClose: () => void }) {
  const s = useCivic(); const navigate = useNavigate(); const reduced = useReducedMotion();
  const stamps = [["eco", "Eco-Ciudadano", "🌱"], ["order", "Fila Justa", "🚦"], ["kind", "Empatía Activa", "🤝"], ["help", "Red Solidaria", "💙"]] as const;
  const got = stamps.filter(([k]) => s.passportStats[k].actions > 0);
  return <PageFrame className="flex flex-col justify-between gap-2 bg-pp-fuchsia p-5">
    <p className="max-w-[180px] text-base font-semibold leading-snug">Lo que me llevo de cada acción</p>
    <div className="relative mx-auto aspect-square w-full max-w-72">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden><defs><path id="arc" d="M100 100 m-92 0 a92 92 0 1 1 184 0" /></defs><text className="fill-pp-ink font-display text-[13px] font-bold tracking-[0.2em]"><textPath href="#arc" startOffset="50%" textAnchor="middle">SELLOS CÍVICOS</textPath></text></svg>
      <div className="absolute inset-[10%] flex flex-col items-center justify-center gap-2 rounded-full bg-pp-paper p-3 text-center shadow-lg">
        <p className="text-[11px] font-bold">Sellos obtenidos: {got.length}/4</p>
        <div className="grid grid-cols-2 gap-1.5">{stamps.map(([k, n, e], i) => { const on = s.passportStats[k].actions > 0; return <motion.span key={k} initial={on && !reduced ? { scale: 1.4, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 300 }}
          className={cn("flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full border-[3px] text-center text-[7px] font-extrabold uppercase leading-tight", i % 2 ? "rotate-[5deg]" : "rotate-[-6deg]", on ? "border-double border-pp-spine text-pp-spine" : "border-dashed border-neutral-500 text-neutral-700")}>
          <span className="text-xl">{e}</span><span className="whitespace-nowrap">{n}</span></motion.span>; })}</div>
      </div>
    </div>
    <div className="mt-1 grid grid-cols-2 items-center gap-3">
      <div className="flex aspect-square flex-col items-center justify-center rounded-full bg-pp-ink p-4 text-center text-pp-paper shadow-lg">
        <p className="text-2xl font-extrabold">{s.stamps}/{MAX_STAMPS}</p><p className="text-[9px] leading-tight">Sellos Punto Limpio • Bodega Don Pepe</p>
        <div className="mt-1.5 flex gap-1">{Array.from({ length: MAX_STAMPS }, (_, i) => <span key={i} className={cn("h-2.5 w-2.5 rounded-full", i < s.stamps ? "bg-pp-green" : "border border-dashed border-pp-paper")} />)}</div>
      </div>
      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-full bg-pp-paper p-4 text-center shadow-lg">
        <p className="text-[10px] font-bold">Beneficios Canjeados</p>
        {s.redemptions.length ? s.redemptions.slice(0, 3).map((r) => <span key={r.id} className="w-full truncate rounded-full bg-pp-lavender px-2 py-0.5 text-[8px] font-semibold">🎁 {r.title}</span>) :
          <><p className="text-[10px]">0 canjeados</p><button onClick={() => { onClose(); void navigate({ to: "/beneficios" }); }} className="rounded-full bg-pp-ink px-2.5 py-1 text-[9px] font-bold text-pp-paper">Canjear pts →</button></>}
      </div>
    </div>
    <p className="pt-2 text-[11px] font-bold tracking-wide">{LOGO}</p>
  </PageFrame>;
}

function PersonalQr() {
  const name = useCivic((s) => s.profile?.name ?? "");
  return <div className="text-center"><h3 className="text-sm font-bold">Mi QR Cívico Personal</h3><div className="my-4 flex justify-center"><QRCodeSVG value={personalQr(name)} size={200} marginSize={4} /></div><p className="break-all font-mono text-[10px] text-muted-foreground">{personalQr(name)}</p></div>;
}

function PassportEditor({ onDone }: { onDone: () => void }) {
  const s = useCivic(); const [camera, setCamera] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const profile = s.profile; if (!profile) return null;
  const change = (patch: Partial<typeof profile>) => { s.updatePassport({ ...profile, ...patch }); setSaved(false); };
  return <div className="space-y-4"><Avatar className="mx-auto w-28" />
    <input ref={input} type="file" accept="image/*" aria-label="Archivo de foto de perfil" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { s.setAvatar(await compressPhoto(file)); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar la foto"); } }} />
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-auto whitespace-normal py-2 text-xs" onClick={() => input.current?.click()}><ImagePlus />Subir foto de galería</Button><Button variant="outline" className="h-auto whitespace-normal py-2 text-xs" onClick={() => setCamera(true)}><Camera />Tomar foto con cámara</Button></div>
    {s.avatarUrl && <Button variant="ghost" className="w-full text-xs" onClick={() => s.setAvatar(null)}><UserRound />Volver a mi inicial</Button>}
    {camera && <SelfieCamera onClose={() => setCamera(false)} />}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <label className="block text-xs font-semibold">Nombre<input value={profile.name} maxLength={80} onChange={(e) => change({ name: e.target.value })} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm" /></label>
    <label className="block text-xs font-semibold">Zona / Campus<select value={profile.zone} onChange={(e) => change({ zone: e.target.value })} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-xs">{ZONES.map((z) => <option key={z}>{z}</option>)}</select></label>
    <label className="block text-xs font-semibold">Meta Cívica<select value={profile.motivation} onChange={(e) => change({ motivation: e.target.value })} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-xs">{MOTIVATIONS.citizen.map((m) => <option key={m}>{m}</option>)}</select></label>
    <label className="block text-xs font-semibold">Compromiso de Equipaje Cívico<textarea value={s.commitment} maxLength={280} rows={3} onChange={(e) => s.setCommitment(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm" /></label>
    <Button className="h-auto w-full whitespace-normal py-3" onClick={() => { setSaved(s.updatePassport(profile)); onDone(); }}>Guardar cambios en mi Pasaporte</Button>
    {saved && <p role="status" className="flex items-center gap-1 text-xs text-eco"><Check className="h-4 w-4" />Cambios guardados.</p>}
  </div>;
}

function SelfieCamera({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null); const [ready, setReady] = useState(false), [error, setError] = useState("");
  useEffect(() => { let active = true; let stream: MediaStream | null = null;
    void (async () => { try { if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported"); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); if (!active) { stream.getTracks().forEach((t) => t.stop()); return; } if (video.current) { video.current.srcObject = stream; await video.current.play(); setReady(true); } } catch { if (active) setError("No se pudo abrir la cámara frontal. Puedes subir una foto de galería."); } })();
    return () => { active = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return <div className="space-y-2"><video ref={video} autoPlay muted playsInline aria-label="Cámara frontal de perfil" className="mx-auto aspect-[3/4] max-h-64 rounded-lg bg-foreground object-cover" />{error && <p className="text-xs text-muted-foreground">{error}</p>}<div className="flex gap-2"><Button disabled={!ready} className="flex-1" onClick={() => { const v = video.current; if (!v) return; useCivic.getState().setAvatar(cropPhoto(v, v.videoWidth, v.videoHeight)); onClose(); }}><Camera />Capturar selfie</Button><Button variant="outline" onClick={onClose}>Cancelar</Button></div></div>;
}
