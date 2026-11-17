import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}
