import { useEffect, useRef, useState, type RefObject } from "react";

// Browser-only helpers: every API call lives inside effects or event handlers.

export type Geo = { lat: number; lng: number; acc: number };

export function useGeolocation() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) { setError("GPS no disponible"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setError(null); },
      (e) => setError(e.code === 1 ? "Permiso de ubicación denegado" : "No se pudo obtener ubicación"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return { geo, error };
}

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        setReady(true);
      } catch (e) {
        const name = (e as { name?: string }).name;
        setError(name === "NotAllowedError" ? "Permiso de cámara denegado o bloqueado por el navegador" : "No se pudo abrir la cámara en este dispositivo");
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); setReady(false); };
  }, [enabled]);
  return { videoRef, ready, error };
}

/** Captures the current video frame as a compact JPEG, optionally stamping watermark lines. */
export function captureFrame(video: HTMLVideoElement, watermark: string[] = [], width = 480): string {
  const ratio = video.videoHeight / video.videoWidth || 0.75;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round(width * ratio);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(video, 0, 0, c.width, c.height);
  stamp(ctx, c, watermark);
  return c.toDataURL("image/jpeg", 0.6);
}

function stamp(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, lines: string[]) {
  if (!lines.length) return;
  const h = 16 * lines.length + 10;
  ctx.fillStyle = "rgba(0,42,141,0.75)";
  ctx.fillRect(0, c.height - h, c.width, h);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px sans-serif";
  lines.forEach((l, i) => ctx.fillText(l, 8, c.height - h + 18 + i * 16));
}

/** Backup image used only when the camera is blocked. */
export function fallbackImage(label: string, watermark: string[] = []): string {
  const c = document.createElement("canvas");
  c.width = 480; c.height = 360;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 480, 360);
  g.addColorStop(0, "#10B981"); g.addColorStop(1, "#002A8D");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(label, 240, 160);
  ctx.font = "14px sans-serif"; ctx.fillText(`Modo respaldo • ${Math.random().toString(36).slice(2, 7)}`, 240, 190);
  ctx.textAlign = "left";
  stamp(ctx, c, watermark);
  return c.toDataURL("image/jpeg", 0.6);
}

/** Mean absolute grayscale difference (0–255) between two images at 32x32. */
export async function imageDifference(a: string, b: string): Promise<number> {
  const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const px = (img: HTMLImageElement) => {
    const c = document.createElement("canvas"); c.width = 32; c.height = 32;
    const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, 32, 32);
    return ctx.getImageData(0, 0, 32, 32).data;
  };
  const da = px(ia), db = px(ib);
  let sum = 0;
  for (let i = 0; i < da.length; i += 4) {
    const ga = (da[i]! + da[i + 1]! + da[i + 2]!) / 3, gb = (db[i]! + db[i + 1]! + db[i + 2]!) / 3;
    sum += Math.abs(ga - gb);
  }
  return sum / 1024;
}

export function successFeedback() {
  navigator.vibrate?.(200);
  try {
    const ac = new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(660, ac.currentTime);
    o.frequency.setValueAtTime(990, ac.currentTime + 0.12);
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.35);
  } catch { /* audio optional */ }
}

// ---------- AI object detection (coco-ssd) ----------
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ bbox: [number, number, number, number]; class: string; score: number }[]> };
let detectorPromise: Promise<Detector> | null = null;
function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await import("@tensorflow/tfjs");
      const coco = await import("@tensorflow-models/coco-ssd");
      return (await coco.load({ base: "lite_mobilenet_v2" })) as unknown as Detector;
    })();
    detectorPromise.catch(() => { detectorPromise = null; });
  }
  return detectorPromise;
}

const LABELS_ES: Record<string, string> = {
  bottle: "Botella", cup: "Vaso", "wine glass": "Copa", bowl: "Envase", handbag: "Bolsa", backpack: "Mochila",
  suitcase: "Contenedor", vase: "Recipiente", "cell phone": "Celular", book: "Papel/Libro", banana: "Residuo orgánico",
  apple: "Residuo orgánico", orange: "Residuo orgánico", sandwich: "Residuo de comida", "sports ball": "Objeto",
};
export const WASTE_CLASSES = new Set(["bottle", "cup", "wine glass", "bowl", "handbag", "backpack", "suitcase", "vase", "banana", "apple", "orange", "sandwich", "book"]);

export type Detection = { label: string; score: number; waste: boolean };

export function useObjectDetection(videoRef: RefObject<HTMLVideoElement | null>, overlayRef: RefObject<HTMLCanvasElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [best, setBest] = useState<Detection | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    setStatus("loading");
    loadDetector().then((model) => {
      if (stop) return;
      setStatus("ready");
      const tick = async () => {
        const v = videoRef.current, cv = overlayRef.current;
        if (v && cv && v.readyState >= 2 && v.videoWidth) {
          const preds = await model.detect(v);
          cv.width = cv.clientWidth; cv.height = cv.clientHeight;
          const ctx = cv.getContext("2d")!;
          ctx.clearRect(0, 0, cv.width, cv.height);
          // object-cover mapping
          const scale = Math.max(cv.width / v.videoWidth, cv.height / v.videoHeight);
          const ox = (cv.width - v.videoWidth * scale) / 2, oy = (cv.height - v.videoHeight * scale) / 2;
          let top: Detection | null = null;
          for (const p of preds.filter((p) => p.score > 0.45)) {
            const waste = WASTE_CLASSES.has(p.class);
            const [x, y, w, h] = p.bbox;
            ctx.strokeStyle = waste ? "#10B981" : "#FF7800"; ctx.lineWidth = 3;
            ctx.strokeRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
            const label = `${LABELS_ES[p.class] ?? p.class} • ${Math.round(p.score * 100)}%`;
            ctx.font = "bold 13px sans-serif";
            const tw = ctx.measureText(label).width + 10;
            ctx.fillStyle = waste ? "#10B981" : "#FF7800";
            ctx.fillRect(ox + x * scale, Math.max(0, oy + y * scale - 20), tw, 20);
            ctx.fillStyle = "#fff"; ctx.fillText(label, ox + x * scale + 5, Math.max(14, oy + y * scale - 6));
            if (waste && (!top || p.score > top.score)) top = { label: LABELS_ES[p.class] ?? p.class, score: p.score, waste };
          }
          setBest(top);
        }
        if (!stop) timer = setTimeout(tick, 250);
      };
      void tick();
    }).catch(() => !stop && setStatus("error"));
    return () => { stop = true; clearTimeout(timer); setBest(null); };
  }, [enabled, videoRef, overlayRef]);
  return { status, best };
}

// ---------- QR scanning (jsQR) ----------
export function useQrScanner(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean, onResult: (data: string) => void) {
  const cb = useRef(onResult);
  cb.current = onResult;
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let raf = 0;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    let jsQR: typeof import("jsqr").default | null = null;
    void import("jsqr").then((m) => { jsQR = m.default; });
    let last = 0;
    const loop = (t: number) => {
      if (stop) return;
      const v = videoRef.current;
      if (jsQR && v && v.readyState >= 2 && v.videoWidth && t - last > 150) {
        last = t;
        c.width = 480; c.height = Math.round(480 * (v.videoHeight / v.videoWidth));
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const img = ctx.getImageData(0, 0, c.width, c.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) cb.current(code.data);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, [enabled, videoRef]);
}
