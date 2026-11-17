import { createFileRoute } from "@tanstack/react-router";
import { MerchantPortal } from "@/components/app/MerchantPortal";
export const Route = createFileRoute("/comercio/validar")({
  head: () => ({ meta: [{ title: "Validar cupones – Suma Valores" }, { name: "description", content: "Valida cupones cívicos en tu comercio aliado con cámara QR." }, { property: "og:title", content: "Validar cupones – Suma Valores" }, { property: "og:description", content: "Canjes y validaciones del comercio aliado." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <MerchantPortal view="scan" />,
});