import { createFileRoute } from "@tanstack/react-router";
import { MerchantPortal } from "@/components/app/MerchantPortal";
export const Route = createFileRoute("/comercio/ofertas")({
  head: () => ({ meta: [{ title: "Mis ofertas – Suma Valores" }, { name: "description", content: "Publica y consulta promociones de tu comercio aliado." }, { property: "og:title", content: "Mis ofertas – Suma Valores" }, { property: "og:description", content: "Beneficios locales para ciudadanos que suman valores." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <MerchantPortal view="offers" />,
});