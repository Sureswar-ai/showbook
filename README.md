# ShowBook

A presentation-grade **BookMyShow replica** built for demo purposes. Full-stack: Next.js 14 + NestJS + Prisma + SQLite + in-memory Redis + Socket.IO. **Zero external services** — no Postgres, no cloud Redis, no payments, no SMS, no email. Just Node.

> **Can't install Node locally?** See [SETUP_CODESPACE.md](./SETUP_CODESPACE.md) to run the whole project in a browser-based GitHub Codespace — zero local install, zero admin rights.

## Quick start

### 1. Prerequisites (one-time)
- **Node.js 20+** — [nodejs.org](https://nodejs.org) (user-scope install OK, no admin needed)
- **pnpm 9+** — `npm install -g pnpm` (or `corepack enable`)

That's it. No database signup, no Redis signup, no credit cards.

### 2. Configure
```bash
cd showbook
cp .env.example .env
# The defaults already work — SQLite file + in-memory Redis.
```

### 3. Install & seed
```bash
pnpm install
pnpm db:migrate   # creates dev.db in packages/db/prisma/
pnpm db:seed
```

### 4. Run
```bash
pnpm dev
```
- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

> **First run tip:** if Prisma complains `@prisma/client` isn't generated, run `pnpm db:generate` once.

### 5. Log in
Two demo accounts are seeded:
- **Customer:** phone `+912222222222`, OTP `123456` (or the code printed in the API console)
- **Admin:** phone `+911111111111`, OTP `123456` — grants access to `/admin`

## 5-minute demo script

1. Open http://localhost:3000 → pick Mumbai when prompted.
2. Click a "Now Showing" movie → **Book tickets** → pick a date → pick a showtime at a PVR.
3. Select 3 seats on the seat map. Open a **second incognito tab** at the same URL and try to click the same seats — you'll see them greyed out in real time (Redis seat lock + Socket.IO broadcast).
4. Proceed to F&B → add a "Large Popcorn Combo" → continue to checkout.
5. Apply offer code `FLAT150` → subtotal drops.
6. Click **Pay** — the fake payment modal opens (UPI / Card / NetBanking tabs). Click **Simulate Success**.
7. Land on the confirmation page with a QR code. Click **Download PDF ticket**.
8. Go to **/profile** → **Upcoming** → click **Cancel**. Watch the seats free up in the other tab instantly.
9. Log out, log in as admin (`+911111111111`), visit **/admin** → see the revenue chart reflecting the just-cancelled booking.

## What's mocked vs. real

| Component | Implementation |
|---|---|
| Database | **SQLite** via Prisma — single `dev.db` file, no server |
| Cache / seat locks / pub-sub | **In-memory** adapter (same API surface as ioredis) |
| Real-time seat updates | **Real** Socket.IO WebSocket (in-process pub/sub) |
| Seat locking correctness | **First-writer-wins** — same guarantees as Redis `SET NX PX` in a single Node process |
| JWT auth | **Real** (HS256) |
| Payments | **Fake** gateway — modal matches Razorpay shape, success/fail buttons |
| SMS OTP | **Mock** — OTP logged to server stdout, `123456` always accepted in demo mode |
| Email | **Mock** — writes to in-app `notifications` table |
| Push notifications | **Mock** — in-app inbox only |
| Search | SQLite `LIKE` across movies / events / theaters / cities |
| Maps | **Free** — OpenStreetMap iframe, no API key |
| Poster images | Generated SVGs (no copyright issues, no external CDN) |

To run multi-instance (would need real Redis for cross-process locks), set `REDIS_URL` to a real Redis URL. SQLite also swaps cleanly to Postgres by changing the Prisma provider + `DATABASE_URL`.

## Architecture

```
┌──────────────────┐  HTTP   ┌──────────────────┐   SQL    ┌────────────────┐
│  Next.js 14 PWA  │ ──────▶ │   NestJS API     │ ───────▶ │  SQLite file   │
│  (apps/web)      │         │   (apps/api)     │          │  (dev.db)      │
│                  │ ◀─────▶ │                  │          └────────────────┘
│  Socket.IO       │   WS    │  seat.gateway    │  ┌───────────────────────┐
└──────────────────┘         │  in-memory bus   │──│ in-memory Redis stub  │
                             └──────────────────┘  └───────────────────────┘
```

## Monorepo layout

```
showbook/
├── apps/
│   ├── web/                 # Next.js 14 App Router
│   └── api/                 # NestJS 10
└── packages/
    ├── types/               # shared DTOs + enums
    ├── db/                  # Prisma schema + migrations + seed
    └── config/              # shared tsconfig / tailwind / eslint
```

## Common scripts

```bash
pnpm dev              # both apps in parallel
pnpm build            # full production build
pnpm db:migrate       # apply Prisma migrations
pnpm db:seed          # re-populate demo data
pnpm db:reset         # drop + migrate + seed in one go
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright end-to-end smoke test
```

## Source PRD

See [`../PRD_BookMyShow_Replica.md`](../PRD_BookMyShow_Replica.md) for the full spec. Deviations are documented in [`../../.claude/plans/yes-build-all-of-immutable-starfish.md`](../../.claude/plans/yes-build-all-of-immutable-starfish.md).

## License

Demo / educational use only. Do not ship to production. Do not reuse BookMyShow trademarks, logos, or copyrighted posters.
