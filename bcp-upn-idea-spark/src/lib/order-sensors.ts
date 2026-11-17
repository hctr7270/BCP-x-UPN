import { useEffect, useRef, useState } from "react";
import { haversine, type OrderPosition } from "./order-rules";

export function useOrderGps(enabled: boolean) {
  const [position, setPosition] = useState<OrderPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setPosition(null); setError(null);
    if (!enabled) return;
    if (!navigator.geolocation) { setError("GPS no disponible en este dispositivo"); return; }
    let previous: OrderPosition | null = null;
    const id = navigator.geolocation.watchPosition((p) => {
      const at = p.timestamp;
      const point = { lat: p.coords.latitude, lng: p.coords.longitude };
      const seconds = previous ? (at - previous.at) / 1000 : 0;
      const speed = p.coords.speed !== null ? Math.max(0, p.coords.speed * 3.6) : previous && seconds > 0 ? haversine(previous, point) / seconds * 3.6 : 0;
      previous = { ...point, accuracy: p.coords.accuracy, speed, at };
      setPosition(previous); setError(null);
    }, (e) => setError(e.code === 1 ? "Permiso de ubicación denegado" : "Esperando una señal GPS precisa"), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return { position, error };
}

type PermissionMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
export async function requestMotion() {
  if (typeof DeviceMotionEvent === "undefined") throw new Error("Movimiento no disponible en este dispositivo");
  const api = DeviceMotionEvent as PermissionMotion;
  if (api.requestPermission && await api.requestPermission() !== "granted") throw new Error("Permiso de movimiento denegado");
}

export function useOrderMotion(enabled: boolean) {
  const [sample, setSample] = useState({ acceleration: 0, steps: 0, moving: false, at: 0 });
  const lastStep = useRef(0);
  useEffect(() => {
    setSample({ acceleration: 0, steps: 0, moving: false, at: 0 }); lastStep.current = 0;
    if (!enabled) return;
    let high = false;
    const listener = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      const g = e.accelerationIncludingGravity;
      if (!a && !g) return;
      const magnitude = (v: DeviceMotionEventAcceleration) => Math.hypot(v.x ?? 0, v.y ?? 0, v.z ?? 0);
      const acceleration = a && a.x !== null ? magnitude(a) : g ? Math.abs(magnitude(g) - 9.81) : 0;
      const now = Date.now();
      const step = acceleration > 1.5 && !high && now - lastStep.current >= 300;
      if (step) lastStep.current = now;
      if (acceleration > 1.5) high = true;
      if (acceleration < 0.7) high = false;
      setSample((s) => ({ acceleration, steps: s.steps + Number(step), moving: acceleration > 0.7, at: now }));
    };
    window.addEventListener("devicemotion", listener);
    return () => window.removeEventListener("devicemotion", listener);
  }, [enabled]);
  return sample;
}

export function useOrderFeedback() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);
  const prime = () => {
    try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => {}); } catch { /* optional */ }
  };
  const confirm = () => {
    navigator.vibrate?.([150, 80, 150]);
    const ac = audio.current;
    if (!ac) return;
    try {
      const tone = ac.createOscillator(), gain = ac.createGain();
      tone.frequency.value = 660; gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      tone.connect(gain); gain.connect(ac.destination); tone.start(); tone.stop(ac.currentTime + 0.3);
    } catch { /* optional */ }
  };
  return { prime, confirm };
}