import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import { CHALLENGES } from "@/lib/challenges";

export const Route = createFileRoute("/desafios/$id")({
  head: () => ({
    meta: [
      { title: "Próximo desafío – Suma Valores" },
      { name: "description", content: "Este desafío cívico se desbloqueará pronto." },
      { property: "og:title", content: "Próximo desafío – Suma Valores" },
      { property: "og:description", content: "Este desafío cívico se desbloqueará pronto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Upcoming,
});

function Upcoming() {
  const { id } = Route.useParams();
  const c = CHALLENGES.find((x) => x.id === id);
  return (
    <div className="px-4 pt-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Volver</Link>
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">{c ? <c.icon className="h-9 w-9 text-primary" /> : <Lock />}</div>
        <h1 className="mt-4 text-xl font-bold">{c?.title ?? "Desafío"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c?.subtitle}</p>
        <span className="mt-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{c?.badge ?? "Próximamente"}</span>
        <p className="mt-6 text-sm text-muted-foreground">¡Sigue sumando en Espacios Limpios mientras preparamos este reto para ti! 💪</p>
      </div>
    </div>
  );
}
