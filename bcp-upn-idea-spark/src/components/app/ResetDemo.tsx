import { RotateCcw } from "lucide-react";
import { useCivic } from "@/lib/civic-store";
import { Button } from "@/components/ui/button";
export function ResetDemo({ onReset }: { onReset?: () => void }) {
  const reset = useCivic((s) => s.reset);
  return (
    <Button variant="ghost" onClick={() => { reset(); onReset?.(); }} className="inline-flex h-auto items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <RotateCcw className="h-3 w-3" /> Reiniciar demo
    </Button>
  );
}
