import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Camera, MapPin, Mic, QrCode, ShieldCheck, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./Sheet";
import { useCivic } from "@/lib/civic-store";
import { MAX_RECOG, recogToday, todayKey } from "@/lib/civic-rules";
import { useCamera, useQrScanner } from "@/lib/real-sensors";
import { captureKindGps, trackKindnessStop, useAcousticRadar, useKindGps } from "@/lib/kindness-sensors";
import { advanceQuiet, DAY_MS, NOISE_LIMIT, parsePassport, PEERS, recentRecognition, type KindEvidence, type Peer, type QuietWindow } from "@/lib/kindness-rules";
import { cn } from "@/lib/utils";

const reasons = ["🚶 Cedió el paso", "🤝 Respetó mi turno", "😊 Trato amable sin agresiones"];
const vehicles = ["🚗 Auto / Taxi", "🚌 Bus / Combi", "🚲 Ciclista / Moto"];
const strip = (s: string) => s.replace(/^\S+\s/, "");
const actionClass = "mt-3 h-auto min-h-10 w-full whitespace-normal rounded-xl py-3 text-center font-bold";
function Options({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map((o) => <Button key={o} variant="outline" aria-pressed={value === o} onClick={() => onChange(o)} className={cn("h-auto whitespace-normal rounded-full px-3 py-2 text-xs", value === o && "border-kind bg-kind text-kind-foreground hover:bg-kind/90 hover:text-kind-foreground")}>{o}</Button>)}</div>;
}
function Message({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return <p role="status" className={cn("mt-3 rounded-xl p-3 text-xs", warning ? "bg-caution/15 text-foreground" : "bg-eco/10 text-foreground")}>{children}</p>;
}
function GpsLabel({ position, error }: ReturnType<typeof useKindGps>) {
  return <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{position ? `GPS activo • ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} • ±${Math.round(position.accuracy)} m` : error ?? "Esperando GPS real…"}</p>;
}

export function KindP2P({ onClose, onReward }: { onClose: () => void; onReward: (pts: number) => void }) {
  const s = useCivic();
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [phase, setPhase] = useState<"idle" | "scan" | "locating" | "done">("idle");
  const [showQr, setShowQr] = useState(false);
  const [displayPeer, setDisplayPeer] = useState<Peer>(PEERS[0]);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState(false);
  const [manual, setManual] = useState("");
  const [recipient, setRecipient] = useState("");
  const busy = useRef(false), alive = useRef(true);
  const { videoRef, ready, error } = useCamera(phase === "scan");
  const gps = useKindGps(phase === "scan" || phase === "locating");
  const count = recogToday(s, todayKey());
  useEffect(() => { alive.current = true; return trackKindnessStop(() => { alive.current = false; videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop()); }); }, [videoRef]);
  const receive = async (payload: string) => {
    if (busy.current || !alive.current) return;
    const peer = parsePassport(payload);
    if (!peer) { setMessage("Este QR no es un Pasaporte Cívico válido."); return; }
    busy.current = true; setPhase("idle");
    const previous = recentRecognition(useCivic.getState().recognizedPeers, peer.id, Date.now());
    if (previous) {
      navigator.vibrate?.([80, 50, 80]);
      const days = Math.floor((Date.now() - previous.at) / DAY_MS);
      setMessage(`🛡️ Escudo Anti-Colusión Activo: Ya reconociste a ${peer.name} ${days === 0 ? "hoy" : `hace ${days} días`}. El límite de 7 días evita granjas de puntos entre amigos. ¡Reconoce a alguien nuevo!`);
      busy.current = false; return;
    }
    try {
      setPhase("locating"); setMessage("");
      const position = backup ? undefined : gps.position && Date.now() - gps.position.at < 15000 ? gps.position : await captureKindGps();
      if (!alive.current) return;
      const evidence: KindEvidence = { source: backup ? "backup" : "real", at: Date.now(), ...(position ? { position } : {}), peerId: peer.id, recipientPoints: 10 };
      if (!useCivic.getState().recognize(strip(reason), peer, evidence)) { setMessage("Ya enviaste 2 reconocimientos hoy o este ciudadano ya fue reconocido. ¡Gracias por sumar!"); setPhase("idle"); return; }
      navigator.vibrate?.([150, 80, 150]); setRecipient(peer.name); setPhase("done"); onReward(5);
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo verificar la ubicación"); setPhase("idle"); }
    finally { busy.current = false; }
  };
  useQrScanner(videoRef, phase === "scan" && ready, (payload) => { void receive(payload); });
  return <Sheet open onClose={onClose} title="Reconocer gesto de respeto">
    <Options options={reasons} value={reason} onChange={setReason} />
    <p className="mt-3 text-xs font-semibold text-muted-foreground">Reconocimientos enviados hoy: {count}/{MAX_RECOG}</p>
    {phase === "done" ? <><Message>¡Reconocimiento guardado! +5 pts para ti · +10 pts asociados a {recipient}.{backup ? " Modo respaldo, sin verificación por cámara/GPS." : " QR y GPS reales."}</Message><p className="mt-2 text-[11px] text-muted-foreground">El bono del destinatario queda en este dispositivo; no se transfiere a otro saldo.</p><Button onClick={onClose} className={actionClass}>¡Genial!</Button></> : <>
      <Button variant="outline" onClick={() => { setPhase("idle"); setShowQr(!showQr); }} className={actionClass}><QrCode />{showQr ? "Ocultar QR de Pasaporte" : "Mostrar QR de Pasaporte (para escanear desde otro dispositivo)"}</Button>
      {showQr && <div className="mt-3 flex flex-col items-center gap-3">
        <Options options={PEERS.map((p) => p.name)} value={displayPeer.name} onChange={(name) => { const p = PEERS.find((p) => p.name === name); if (p) setDisplayPeer(p); }} />
        <div className="rounded-lg bg-card p-3"><QRCodeSVG value={displayPeer.payload} size={200} marginSize={4} title={`Pasaporte ${displayPeer.name}`} /></div>
        <span className="text-xs font-bold text-kind">{displayPeer.id === "ANDRES-M" ? "Ciudadano nuevo" : "Amigo frecuente · prueba anti-colusión"}</span>
      </div>}
      {phase === "scan" && <div className="mt-3"><video ref={videoRef} autoPlay muted playsInline aria-label="Cámara de pasaportes" className="aspect-[4/3] w-full rounded-xl bg-foreground object-cover" /><GpsLabel {...gps} /><Button variant="outline" onClick={() => setPhase("idle")} className={actionClass}><Square />Detener cámara</Button></div>}
      {phase === "locating" && <Message>Guardando ubicación real…</Message>}
      {message && <Message warning><ShieldCheck className="mb-1 h-4 w-4 text-kind" />{message}</Message>}
      {error && <Message warning>{error}</Message>}
      {count >= MAX_RECOG && <Message>Ya enviaste tus 2 reconocimientos de hoy 🙌 ¡Mañana podrás valorar a más vecinos!</Message>}
      {!backup && <Button disabled={phase === "scan" || phase === "locating" || count >= MAX_RECOG} onClick={() => { setMessage(""); setShowQr(false); setPhase("scan"); }} className={cn(actionClass, "bg-kind text-kind-foreground hover:bg-kind/90")}><Camera />Escanear Pasaporte QR Real</Button>}
      {error && !backup && <Button variant="ghost" onClick={() => { setPhase("idle"); setBackup(true); }} className={actionClass}>Modo respaldo (sin cámara/micrófono)</Button>}
      {backup && <div className="mt-3 space-y-2"><label className="text-xs font-semibold" htmlFor="passport-backup">Pasaporte · modo respaldo no verificado</label><input id="passport-backup" value={manual} onChange={(e) => setManual(e.target.value)} className="w-full rounded-lg border border-input bg-background p-2 text-xs" placeholder="SUMA-VALORES-P2P-…-2026" /><Button disabled={count >= MAX_RECOG || phase === "locating"} onClick={() => void receive(manual)} className={actionClass}>Registrar en modo respaldo</Button></div>}
    </>}
  </Sheet>;
}

export function KindRoad({ onClose, onReward }: { onClose: () => void; onReward: (pts: number) => void }) {
  const [vehicle, setVehicle] = useState(vehicles[0] ?? "");
  const [phase, setPhase] = useState<"idle" | "checking" | "locating" | "done">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [backup, setBackup] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const audio = useAcousticRadar();
  const gps = useKindGps(audio.status === "live");
  const quiet = useRef<QuietWindow | null>(null), completing = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return trackKindnessStop(() => { alive.current = false; }); }, []);
  const finish = async (window: QuietWindow | null) => {
    if (completing.current) return;
    completing.current = true; setPhase("locating"); audio.stop();
    try {
      const position = backup ? undefined : gps.position && Date.now() - gps.position.at < 15000 ? gps.position : await captureKindGps();
      if (!alive.current) return;
      const averageDb = window ? window.total / window.count : undefined;
      const evidence: KindEvidence = { source: backup ? "backup" : "real", at: Date.now(), ...(position ? { position } : {}), ...(window ? { averageDb: window.total / window.count, peakDb: window.peak, durationMs: window.lastAt - window.start, acousticScale: "estimated-not-calibrated" as const } : {}) };
      if (!useCivic.getState().courtesy(strip(vehicle), evidence)) throw new Error("La medición no completó cuatro segundos sin picos. Inténtalo nuevamente.");
      setResult(averageDb === undefined ? null : Math.round(averageDb)); setPhase("done"); navigator.vibrate?.([150, 80, 150]); onReward(15);
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo guardar la cortesía"); setPhase("idle"); }
    finally { completing.current = false; }
  };
  useEffect(() => {
    const sample = audio.sample;
    if (phase !== "checking" || !sample || audio.status !== "live" || completing.current) return;
    if (document.visibilityState !== "visible") { quiet.current = null; setProgress(0); return; }
    const next = advanceQuiet(quiet.current, sample.db, sample.at); quiet.current = next.window;
    setProgress(next.window ? Math.min(100, (sample.at - next.window.start) / 40) : 0);
    setMessage(sample.db >= NOISE_LIMIT ? `⚠️ Pico sonoro detectado (${Math.round(sample.db)} dB estimados) – Esperando entorno sin claxon` : "");
    if (next.done && next.window) void finish(next.window);
  }, [audio.sample, audio.status, phase]);
  useEffect(() => { if (audio.status === "error" && phase === "checking") { quiet.current = null; setProgress(0); setPhase("idle"); } }, [audio.status, phase]);
  const loud = (audio.sample?.db ?? 0) >= NOISE_LIMIT;
  return <Sheet open onClose={onClose} title="Cortesía Vial – Cruce Sin Claxon">
    <Options options={vehicles} value={vehicle} onChange={setVehicle} />
    {phase === "done" ? <><Message>{backup ? "Cortesía registrada en modo respaldo · no verificada" : `Promedio: ${result} dB estimados • Sin pico sonoro durante 4s`} · +15 pts</Message><Button onClick={onClose} className={actionClass}>¡Genial!</Button></> : <>
      {audio.status === "live" && <div className={cn("mt-4 rounded-xl p-4", loud ? "bg-caution/15" : "bg-secondary")}>
        <div className="flex items-center justify-between"><Mic className={cn("h-5 w-5", loud ? "text-energy" : "text-kind")} /><span className="text-3xl font-extrabold tabular-nums">{audio.sample ? Math.round(audio.sample.db) : "—"}<span className="ml-1 text-sm">dB</span></span></div>
        <p className="mt-1 text-center text-xs">{loud ? "Pico sonoro detectado" : "Ambiente respetuoso"} · estimación</p>
        <FrequencyBars bands={audio.sample?.bands ?? []} loud={loud} />
        <GpsLabel {...gps} />
      </div>}
      {phase === "checking" && <div className="mt-3"><progress aria-label="Verificación de cuatro segundos" max={100} value={progress} className="h-2 w-full accent-kind" /><p className="text-center text-xs">{(progress / 25).toFixed(1)} / 4 s sin picos</p></div>}
      {phase === "locating" && <Message>Guardando ubicación real…</Message>}
      {message && <Message warning>{message}</Message>}
      {audio.error && <Message warning>{audio.error}</Message>}
      {!backup && audio.status !== "live" && <Button disabled={audio.status === "starting" || phase === "locating"} onClick={() => { setMessage(""); void audio.start(); }} className={actionClass}><Mic />{audio.status === "starting" ? "Activando micrófono…" : "Activar Radar Acústico de Cortesía"}</Button>}
      {!backup && audio.status === "live" && <><Button disabled={phase !== "idle" || !gps.position || !audio.sample} onClick={() => { quiet.current = null; setProgress(0); setPhase("checking"); }} className={actionClass}>Iniciar verificación de 4s sin claxon</Button><Button variant="outline" onClick={() => { audio.stop(); quiet.current = null; setPhase("idle"); setProgress(0); }} className={actionClass}><Square />Detener micrófono</Button></>}
      {audio.error && !backup && <Button variant="ghost" onClick={() => { audio.stop(); setBackup(true); }} className={actionClass}>Modo respaldo (sin cámara/micrófono)</Button>}
      {backup && <><Message warning>Modo respaldo · Sin medición acústica ni GPS verificados.</Message><Button disabled={phase === "locating"} onClick={() => void finish(null)} className={actionClass}>Registrar cortesía en modo respaldo</Button></>}
      {!backup && <p className="mt-3 text-[11px] text-muted-foreground">dB estimados del micrófono, sin calibración. Los picos no identifican un claxon. No se graba ni guarda audio.</p>}
    </>}
  </Sheet>;
}
function FrequencyBars({ bands, loud }: { bands: number[]; loud: boolean }) {
  return <div className="mt-2 flex h-14 items-end gap-1" aria-label="Frecuencias en vivo">{Array.from({ length: 20 }, (_, i) => <div key={i} className={cn("h-full min-w-0 flex-1 origin-bottom rounded-t", loud ? "bg-energy" : "bg-kind")} style={{ transform: `scaleY(${Math.max(0.04, bands[i] ?? 0)})` }} />)}</div>;
}