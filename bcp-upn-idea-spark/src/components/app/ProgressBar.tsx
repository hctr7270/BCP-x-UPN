import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function ProgressBar({ value, className, barClass = "bg-energy" }: { value: number; className?: string; barClass?: string }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div className={cn("h-full rounded-full", barClass)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
    </div>
  );
}
