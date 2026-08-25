# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

There are no tests. TypeScript type-checking:
```bash
npx tsc --noEmit
```

## Architecture

**Singles.ar** is a P2P TCG (Magic, Pokémon, One Piece, Dragon Ball) marketplace for Argentina. Next.js 14 App Router, Supabase (Postgres + Realtime + Storage), MercadoPago Marketplace split payments.

### Supabase client pattern

Two clients — always use the right one:

| Client | File | When |
|---|---|---|
| Browser (anon key, RLS enforced) | `lib/supabase/client.ts` | Client components, hooks |
| Server (cookie-based session) | `lib/supabase/server.ts` | Server components, API routes for auth |
| Admin (service role, bypasses RLS) | `lib/supabase/admin.ts` | API routes that need to read/write across users |

API routes typically use both: `createClient()` to verify the current user's session, then `createAdminClient()` for DB writes that need to touch other users' rows.

### Route protection

`middleware.ts` handles auth guards:
- `PROTECTED_EXACT` — exact path match (e.g. `/profile` = My Account)
- `PROTECTED_PREFIX` — all sub-paths (e.g. `/chat/*`, `/sell/*`)
- `/profile/[username]` (public profiles) is intentionally NOT protected — only `/profile` (no segment) is

Admin routes use a separate server-side guard: `lib/admin/auth.ts` → `getAdminUser()` checks that `user.id` is in the `ADMIN_USER_IDS` env var. The admin layout redirects non-admins; API routes return 403.

### Data flow: transaction lifecycle

```
buy_order (active)
  → seller accepts → buy_order (reserved) + transaction (in_chat)
  → buyer clicks pay → POST /api/payments/create-preference
      → transaction (payment_pending) + MP preference created
  → user pays on MP → POST /api/payments/webhook
      → transaction (paid) + listing/buy_order marked sold/filled
  → parties mark complete → transaction (completed)
  → review submitted → recalculate_reputation() RPC called
```

The webhook always returns 200 to prevent MP retry loops. Idempotency: skips if transaction is already past `payment_pending`.

### MercadoPago split payments

Preferences must be created with the **seller's** `access_token` (from `profiles.mercadopago_access_token`) so MP routes the payment to the seller minus `marketplace_fee`. The platform account receives the fee. See `lib/mercadopago/client.ts`: `createSellerPreference(sellerAccessToken)` vs `mpPayment` (platform-level, for webhook processing).

### API response conventions

All API routes return `{ data?, error?, code? }`. Use helpers from `lib/api-error.ts`:
```ts
import { forbidden, dbError, validationError } from "@/lib/api-error";
return forbidden();         // 403 { error: "Acceso denegado.", code: "FORBIDDEN" }
return dbError();           // 500
return validationError(msg) // 422
```

Validate request bodies with Zod; return `validationError(parsed.error.issues[0]?.message)` on failure.

### Key types

`types/database.ts` is the single source of truth for all DB shapes. Important distinction:
- `Profile` — full row including `email` and MP tokens. **Never return this from a public API endpoint.**
- `PublicProfile` — safe subset: `id, username, avatar_url, reputation_score, total_sales, is_reliable_buyer`. Use this for any client-facing data.
- `CardWithListingStats` — from the `cards_with_listing_stats` view; `image_url` is already resolved (`image_override_url ?? image_url`).
- `AdminSettings` — all keys are stored as `text` in `admin_settings` table; parse with `parseFloat()`.

### Styling conventions

- `font-serif` / `font-sans` must be explicitly set — there is no default font class on elements
- `font-price` — use for all ARS/USD currency display (serif + tabular nums)
- `surface-raised` — standard card/panel: `bg-surface shadow-card rounded-xl border border-border`
- `text-2xs` — 0.625rem, defined in Tailwind config
- `cn()` from `lib/utils.ts` for conditional classes
- Colors: `primary` (#1a2744 navy), `accent` (#b5862a gold), `text-primary/secondary/muted`, `success/warning/error`
- All prices displayed in ARS using `formatARS()` from `lib/formatting.ts`

### Chat system

`chat_messages` table has Realtime enabled. `ChatRoom` component subscribes via `postgres_changes` filtered by `transaction_id`. Message types: `text` | `image` | `system`. System messages (`sender_id: null`) are inserted server-side by API routes to mark state transitions.

### Admin panel

Routes under `/app/admin/` — layout enforces admin guard server-side. Admin API routes all call `requireAdmin()` from `lib/admin/auth.ts` as the first step. The sidebar links: Dashboard, Cartas, Transacciones, Usuarios, Configuración.

### Database schema

Canonical schema: `lib/supabase/schema.sql` — run on a fresh Supabase project to build the entire DB. Key RPCs called from app code:
- `recalculate_reputation(target_id)` — after new review
- `increment_total_sales(seller_id)` / `increment_total_purchases(buyer_id)` — after webhook confirms payment
- `check_buyer_reliability(buyer_id)` — after buy order cancellation

### Environment variables

Required in `.env.local` (see README.md for full table). The app skips Supabase calls gracefully when `NEXT_PUBLIC_SUPABASE_URL` doesn't start with `http`, so it won't crash with placeholder values during setup.
