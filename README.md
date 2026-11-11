# Mac Kiffan — online ordering & live order management

Restaurant website (Arabic / French / English, RTL + LTR) with website-only ordering,
cash payment, admin-confirmed delivery fees, and a real-time admin dashboard with sound alerts.

**Stack:** Vite + React 19 + TypeScript · Supabase (Postgres, Auth, Realtime, Storage).

## Features

- **Menu & variants** — products can have several priced variants (e.g. Small / Large) named in AR/FR/EN.
  Prices that came from the paper menu as `350/400` are stored as *pending verification* and are never shown
  or sold until an admin names and verifies them (`/admin/menu`). Tapping a dish photo opens its options window;
  the price updates with the selected variant, extras and quantity.
- **Checkout** — three order types with their own fields:
  *في المطعم* (table number, name, note), *خارجي* (name, phone, notes), *توصيل* (name, phone, full address, notes).
  Cash only (`الدفع نقداً` / `Paiement en espèces` / `Cash Payment`).
- **Delivery fee** — never invented: delivery orders are saved with the fee *pending confirmation*;
  the admin enters it, the total is recalculated in the database, then the order can be accepted.
  The customer's order page shows the confirmed fee and final total.
- **Server-side integrity** — `place_order()` (one transaction) reads every price from the database and stores
  a snapshot of names, variants, extras, unit prices and totals. Customers cannot read the `orders` table;
  they see their own order only through `get_order_public(reference, secret token)`.
  An update trigger enforces the status workflow (`New → Confirmed → Preparing → Ready → [Out for delivery] → Completed`,
  plus Cancelled / Rejected) and keeps order snapshots immutable.
- **Live dashboard** (`/admin`) — Supabase Realtime subscription with automatic reconnection, catch-up on reconnect,
  10 s polling fallback while realtime is down, connection indicator, duplicate prevention by order ID.
  New orders: sound (Web Audio chime, queued so it never overlaps), pop-up with number / time / type,
  highlighted card, live counters, tab title badge, optional desktop notification.
  Only one tab per browser rings (Web Locks leader election).
  Settings: enable/disable sound, test sound, volume, desktop notifications, automatic alerts.
  > Alerts work while the dashboard is open. With the browser closed, orders are still saved and appear on return
  > — there is no push-notification service.
- Order history (search by number / name / phone, filters by date, type, status), order details, 80 mm printable receipt,
  menu & image management, restaurant settings, customer reviews moderation, employment applications.

## Local development

Requirements: Node 20+, pnpm, Docker (for the local Supabase stack).

```bash
pnpm install
npx supabase start -x vector          # local Postgres/Auth/Realtime/Storage
npx supabase db reset                 # applies migrations (incl. the real menu) + local seed
npx supabase status -o env            # shows API_URL, ANON_KEY, SERVICE_ROLE_KEY
cp .env.example .env.local            # VITE_SUPABASE_URL=/sb works with the dev proxy, plus VITE_SUPABASE_ANON_KEY
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  node scripts/create-admin.mjs admin@example.com 'a-strong-password'
pnpm dev                              # http://localhost:5173 — admin at /admin
```

The dev server proxies `/sb` → local Supabase (including the Realtime websocket), so previews opened from another
device work.

### Tests

```bash
bash scripts/test-db.sh      # pgTAP: pricing, validation, RLS, fee & status workflow
pnpm test:e2e                # Playwright on desktop, tablet and mobile viewports (needs the admin above:
                             # E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, default admin@mackiffan.local / Kiffan-2026!)
```

## Going live

1. Create a Supabase project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`
   — this also creates the Mac Kiffan menu (migration `20261111000003_mac_kiffan_menu.sql`, imported from
   `Menu_MC_Kiffan_Organise.xlsx`). Do **not** load `seed.sql` in production: it only holds placeholder contact details and sample reviews.
2. In Supabase Auth settings, disable public sign-ups; create staff accounts with `scripts/create-admin.mjs`.
3. **Netlify** (config in `netlify.toml`): *Add new site → Import an existing project → GitHub* → this repository and its
   default branch. Before the first deploy, add `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`) and
   `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API keys, the public anon key) under
   *Site configuration → Environment variables*. The build refuses to run on Netlify without them.
   Every push to the branch redeploys automatically; changing an env var requires *Deploys → Trigger deploy*.
   Any other static host works too: `pnpm build`, serve `dist/` with SPA fallback to `index.html`.
4. In the admin: add dish photos, the restaurant phone/address/hours (`/admin/settings`),
   and verify any pending prices.

Illustrative food photos in `public/images/demo/` are from Unsplash (free license) and are reused across similar dishes;
replace them with the restaurant's own photos from `/admin/menu`. Dishes without a photo show a branded placeholder.

Dishes that had no photo use free-licensed images from Wikimedia Commons (`public/images/menu/`); authors and licenses are listed
in `src/data/photoCredits.json` and on the `/credits` page (no longer linked from the footer at the owner’s request). The CC BY / BY-SA
licenses require reasonable attribution, so replace those photos with the restaurant’s own before removing the page.

**Menu import notes:** prices written as "A DA / B DA" without a stated meaning, and price ranges such as "550-600 DA",
are imported as *pending verification* (hidden from customers) — 20 products, listed at the top of `/admin/menu`.
