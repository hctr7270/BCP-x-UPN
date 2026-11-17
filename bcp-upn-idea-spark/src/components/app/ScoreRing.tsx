import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
export function ScoreRing({ points, max = 500 }: { points: number; max?: number }) {
  const r = 30, c = 2 * Math.PI * r;
  const pct = Math.min(1, points / max);
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} className="fill-none stroke-primary-foreground/20" strokeWidth="6" />
        <motion.circle cx="36" cy="36" r={r} className="fill-none stroke-energy" strokeWidth="6" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.2, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-lg font-extrabold"><AnimatedNumber value={points} /></span>
        <span className="text-[10px] opacity-80">pts</span>
      </div>
    </div>
  );
}
