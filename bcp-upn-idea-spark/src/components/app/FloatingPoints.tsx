import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
export function FloatingPoints({ show, pts }: { show: boolean; pts: number }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById("phone-portal")), []);
  if (!el) return null;
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none absolute left-1/2 top-1/3 z-[60] -translate-x-1/2 rounded-full bg-energy px-5 py-2 font-display text-2xl font-extrabold text-energy-foreground shadow-lg"
          initial={{ opacity: 0, y: 20, scale: 0.6 }} animate={{ opacity: 1, y: -40, scale: 1 }} exit={{ opacity: 0, y: -90 }} transition={{ duration: 0.7 }}>
          +{pts} pts
        </motion.div>
      )}
    </AnimatePresence>,
    el,
  );
}
