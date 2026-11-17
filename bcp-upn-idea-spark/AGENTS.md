<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- App state lives in a persisted Zustand store (`src/lib/civic-store.ts`) wrapping pure rule functions in `src/lib/civic-rules.ts` — keeps rules unit-testable; store uses skipHydration and rehydrates in PhoneShell to avoid SSR mismatch.
- Challenges are defined in `src/lib/challenges.ts`; unlock one by flipping `active` and adding its route under `src/routes/desafios/`.
- Real camera/GPS/AI/QR helpers live in `src/lib/real-sensors.ts`; TF.js, coco-ssd and jsQR are dynamically imported so they never load during SSR.
- Order-specific GPS/motion lifecycle lives in `src/lib/order-sensors.ts` and pure distance/QR/crossing rules in `src/lib/order-rules.ts`; keeps other challenges unchanged and sensor rules testable.
- Kindness-specific QR/history/acoustic rules live in `src/lib/kindness-rules.ts` and sensor cleanup in `src/lib/kindness-sensors.ts`; reset stops registered resources, audio uses an explicitly uncalibrated RMS estimate, and recipient bonuses are local evidence only because devices share no account service.
- Modals/overlays render through a portal into `#phone-portal` so they stay inside the phone frame.
- Demo onboarding and merchant catalog use the existing persisted civic store; PhoneShell gates both role experiences until hydration, profile changes preserve offers/progress, and coupon validation accepts only existing unused local redemptions rather than trusting arbitrary QR text.
- Passport statistics accumulate successful civic actions in store wrappers, never infer lifetime totals from truncated/demo feeds; avatar is compressed locally and preserved on reset, while name-based personal QR remains a demo identifier rather than authenticated identity.
