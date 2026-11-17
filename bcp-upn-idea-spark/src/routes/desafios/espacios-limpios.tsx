import { useRef, useState, type ReactNode, type RefObject } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, KeyRound, Loader2, MapPin, QrCode, ShieldCheck, Sparkles, Store, Trash2, Users } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { ALLY_QR_PAYLOAD, MAX_STAMPS, binUsedToday, todayKey } from "@/lib/civic-rules";
import { captureFrame, fallbackImage, imageDifference, successFeedback, useCamera, useGeolocation, useObjectDetection, useQrScanner, type Geo } from "@/lib/real-sensors";
import { ProgressBar } from "@/components/app/ProgressBar";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { Sheet } from "@/components/app/Sheet";
import { FloatingPoints } from "@/components/app/FloatingPoints";
import { ResetDemo } from "@/components/app/ResetDemo";
import { celebrate } from "@/components/app/celebrate";
import { cn } from "@/lib/utils";
import { COMMERCE_QR } from "@/lib/profile-rules";

export const Route = createFileRoute("/desafios/espacios-limpios")({
  head: () => ({
    meta: [
      { title: "Espacios Limpios – Suma Valores" },
      { name: "description", content: "Valida tachos con IA y GPS real, escanea QR de aliados y completa misiones de rescate con fotos reales." },
      { property: "og:title", content: "Desafío Espacios Limpios – Suma Valores" },
      { property: "og:description", content: "Cuida parques, calles y espacios comunes y suma puntos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CleanSpaces,
});

type Mode = "bin" | "qr" | "rescue" | null;

const watermark = (geo: Geo | null) => [
  `Suma Valores • ${new Date().toLocaleString("es-PE")}`,
  geo ? `GPS ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)} ±${geo.acc}m` : "GPS no disponible",
];

function CleanSpaces() {
  const s = useCivic();
  const { geo, error: geoError } = useGeolocation();
  const [mode, setMode] = useState<Mode>(null);
  const [float, setFloat] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const used = binUsedToday(s, todayKey());

  const reward = (pts: number) => {
    void celebrate();
    setFloat(pts);
    setTimeout(() => setFloat(null), 1300);
  };

  return (
    <div className="space-y-5 px-4 pt-4">
      <FloatingPoints show={float !== null} pts={float ?? 0} />
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Volver</Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"><AnimatedNumber value={s.points} /> pts</span>
          <ResetDemo onReset={() => { setMode(null); setResetKey((k) => k + 1); }} />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-extrabold">Espacios Limpios</h1>
        <p className="text-sm text-muted-foreground">Cuida parques, calles y espacios comunes</p>
      </div>

      <GeoBadge geo={geo} error={geoError} />

      <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold text-muted-foreground">Sector: Alrededores UPN Los Olivos</p>
        <div className="mt-1 flex items-end justify-between">
          <span className="font-display text-3xl font-extrabold text-eco"><AnimatedNumber value={s.cleanliness} />% <span className="text-base">Limpio</span></span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> <AnimatedNumber value={s.activeToday} /> personas sumando</span>
        </div>
        <ProgressBar value={s.cleanliness} barClass="bg-eco" className="mt-3" />
        <div className={cn("mt-4 flex items-start gap-2 rounded-2xl p-3 text-xs", used ? "bg-eco/10 text-eco" : "bg-secondary text-secondary-foreground")}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <b>Bono diario de tacho: {used ? "1/1 usado hoy" : "0/1 usado hoy"}</b> (Juego limpio activado)
            <p className="mt-0.5 opacity-80">El tope diario evita botar basura repetidamente solo para ganar puntos.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Elige cómo sumar</h2>
        <ActionCard icon={Trash2} title="Validar Tacho con IA + GPS Real" pts="+10 pts" desc="Cámara real + visión artificial detectan el envase. Tope 1/día." onClick={() => setMode("bin")} done={used} tone="eco" />
        <ActionCard icon={Store} title="Punto Limpio Aliado – QR Real" pts="+10 pts" desc={`Escanea el QR de Bodega Don Pepe. Sellos: ${s.stamps}/${MAX_STAMPS}`} onClick={() => setMode("qr")} tone="primary" />
        <ActionCard icon={Sparkles} title="Misión Rescate Comunitaria" pts="+15 pts + Bono" desc="Fotos reales Antes/Después + PIN de testigo." onClick={() => setMode("rescue")} tone="energy" />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-eco" /> En vivo en tu barrio</h2>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {s.feed.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">{f.name.slice(0, 1)}</div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p><b>{f.name}</b> {f.text}</p>
                    <p className="text-muted-foreground">{f.ago}</p>
                  </div>
                  <span className="text-xs font-bold text-eco">+{f.pts} pts</span>
                </div>
                {f.photo && <img src={f.photo} alt="Evidencia real" className="mt-2 w-full rounded-xl" />}
                {f.before && f.after && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <figure><img src={f.before} alt="Antes" className="rounded-xl" /><figcaption className="mt-1 text-center text-[10px] font-semibold text-muted-foreground">Antes</figcaption></figure>
                    <figure><img src={f.after} alt="Después" className="rounded-xl" /><figcaption className="mt-1 text-center text-[10px] font-semibold text-eco">Después</figcaption></figure>
                  </div>
                )}
                {f.tag && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-eco/15 px-2 py-0.5 text-[10px] font-semibold text-eco"><CheckCircle2 className="h-3 w-3" /> {f.tag}</span>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <BinSheet key={`b${resetKey}`} open={mode === "bin"} onClose={() => setMode(null)} used={used} geo={geo}
        onDone={(photo) => { if (s.validateBin(photo)) reward(10); }} />
      <QrSheet key={`q${resetKey}`} open={mode === "qr"} onClose={() => setMode(null)} stamps={s.stamps}
        onDone={() => { s.scanQr(); successFeedback(); reward(10); }} />
      <RescueSheet key={`r${resetKey}`} open={mode === "rescue"} onClose={() => setMode(null)} geo={geo}
        onDone={(b, a) => { s.rescue(b, a); reward(15); }} />
    </div>
  );
}

function GeoBadge({ geo, error }: { geo: Geo | null; error: string | null }) {
  if (geo)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-eco/15 px-3 py-1 text-[11px] font-semibold text-eco">
        <MapPin className="h-3.5 w-3.5" /> 📍 GPS Real Activo: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} • Precisión ±{geo.acc}m
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      {error ? <MapPin className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />} {error ?? "Obteniendo GPS real..."}
    </span>
  );
}

function ActionCard({ icon: Icon, title, pts, desc, onClick, done, tone }: { icon: typeof Trash2; title: string; pts: string; desc: string; onClick: () => void; done?: boolean; tone: "eco" | "primary" | "energy" }) {
  const bg = { eco: "bg-eco text-eco-foreground", primary: "bg-primary text-primary-foreground", energy: "bg-energy text-energy-foreground" }[tone];
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-[var(--shadow-soft)]">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", bg)}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      {done ? <CheckCircle2 className="h-5 w-5 text-eco" /> : <span className="shrink-0 text-xs font-bold text-energy">{pts}</span>}
    </motion.button>
  );
}

function CameraBox({ videoRef, overlayRef, ready, error, onFallback, children, radar }: {
  videoRef: RefObject<HTMLVideoElement | null>; overlayRef?: RefObject<HTMLCanvasElement | null>; ready: boolean; error: string | null;
  onFallback: () => void; children?: ReactNode; radar?: boolean;
}) {
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-foreground">
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />
        {overlayRef && <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />}
        <div className="pointer-events-none absolute inset-5 rounded-xl border-2 border-dashed border-primary-foreground/40" />
        {radar && ready && (
          <motion.div className="pointer-events-none absolute inset-x-5 h-0.5 bg-eco shadow-[0_0_14px] shadow-eco" animate={{ top: ["12%", "88%", "12%"] }} transition={{ duration: 2.4, repeat: Infinity }} />
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-primary-foreground"><Loader2 className="h-6 w-6 animate-spin" /> Encendiendo cámara real...</div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-primary-foreground">
            <CameraOff className="h-7 w-7" /> {error}
            <p className="opacity-70">Si estás en la vista previa, abre la app en una pestaña nueva o en tu celular.</p>
          </div>
        )}
        {children}
      </div>
      {error && (
        <button onClick={onFallback} className="mt-2 w-full text-center text-[11px] font-semibold text-muted-foreground underline">Modo respaldo sin cámara</button>
      )}
    </div>
  );
}

function BinSheet({ open, onClose, used, geo, onDone }: { open: boolean; onClose: () => void; used: boolean; geo: Geo | null; onDone: (photo: string) => void }) {
  const [camOn, setCamOn] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const cam = useCamera(open && camOn && !fallback && !photo);
  const ai = useObjectDetection(cam.videoRef, overlayRef, open && cam.ready && !photo);
  const close = () => { setCamOn(false); setFallback(false); setPhoto(null); onClose(); };

  const capture = () => {
    const p = fallback ? fallbackImage("Depósito en tacho", watermark(geo)) : captureFrame(cam.videoRef.current!, watermark(geo));
    setPhoto(p);
    onDone(p);
  };
  const canCapture = fallback || (cam.ready && !!ai.best && !!geo);

  return (
    <Sheet open={open} onClose={close} title="Validar Tacho con IA + GPS Real">
      <GeoBadge geo={geo} error={geo ? null : "Esperando GPS real..."} />
      <div className="mt-3">
        {used && !photo ? (
          <p className="rounded-2xl bg-secondary p-3 text-center text-sm">Ya usaste tu bono de tacho hoy (1/1) 🙌 ¡Vuelve mañana o prueba otro modo!</p>
        ) : photo ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <img src={photo} alt="Evidencia capturada" className="w-full rounded-2xl" />
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-eco"><CheckCircle2 className="h-5 w-5" /> Verificado por IA + GPS Real • +10 pts</p>
            <button onClick={close} className="mt-3 w-full rounded-2xl bg-eco py-3 font-bold text-eco-foreground">¡Genial!</button>
          </motion.div>
        ) : !camOn ? (
          <button onClick={() => setCamOn(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"><Camera className="h-5 w-5" /> Abrir Cámara IA</button>
        ) : (
          <>
            {fallback ? (
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl bg-secondary p-4 text-center text-xs text-secondary-foreground">
                <CameraOff className="mb-2 h-7 w-7" /> Modo respaldo activo: se generará una evidencia sin cámara con hora y GPS.
              </div>
            ) : (
              <CameraBox videoRef={cam.videoRef} overlayRef={overlayRef} ready={cam.ready} error={cam.error} onFallback={() => setFallback(true)} radar />
            )}
            {!fallback && cam.ready && (
              <p className={cn("mt-2 rounded-xl p-2 text-center text-xs font-semibold", ai.best ? "bg-eco/15 text-eco" : "bg-muted text-muted-foreground")}>
                {ai.status === "loading" ? "Cargando visión artificial (coco-ssd)..." : ai.status === "error" ? "No se pudo cargar la IA" :
                  ai.best ? `${ai.best.label} detectado • ${Math.round(ai.best.score * 100)}% confianza` : "Apunta a una botella, vaso, envase o bolsa..."}
              </p>
            )}
            {!geo && !fallback && <p className="mt-2 text-center text-[11px] text-muted-foreground">Activa tu ubicación para validar la zona pública.</p>}
            <button disabled={!canCapture} onClick={capture} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              <Camera className="h-5 w-5" /> Capturar evidencia real
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function StampCard({ stamps }: { stamps: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-xs font-bold">Tarjeta de fidelidad – Bodega Don Pepe</p>
      <div className="mt-2 flex gap-2">
        {Array.from({ length: MAX_STAMPS }).map((_, i) => (
          <motion.div key={i} initial={false} animate={i < stamps ? { scale: [1.6, 1], rotate: [-20, 0] } : { scale: 1 }}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm", i < stamps ? "border-eco bg-eco text-eco-foreground" : "border-dashed border-border text-muted-foreground")}>
            {i < stamps ? "♻" : i + 1}
          </motion.div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{stamps}/{MAX_STAMPS} sellos en Bodega Don Pepe</p>
    </div>
  );
}

function QrSheet({ open, onClose, stamps, onDone }: { open: boolean; onClose: () => void; stamps: number; onDone: () => void }) {
  const [camOn, setCamOn] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const cam = useCamera(open && camOn && !fallback && !done);
  useQrScanner(cam.videoRef, open && cam.ready && !done, (data) => {
    if (data === ALLY_QR_PAYLOAD || data === COMMERCE_QR) { setDone(true); setWrong(null); onDone(); }
    else setWrong(data.slice(0, 40));
  });
  const close = () => { setCamOn(false); setFallback(false); setDone(false); setWrong(null); setShowQr(false); onClose(); };

  return (
    <Sheet open={open} onClose={close} title="Punto Limpio Aliado – QR Real">
      <StampCard stamps={stamps} />
      <div className="mt-3">
        {done ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-eco" />
            <p className="mt-1 font-bold">¡QR auténtico leído! Sello registrado • +10 pts</p>
            <button onClick={close} className="mt-3 w-full rounded-2xl bg-eco py-3 font-bold text-eco-foreground">¡Listo!</button>
          </motion.div>
        ) : !camOn ? (
          <button onClick={() => setCamOn(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"><QrCode className="h-5 w-5" /> Escanear QR del Comercio</button>
        ) : fallback ? (
          <button onClick={() => { setDone(true); onDone(); }} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">Registrar sello (modo respaldo)</button>
        ) : (
          <>
            <CameraBox videoRef={cam.videoRef} ready={cam.ready} error={cam.error} onFallback={() => setFallback(true)} radar>
              {cam.ready && <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-energy" />}
            </CameraBox>
            <p className="mt-2 text-center text-xs text-muted-foreground">{wrong ? `QR no reconocido: "${wrong}"` : "Buscando un código QR real..."}</p>
          </>
        )}
      </div>
      {!done && (
        <>
          <button onClick={() => setShowQr((v) => !v)} className="mt-3 w-full rounded-2xl border-2 border-border py-2.5 text-xs font-bold">
            {showQr ? "Ocultar QR" : "Ver QR de Bodega Don Pepe (para imprimir o escanear)"}
          </button>
          <AnimatePresence>
            {showQr && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 flex flex-col items-center rounded-2xl bg-card p-4">
                  <QRCodeSVG value={ALLY_QR_PAYLOAD} size={180} fgColor="#002A8D" marginSize={2} />
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">{ALLY_QR_PAYLOAD}</p>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">Ábrelo en otra pantalla o imprímelo y escanéalo con tu celular.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Sheet>
  );
}

function RescueSheet({ open, onClose, geo, onDone }: { open: boolean; onClose: () => void; geo: Geo | null; onDone: (b: string, a: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [identical, setIdentical] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [entered, setEntered] = useState("");
  const [pinError, setPinError] = useState(false);
  const cam = useCamera(open && step === 1 && !fallback && !(before && after));
  const close = () => { setStep(1); setBefore(null); setAfter(null); setFallback(false); setIdentical(false); setPin(null); setEntered(""); setPinError(false); onClose(); };

  const shoot = async (which: "before" | "after") => {
    const label = which === "before" ? "ANTES" : "DESPUÉS";
    const p = fallback ? fallbackImage(label, watermark(geo)) : captureFrame(cam.videoRef.current!, [label, ...watermark(geo)]);
    if (which === "before") { setBefore(p); setIdentical(false); return; }
    // Compare raw frames (without watermark noise) by re-capturing un-stamped versions is overkill; watermark area is small.
    const diff = await imageDifference(before!, p);
    if (diff < 4) { setIdentical(true); setAfter(null); return; }
    setIdentical(false);
    setAfter(p);
  };

  const validate = () => {
    if (entered === pin) { setStep(3); onDone(before!, after!); successFeedback(); }
    else setPinError(true);
  };

  return (
    <Sheet open={open} onClose={close} title="Misión Rescate Comunitaria">
      <div className="mb-4 flex gap-2">
        {[1, 2].map((n) => <div key={n} className={cn("h-1.5 flex-1 rounded-full", step >= n ? "bg-energy" : "bg-muted")} />)}
      </div>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="1" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
            <p className="mb-3 text-sm font-semibold">Paso 1: Foto real Antes y Después</p>
            {!(before && after) && (fallback ? (
              <p className="rounded-2xl bg-secondary p-3 text-center text-xs">Modo respaldo activo: se generarán evidencias sin cámara.</p>
            ) : (
              <CameraBox videoRef={cam.videoRef} ready={cam.ready} error={cam.error} onFallback={() => setFallback(true)} />
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["before", "after"] as const).map((w) => {
                const img = w === "before" ? before : after;
                const disabled = w === "after" ? !before : false;
                return (
                  <button key={w} disabled={disabled || (!fallback && !cam.ready && !img)} onClick={() => void shoot(w)}
                    className={cn("relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed text-xs font-semibold disabled:opacity-50", img ? "border-eco" : "border-border text-muted-foreground")}>
                    {img ? <img src={img} alt={w} className="absolute inset-0 h-full w-full object-cover" /> : <Camera className="h-7 w-7" />}
                    <span className={cn("relative rounded-full px-2 py-0.5", img && "bg-eco text-eco-foreground")}>{w === "before" ? "Foto 1: Antes" : "Foto 2: Después"}{img ? " ✓" : ""}</span>
                  </button>
                );
              })}
            </div>
            {identical && (
              <p className="mt-3 rounded-2xl bg-accent p-3 text-xs font-semibold text-accent-foreground">⚠️ Las fotos Antes y Después son idénticas. Captura el cambio real del espacio.</p>
            )}
            <button disabled={!before || !after} onClick={() => setStep(2)} className="mt-4 w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">Continuar</button>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="2" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
            <p className="text-sm font-semibold">Paso 2: Validación Cruzada Real</p>
            <p className="mt-1 text-xs text-muted-foreground">Pide a un testigo cercano el PIN de 4 dígitos que aparece en su Pasaporte Cívico.</p>
            <button onClick={() => { setPin(String(Math.floor(1000 + Math.random() * 9000))); setEntered(""); setPinError(false); }}
              className="mt-3 w-full rounded-2xl border-2 border-border py-2.5 text-xs font-bold">Generar código de testigo cercano</button>
            {pin && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-3 rounded-2xl bg-primary p-4 text-center text-primary-foreground">
                <p className="text-[11px] opacity-80">Pantalla del testigo • válido 5 min</p>
                <p className="font-mono text-3xl font-extrabold tracking-[0.4em]">{pin}</p>
              </motion.div>
            )}
            <div className="mt-3 flex gap-2">
              <input value={entered} onChange={(e) => { setEntered(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }}
                inputMode="numeric" placeholder="PIN del testigo" aria-label="PIN del testigo"
                className="min-w-0 flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-center font-mono text-lg tracking-widest" />
              <button disabled={!pin || entered.length !== 4} onClick={validate} className="flex items-center gap-1 rounded-2xl bg-energy px-4 font-bold text-energy-foreground disabled:opacity-50"><KeyRound className="h-4 w-4" /> Validar</button>
            </div>
            {pinError && <p className="mt-2 text-center text-xs font-semibold text-energy">El PIN no coincide. Pide al testigo que lo confirme de nuevo.</p>}
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-eco" />
            <p className="mt-2 text-lg font-bold">¡Misión completada!</p>
            <p className="text-sm text-muted-foreground">+15 pts y el sector subió +2% de limpieza 🌱</p>
            <button onClick={close} className="mt-4 w-full rounded-2xl bg-eco py-3 font-bold text-eco-foreground">¡Genial!</button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
