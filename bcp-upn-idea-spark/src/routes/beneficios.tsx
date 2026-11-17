import { createFileRoute } from "@tanstack/react-router";
import { useCivic } from "@/lib/civic-store";
import { AnimatedNumber } from "@/components/app/AnimatedNumber";
import { RewardCatalog } from "@/components/app/RewardCatalog";

export const Route = createFileRoute("/beneficios")({
  head: () => ({
    meta: [
      { title: "Beneficios – Suma Valores" },
      { name: "description", content: "Canjea tus puntos cívicos en cafeterías UPN, bodegas aliadas y transporte." },
      { property: "og:title", content: "Beneficios – Suma Valores" },
      { property: "og:description", content: "Canjea tus puntos por café, vales y pasajes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Benefits,
});

function Benefits() {
  const points = useCivic((s) => s.points);
  return <div className="space-y-5 px-4 pt-4"><div className="rounded-3xl bg-primary p-5 text-primary-foreground"><p className="text-xs opacity-80">Puntos disponibles</p><p className="font-display text-4xl font-extrabold"><AnimatedNumber value={points} /> <span className="text-lg">pts</span></p></div><RewardCatalog /></div>;
}
