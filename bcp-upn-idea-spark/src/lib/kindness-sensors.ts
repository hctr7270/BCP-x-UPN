import { useEffect, useRef, useState } from "react";
import { estimatedDb, type KindPosition } from "./kindness-rules";

const activeStops = new Set<() => void>();
export function stopKindnessSensors() { for (const stop of [...activeStops]) stop(); }
export function trackKindnessStop(stop: () => void) {
  activeStops.add(stop);
  return () => { stop(); activeStops.delete(stop); };
}
export function captureKindGps(): Promise<KindPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("GPS no disponible")); return; }
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }),
      () => reject(new Error("No se pudo obtener el GPS. Revisa el permiso de ubicación.")),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  });
}
export function useKindGps(enabled: boolean) {
  const [position, setPosition] = useState<KindPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    if (!navigator.geolocation) { setError("GPS no disponible"); return; }
    const id = navigator.geolocation.watchPosition((p) => {
      if (live) { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }); setError(null); }
    }, () => live && setError("Permite la ubicación para guardar coordenadas reales"), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    return trackKindnessStop(() => { live = false; navigator.geolocation.clearWatch(id); });
  }, [enabled]);
  return { position, error };
}
export type AcousticSample = { db: number; at: number; bands: number[] };
export function useAcousticRadar() {
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<AcousticSample | null>(null);
  const dispose = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; dispose.current?.(); }, []);
  const stop = () => { generation.current++; dispose.current?.(); dispose.current = null; setStatus("idle"); setSample(null); };
  const start = async () => {
    stop(); setStatus("starting"); setError(null);
    const token = generation.current;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let raf = 0;
    let alive = true;
    const clean = trackKindnessStop(() => {
      alive = false; cancelAnimationFrame(raf); source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      if (context && context.state !== "closed") void context.close().catch(() => {});
    });
    dispose.current = clean;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) throw new Error("unsupported");
      // Resume from the user's gesture, including Safari's audio-context restriction.
      context = new AudioContext();
      await context.resume();
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (!alive || token !== generation.current) { clean(); return; }
      const analyser = context.createAnalyser(); analyser.fftSize = 2048;
      source = context.createMediaStreamSource(stream); source.connect(analyser);
      const waveform = new Float32Array(analyser.fftSize), frequency = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const tick = (at: number) => {
        if (!alive) return;
        if (at - last >= 70) {
          last = at; analyser.getFloatTimeDomainData(waveform); analyser.getByteFrequencyData(frequency);
          const bands = Array.from({ length: 20 }, (_, i) => {
            const start = Math.floor(i * frequency.length / 20), end = Math.floor((i + 1) * frequency.length / 20);
            let sum = 0; for (let k = start; k < end; k++) sum += frequency[k] ?? 0;
            return sum / Math.max(1, end - start) / 255;
          });
          setSample({ db: estimatedDb(waveform), at: performance.now(), bands });
        }
        raf = requestAnimationFrame(tick);
      };
      setStatus("live"); raf = requestAnimationFrame(tick);
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
        if (!alive) return; clean(); setStatus("error"); setError("El micrófono se desconectó. Actívalo de nuevo.");
      }));
    } catch {
      clean();
      if (token === generation.current) { setStatus("error"); setError("Micrófono no disponible o permiso bloqueado por el navegador"); }
    }
  };
  return { status, sample, error, start, stop };
}