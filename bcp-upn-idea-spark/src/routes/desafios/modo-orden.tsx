import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle2, Footprints, ListOrdered, MapPin, QrCode, ShieldCheck, Square } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { crossingsToday, MAX_CROSSINGS, todayKey } from "@/lib/civic-rules";
import { advanceCrossing, freshGps, haversine, newCrossing, ORDER_QR, parseOrderQr, queueValid, SKIP_QR, type OrderPosition } from "@/lib/order-rules";
import { requestMotion, useOrderFeedback, useOrderGps, useOrderMotion } from "@/lib/order-sensors";
import { useCamera, useQrScanner } from "@/lib/real-sensors";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/app/ProgressBar";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { Sheet } from "@/components/app/Sheet";
import { FloatingPoints } from "@/components/app/FloatingPoints";
import { ResetDemo } from "@/components/app/ResetDemo";
import { celebrate } from "@/components/app/celebrate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/desafios/modo-orden")({
  head: () => ({ meta: [
    { title: "Modo Orden – Suma Valores" },
    { name: "description", content: "Turno digital con GPS y QR, y trayecto peatonal con sensores de movimiento en UPN Los Olivos." },
    { property: "og:title", content: "Desafío Modo Orden – Suma Valores" },
    { property: "og:description", content: "Suma puntos por abordar en orden y completar una caminata con pausa de seguridad." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: OrderMode,
});

const actionClass = "h-auto min-h-10 w-full whitespace-normal rounded-xl py-2.5 text-sm font-bold";
type Queue = { anchor: OrderPosition | null; started: number; id: string; phase: "waiting" | "protected" | "done" };
function OrderMode() {
  const s = useCivic();
  const [backup, setBackup] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [scanner, setScanner] = useState(false);
  const [qr, setQr] = useState<"turn" | "ordered" | "skip" | null>(null);
  const [pocket, setPocket] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossing, setCrossing] = useState(newCrossing);
  const [now, setNow] = useState(0);
  const [float, setFloat] = useState<number | null>(null);
  const [generation, setGeneration] = useState(0);
  const [gpsRequested, setGpsRequested] = useState(false);
  const gps = useOrderGps(!backup && gpsRequested);
  const motion = useOrderMotion(motionEnabled && pocket && !backup);
  const feedback = useOrderFeedback();
  const phaseRef = useRef(newCrossing());
  const countedSteps = useRef(0);
  const claimed = useRef(false);
  const pendingPermission = useRef(0);
  const rewardedCross = useRef(false);
  const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crossings = crossingsToday(s, todayKey());
  const distance = queue?.anchor && gps.position ? haversine(queue.anchor, gps.position) : 0;
  const inQueue = backup || queueValid(queue?.anchor ?? null, gps.position, now);
  const waitSeconds = queue ? Math.max(0, Math.floor((now - queue.started) / 1000)) : 0;
  const pauseSeconds = crossing.pauseStart === null ? 3 : Math.max(0, 3 - Math.floor((now - crossing.pauseStart) / 1000));

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => { clearInterval(timer); pendingPermission.current++; if (floatTimer.current) clearTimeout(floatTimer.current); };
  }, []);
  const resetLocal = () => {
    pendingPermission.current++; claimed.current = false; rewardedCross.current = false;
    if (floatTimer.current) clearTimeout(floatTimer.current);
    setQueue(null); setQueueOpen(false); setScanner(false); setQr(null); setPocket(false);
    setMotionEnabled(false); setGpsRequested(false); setBackup(false); setError(null); setFloat(null);
    phaseRef.current = newCrossing(); countedSteps.current = 0; setCrossing(newCrossing()); setGeneration((v) => v + 1);
  };
  useEffect(() => useCivic.subscribe((state, previous) => {
    if (state.orderFeed[0]?.id === "o1" && previous.orderFeed[0]?.id !== "o1") resetLocal();
  }), []);
  const reward = (points: number) => {
    feedback.confirm(); void celebrate(); setFloat(points);
    if (floatTimer.current) clearTimeout(floatTimer.current);
    floatTimer.current = setTimeout(() => setFloat(null), 1300);
  };
  const stopPocket = () => { pendingPermission.current++; setPocket(false); setMotionEnabled(false); if (!queueOpen) setGpsRequested(false); };
  const startPocket = async () => {
    feedback.prime(); setError(null); stopPocket();
    phaseRef.current = newCrossing(); countedSteps.current = 0; rewardedCross.current = false; setCrossing(newCrossing());
    if (backup) { setPocket(true); return; }
    setGpsRequested(true);
    const request = ++pendingPermission.current;
    try {
      await requestMotion();
      if (request !== pendingPermission.current) return;
      setMotionEnabled(true); setPocket(true);
    } catch (e) { if (request === pendingPermission.current) setError(e instanceof Error ? e.message : "Movimiento no disponible"); }
  };
  useEffect(() => {
    if (!queueOpen || queue || (!backup && !freshGps(gps.position, now))) return;
    setQueue({ anchor: backup ? null : gps.position, started: Date.now(), id: `SV-FILA-${Date.now()}`, phase: "waiting" });
    claimed.current = false;
  }, [queueOpen, queue, backup, gps.position, now]);

  useEffect(() => {
    if (!pocket || backup || rewardedCross.current) return;
    const step = motion.steps > countedSteps.current;
    countedSteps.current = motion.steps;
    const next = advanceCrossing(phaseRef.current, {
      now, step, moving: motion.moving, speed: gps.position?.speed ?? 0,
      valid: freshGps(gps.position, now) && motion.at > 0 && now - motion.at < 1000,
    });
    phaseRef.current = next; setCrossing(next);
    if (next.phase === "done") {
      rewardedCross.current = true;
      if (useCivic.getState().cross({ mode: "real", at: Date.now(), lat: gps.position?.lat, lng: gps.position?.lng, steps: motion.steps, pauseSeconds: 3, speed: gps.position?.speed })) reward(10);
      setPocket(false); setMotionEnabled(false); if (!queueOpen) setGpsRequested(false);
    }
  }, [now, motion, gps.position, pocket, backup]);

  const board = () => {
    if (!queue || claimed.current || !inQueue) { setError("Regresa a tu punto de fila y espera una señal GPS precisa para confirmar."); return; }
    claimed.current = true;
    s.boardQueue({ mode: backup ? "backup" : "real", at: Date.now(), lat: gps.position?.lat, lng: gps.position?.lng, waitSeconds, sessionId: queue.id, sequence: "#03 → #04" });
    setQueue({ ...queue, phase: "done" }); setScanner(false); setGpsRequested(false); reward(15);
  };
  const scanResult = (value: string) => {
    if (!scanner || claimed.current) return;
    const parsed = parseOrderQr(value);
    if (parsed === "unknown") { setError("QR no válido para el turno anterior #03. Escanea el QR del paradero."); return; }
    if (!inQueue) { setError("Validación en espera: vuelve a menos de 15 m de tu punto y espera GPS preciso."); return; }
    setScanner(false); setError(null);
    if (parsed === "ordered") board();
    else if (queue) setQueue({ ...queue, phase: "protected" });
  };
  const closeQueue = () => { setQueueOpen(false); setScanner(false); setQr(null); setQueue(null); setError(null); if (!pocket) setGpsRequested(false); };
  const toggleBackup = () => { resetLocal(); setBackup(!backup); };
  const backupStep = () => {
    const next = advanceCrossing(phaseRef.current, { now: Date.now(), step: true, moving: true, speed: 0, valid: true });
    phaseRef.current = next; setCrossing(next);
    if (next.phase === "done" && !rewardedCross.current) {
      rewardedCross.current = true;
      if (s.cross({ mode: "backup", at: Date.now(), steps: 8, pauseSeconds: 3 })) reward(10);
      setPocket(false);
    }
  };
  useEffect(() => {
    if (!backup || !pocket || phaseRef.current.phase !== "pause") return;
    const next = advanceCrossing(phaseRef.current, { now, step: false, moving: false, speed: 0, valid: true });
    phaseRef.current = next; setCrossing(next);
  }, [backup, pocket, now]);

  return <div className="space-y-5 px-4 pt-4">
    <FloatingPoints show={float !== null} pts={float ?? 0} />
    <div className="flex items-center justify-between gap-2">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
      <div className="flex items-center gap-2"><span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"><AnimatedNumber value={s.points} /> pts</span><ResetDemo onReset={resetLocal} /></div>
    </div>
    <div><h1 className="text-2xl font-extrabold">Modo Orden</h1><p className="text-sm text-muted-foreground">Respeta colas, señales y normas sin supervisión</p></div>
    <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold text-muted-foreground">Paradero UPN – Av. Alfredo Mendiola</p>
      <p className="mt-2 text-sm font-bold text-primary">Meta colectiva: {s.collective}/{s.collectiveGoal}</p><ProgressBar value={s.collective / s.collectiveGoal * 100} className="mt-3" />
      <p className="mt-3 flex items-start gap-2 text-xs text-secondary-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Tu secuencia relativa está protegida. Nadie pierde puntos.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-base font-bold">Elige cómo sumar</h2>
      <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-energy text-energy-foreground"><ListOrdered /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">Fila Justa · Turno Digital</p><p className="text-xs text-muted-foreground">GPS continuo + secuencia QR</p></div><span className="shrink-0 text-xs font-bold text-energy">+15 pts</span></div>
        <Button className={cn(actionClass, "mt-3")} onClick={() => { stopPocket(); feedback.prime(); setError(null); setQueueOpen(true); if (!backup) setGpsRequested(true); }}>Entrar a la Fila Justa</Button>
      </div>
      <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Footprints /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">Trayecto Seguro</p><p className="text-xs text-muted-foreground">Caminata + pausa peatonal</p></div><span className="shrink-0 text-xs font-bold text-energy">+10 pts</span></div>
        <p className="mt-3 text-xs font-semibold text-eco">Cruces validados hoy: {crossings}/{MAX_CROSSINGS}</p>
        {crossing.phase === "done" && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-eco"><CheckCircle2 /> ¡Cruce seguro validado!</p>}
        {pocket && <div className="mt-3 space-y-2 border-y border-border py-3 text-xs" aria-live="polite">
          <p className="font-bold text-primary">{backup ? "Modo respaldo · sin verificación real" : "Sensores reales activos"}</p>
          <div className="grid grid-cols-2 gap-2"><p>Pasos: <b>{backup ? crossing.approach + crossing.after : motion.steps}</b></p><p>Aceleración: <b>{motion.acceleration.toFixed(2)} m/s²</b></p></div>
          <p>{!backup && (motion.at === 0 || now - motion.at >= 1000) ? "Esperando señal de movimiento…" : motion.moving ? "🚶 Caminando" : "🛑 Pausa de seguridad detectada"}</p>
          <p>Velocidad GPS: {(gps.position?.speed ?? 0).toFixed(1)} km/h · Filtro peatonal &lt; 12 km/h</p>
          {!backup && (!freshGps(gps.position, now) || now - motion.at >= 1000) && <p className="text-energy">Esperando GPS preciso y señal de movimiento…</p>}
          {(gps.position?.speed ?? 0) >= 12 && <p className="font-bold text-energy">Velocidad no peatonal. Secuencia reiniciada; validación en espera.</p>}
          <ol className="space-y-1 font-semibold"><li>1. Caminata al cruce: {crossing.approach}/4 pasos</li><li>2. Pausa: {crossing.phase === "pause" ? `${pauseSeconds}s…` : crossing.phase === "cross" ? "3s confirmados" : "pendiente"}</li><li>3. Completar cruce: {crossing.after}/4 pasos</li></ol>
          {backup && crossing.phase !== "pause" && <Button variant="outline" className={actionClass} onClick={backupStep}><Footprints /> Registrar paso de respaldo</Button>}
        </div>}
        {crossings >= MAX_CROSSINGS ? <p className="mt-3 text-center text-xs font-semibold text-eco">¡Gracias por tus dos cruces seguros de hoy! 🙌</p> : pocket ? <Button variant="outline" className={cn(actionClass, "mt-3")} onClick={stopPocket}><Square /> Detener Modo Bolsillo</Button> : <Button className={cn(actionClass, "mt-3")} onClick={() => void startPocket()}><Footprints />{backup ? "Activar Modo Bolsillo (Respaldo)" : "Activar Modo Bolsillo (Sensores Reales)"}</Button>}
        {error && !queueOpen && <p role="alert" className="mt-2 text-xs text-energy">{error}</p>}
        {gps.error && !queueOpen && <p className="mt-2 text-xs text-energy">{gps.error}</p>}
      </div>
    </section>
    <Button variant="link" className="h-auto w-full whitespace-normal p-0 text-[11px] text-muted-foreground" onClick={toggleBackup}>{backup ? "Volver a sensores reales" : "Modo respaldo (si estás en laptop sin sensores)"}</Button>
    {backup && <p className="text-center text-xs font-semibold text-energy">Respaldo activo · registros marcados como no verificados por sensores</p>}
    <section><h2 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="h-2 w-2 rounded-full bg-energy" /> En vivo: Modo Orden</h2><ul className="space-y-2">{s.orderFeed.map((f) => <li key={f.id} className="flex items-start gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{f.name.slice(0, 1)}</div><div className="min-w-0 flex-1 text-xs"><p><b>{f.name}</b> {f.text}</p><p className="text-muted-foreground">{f.ago}</p>{f.orderEvidence && <div className="mt-1 space-y-1 text-muted-foreground"><p className="font-semibold text-primary">{f.orderEvidence.mode === "real" ? "GPS + sensores reales" : "Modo respaldo · no verificado"}</p>{f.orderEvidence.lat !== undefined && <p>📍 {f.orderEvidence.lat.toFixed(6)}, {f.orderEvidence.lng?.toFixed(6)}</p>}{f.orderEvidence.waitSeconds !== undefined && <p>Espera: {f.orderEvidence.waitSeconds}s · {f.orderEvidence.sequence}</p>}{f.orderEvidence.steps !== undefined && <p>{f.orderEvidence.steps} pasos · pausa {f.orderEvidence.pauseSeconds}s</p>}<p>{new Date(f.orderEvidence.at).toLocaleString("es-PE", { timeZone: "America/Lima" })}</p></div>}</div><span className="shrink-0 text-xs font-bold text-eco">+{f.pts} pts</span></li>)}</ul></section>
    <Sheet open={queueOpen} onClose={closeQueue} title="Fila Justa – Paradero UPN">
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground"><p className="text-xs opacity-80">Tu turno digital</p><p className="font-display text-4xl font-extrabold">#04</p><p className="mt-1 text-xs">#03 Valeria M. → #04 Tú → #05 Diego P.</p></div>
      {!queue ? <p className="mt-4 text-sm text-primary">📍 Capturando punto GPS de check-in (precisión ≤ 15 m)…</p> : <>
        <div className={cn("mt-4 space-y-2 rounded-xl p-3 text-xs", inQueue ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground")}>
          <p className="flex items-center gap-1 font-bold"><MapPin />{backup ? "Anclaje de respaldo · sin GPS" : `Anclaje GPS en fila: ${distance.toFixed(1)}m de desplazamiento`}</p><p>Máx. permitido: 15m · Espera: {waitSeconds}s</p>
          {queue.anchor && <p>Check-in: {queue.anchor.lat.toFixed(6)}, {queue.anchor.lng.toFixed(6)}</p>}
          {gps.position && <p>Precisión: ±{gps.position.accuracy.toFixed(1)}m · Velocidad: {gps.position.speed.toFixed(1)} km/h</p>}
          {!inQueue && <p className="font-bold">{distance > 15 ? "⚠️ Te estás alejando de tu lugar en la fila" : "Esperando una señal GPS precisa y reciente"}</p>}
        </div>
        {queue.phase === "done" ? <div className="mt-4 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-eco" /><p className="mt-2 font-bold">¡Orden respetado! +15 pts</p><Button className={cn(actionClass, "mt-3")} onClick={closeQueue}>¡Genial!</Button></div> : <div className="mt-4 space-y-2">
          {queue.phase === "protected" && <><p className="rounded-xl bg-secondary p-3 text-xs text-secondary-foreground"><ShieldCheck className="mb-1 h-5 w-5" />🛡️ Salto de turno #06 detectado. Tu secuencia relativa (#03 → #04) sigue protegida. No se otorgan puntos por saltar la fila; nadie pierde su saldo.</p><Button disabled={!inQueue} className={cn(actionClass, "bg-eco text-eco-foreground")} onClick={board}>Reclamar mis +15 pts protegidos</Button></>}
          <Button variant="outline" className={actionClass} onClick={() => setQr(qr ? null : "ordered")}><QrCode /> Ver QR de Turno / Paradero (para escanear)</Button>
          {qr && <div className="space-y-3 border-y border-border py-3"><div className="grid grid-cols-3 gap-1" role="group" aria-label="Código QR"><Button size="sm" variant={qr === "turn" ? "default" : "outline"} onClick={() => setQr("turn")}>Mi turno</Button><Button size="sm" variant={qr === "ordered" ? "default" : "outline"} onClick={() => setQr("ordered")}>Ordenado</Button><Button size="sm" variant={qr === "skip" ? "default" : "outline"} onClick={() => setQr("skip")}>Salto #06</Button></div><div className="mx-auto w-fit bg-card p-3"><QRCodeSVG size={200} value={qr === "ordered" ? ORDER_QR : qr === "skip" ? SKIP_QR : `SUMA-VALORES-FILA-TURNO-04:${queue.id}:${queue.anchor?.lat ?? "RESPALDO"}:${queue.anchor?.lng ?? ""}`} /></div><p className="text-center text-xs font-semibold text-primary">{qr === "turn" ? "Turno #04 · sesión actual" : qr === "ordered" ? "Abordaje ordenado · anterior #03" : "Prueba de salto · #06"}</p></div>}
          <Button disabled={!inQueue} className={actionClass} onClick={() => { feedback.prime(); setError(null); setScanner(!scanner); }}><QrCode />{scanner ? "Cerrar cámara" : "Validar abordaje con Cámara QR"}</Button>
          {scanner && <OrderScanner key={generation} onResult={scanResult} />}
          {backup && <div className="space-y-2 border-t border-border pt-2"><p className="text-xs text-energy">Solo respaldo · sin escaneo real</p><Button variant="outline" className={actionClass} onClick={board}>Abordaje de respaldo (+15 pts)</Button><Button variant="outline" className={actionClass} onClick={() => { setQueue({ ...queue, phase: "protected" }); setScanner(false); }}>Prueba de secuencia protegida</Button></div>}
        </div>}
      </>}
      {gps.error && <p className="mt-3 text-xs text-energy">{gps.error}</p>}{error && <p role="alert" className="mt-3 text-xs text-energy">{error}</p>}
      {!backup && <Button variant="link" className="mt-3 h-auto w-full whitespace-normal text-xs text-muted-foreground" onClick={() => { closeQueue(); toggleBackup(); }}>Modo respaldo (si estás en laptop sin sensores)</Button>}
    </Sheet>
  </div>;
}
function OrderScanner({ onResult }: { onResult: (value: string) => void }) {
  const { videoRef, ready, error } = useCamera(true);
  useQrScanner(videoRef, ready, onResult);
  return <div className="space-y-2"><video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full rounded-xl bg-foreground object-cover" aria-label="Cámara QR de abordaje" /><p className="text-center text-xs text-muted-foreground">{error ?? (ready ? "Escáner QR activo" : "Abriendo cámara…")}</p></div>;
}
