# ShowBook — context for Claude

This repo is a presentation-grade replica of BookMyShow. It was scaffolded end-to-end with Claude from the PRD at [PRD_BookMyShow_Replica.md](../PRD_BookMyShow_Replica.md) (in the parent directory of the original user's machine, not in this repo). This file exists so a new Claude instance can continue the work without re-deriving the history.

## Purpose

**Demo-only.** The user needs this runnable for a presentation. No real payments, no real SMS, no real email, no paid services, no external cloud dependencies. Every external integration is mocked inside the app.

## Stack (locked — do not suggest swaps without asking)

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind, shadcn-style primitives, Zustand, TanStack Query, Socket.IO client
- **Backend:** NestJS 10, Prisma, Socket.IO gateway
- **Database:** **SQLite** (file at `packages/db/prisma/dev.db`)
- **Cache/locks/pub-sub:** **in-memory adapter** at `apps/api/src/redis/in-memory-redis.ts` — drop-in ioredis replacement, shared across the three RedisService roles via module-level singleton maps
- **Auth:** custom JWT (HS256) + phone-OTP with dev bypass
- **Payments:** fake gateway at `apps/api/src/modules/payments/fake-gateway.service.ts`

## Why these deviations from the PRD

The PRD specified Postgres + Redis + Razorpay + Twilio + AWS S3 + Elasticsearch + Google Maps. The user ran into a sequence of blockers:

1. **No admin rights** on their Windows 11 corporate machine → can't install Docker Desktop.
2. **Group policy blocks winget** → can't install Node via the MS CDN.
3. **Proxy blocks binary/executable downloads** (HTTP 403 on any `*.exe` or `*.zip` from nodejs.org) → can't download Node portable zip either.
4. **Upstash and Neon signup blocked or inaccessible** from their environment.

So the app was reworked to require **only Node** (which they get for free inside a GitHub Codespace) and zero external accounts. SQLite + in-memory Redis preserve architectural shape and the seat-lock concurrency story (Node is single-threaded, so `SET NX PX` semantics hold without Redis).

## Running it

Defaults in `.env.example` already work — just copy to `.env`. No fields to fill.

```bash
pnpm install
pnpm db:generate
pnpm db:migrate       # or `pnpm --filter @showbook/db exec prisma migrate dev --name init` on first run
pnpm db:seed
pnpm dev              # turbo runs web:3000 + api:3001 in parallel
```

Codespace's `.devcontainer/post-create.sh` already runs the first four steps.

## Demo logins

- **Admin:** `+911111111111` · OTP `123456`
- **Customer:** `+912222222222` · OTP `123456`
- **Theater Partner:** `+913333333333` · OTP `123456`

OTP `123456` is bypass-accepted in `DEMO_MODE=true`. Real OTPs are also generated and logged to the API stdout.

## Known gotchas (before you "fix" them)

- **Prisma SQLite has no scalar-list (`String[]`) support.** All arrays (`languages`, `formats`, `genres`, `amenities`, `formatsSupported`, `applicableCities`, `applicablePaymentMethods`) and all `Json` fields (`layoutJson`, `metadata`, `rawResponse`) are stored as **JSON-encoded strings**. Parse with helpers in [`apps/api/src/common/json-fields.ts`](apps/api/src/common/json-fields.ts): `parseArr(s)` and `parseJson<T>(s, fallback)`. Don't "fix" the schema back to arrays — SQLite will reject it.

- **Array filters don't use `{ has: X }`.** Because `languages` etc. are strings, `movies.module.ts` filters with `{ languages: { contains: '"Hindi"' } }` (substring match on the JSON representation). Quotation marks are intentional — they prevent "Hindi" from matching "HindiDubbed". Demo scale, not production.

- **`cancel()` in [`bookings.service.ts`](apps/api/src/modules/bookings/bookings.service.ts) accesses the private `seatLock["redis"]`** to publish a `released` event after cancellation. It's awkward but works; don't refactor without testing the "cancel frees seats live in the other tab" demo step.

- **The admin movies + theaters pages** ([admin/movies](apps/web/app/admin/movies/page.tsx), [admin/theaters](apps/web/app/admin/theaters/page.tsx)) have their own local `parseArr` because the admin endpoints return raw Prisma rows (JSON-string arrays) rather than DTOs. If you add more admin list endpoints, mirror the pattern or promote the helper to `@showbook/types`.

- **Socket.IO + Next.js dev HMR can drop connections.** `hooks/useShowSocket.ts` reconnects on mount. If you see "connecting..." stuck, it's usually the dev server restart.

- **Prisma migration on first run** often wants `prisma migrate dev --name init` rather than `migrate deploy`. The post-create script tries both. If `pnpm db:migrate` fails with "No migration found", run:
  ```bash
  pnpm --filter @showbook/db exec prisma migrate dev --name init
  ```

## The "wow moment" (what the user demos)

Two browser tabs open to the same seat-layout URL. User 1 clicks three seats — user 2 sees them grey out in real time. User 2 tries to click those seats — blocked. Proves concurrency + Socket.IO. Don't break this.

Flow, end-to-end, in [`SETUP_CODESPACE.md`](SETUP_CODESPACE.md) → "Demo script".

## Files worth knowing

- [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma) — source of truth for data
- [`packages/db/prisma/seed.ts`](packages/db/prisma/seed.ts) — 10 cities, 16 movies, 12 theaters, ~550 shows, F&B, offers, events, 3 demo users
- [`apps/api/src/modules/shows/seat-lock.service.ts`](apps/api/src/modules/shows/seat-lock.service.ts) — hardest correctness problem, uses pipelined `SET NX PX` + Lua-style compare-and-del
- [`apps/api/src/redis/in-memory-redis.ts`](apps/api/src/redis/in-memory-redis.ts) — ioredis shim; only implements what the app uses
- [`apps/api/src/modules/payments/fake-gateway.service.ts`](apps/api/src/modules/payments/fake-gateway.service.ts) — mirrors Razorpay create-order → verify shape
- [`apps/web/app/seat-layout/[showId]/page.tsx`](apps/web/app/seat-layout/[showId]/page.tsx) — most complex UI
- [`apps/web/components/checkout/FakePaymentModal.tsx`](apps/web/components/checkout/FakePaymentModal.tsx) — demo showstopper

## Do NOT suggest

- Adding Postgres/MySQL as an alternative unless the user explicitly asks — SQLite is the point.
- Adding real Redis unless the user explicitly asks. The in-memory stub is correct for single-process demos.
- Adding Razorpay/Stripe/Twilio/SendGrid integrations. All of these are already decided-no.
- Docker Compose for local services. The user can't run Docker.
- Installing Node locally on the user's Windows machine. Group policy blocks it. Use the Codespace.
- Adding tests, CI, or deployment configs. Not in scope for the demo.

## Package manager

Always `pnpm`. Never npm/yarn in scripts. `packageManager` field in root `package.json` pins pnpm@9.4.0.

## If the user asks for changes

They're demo-focused. Prioritize visible polish (UI, seed data richness, demo flow smoothness) over architectural purity. Keep verification concrete: "does the two-tab seat-lock demo still work?"
