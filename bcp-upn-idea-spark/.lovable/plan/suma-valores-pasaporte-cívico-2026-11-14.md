# Suma Valores – Pasaporte Cívico

Mobile-first app shown inside an elegant phone frame on desktop, full screen on mobile. 100% positive reinforcement, Spanish copy, Lima/UPN Los Olivos demo data.

## Visual direction
- Background #F8FAFC, white cards with soft shadows, navy #002A8D primary, orange #FF7800 accent, emerald #10B981 for eco actions.
- Fonts: Plus Jakarta Sans (headings) + DM Sans (body).
- Framer Motion: spring slide transitions between screens/modals, animated civic score ring, radar scan, confetti + floating "+10 pts", animated number counters.

## Screens
1. **Inicio** – profile header (Camila R., Agente de Cambio Nivel 3, racha 5 días, puntos), collective goal card (420/500 → 20% descuento Cafetería Central), 2x2 challenge grid (Espacios Limpios active; Modo Orden, Buena Convivencia, Cadena de Ayuda locked "Próximamente").
2. **Desafío Espacios Limpios** – back button, sector cleanliness monitor (84%, 68 personas), anti-cheat daily bin bonus pill (0/1 → 1/1), three action modes:
   - A: IA + GPS camera simulation, 1.5s scan, +10 pts (once per day)
   - B: QR simulation "Bodega Don Pepe", +10 pts, loyalty stamp
   - C: 2-step Misión Rescate (before/after photos, witness confirmation), +15 pts, +2% sector cleanliness
   - Live neighborhood feed with entry animations; new actions get prepended.
3. **Comunidad** – friendly weekly sector ranking + verified activity.
4. **Beneficios** – 3 rewards (150/250/200 pts); "Canjear" deducts points and shows a real scannable QR code; disabled if not enough points.

Fixed 3-tab bottom navigation.

## Installable app
Manifest + icons only so it can be added to the home screen (no offline mode, no service worker).

## Technical details
- Routes: `/` (inicio), `/desafios/espacios-limpios`, `/desafios/$id` placeholder for future challenges, `/comunidad`, `/beneficios`; each with its own head metadata.
- Global state via a Zustand store persisted to localStorage (points, streak, collective progress, cleanliness %, daily bin bonus by date, feed, stamps, redemptions); challenge registry config so cards 2–4 can be unlocked later.
- Deps: framer-motion, zustand, canvas-confetti, qrcode.react.
- Small vitest tests for rules: bin bonus once per day, +10/+15 points, +2% cleanliness, redeem requires enough points.
