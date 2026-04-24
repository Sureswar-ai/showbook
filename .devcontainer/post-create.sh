#!/usr/bin/env bash
# Runs once when the Codespace is first created.
set -euo pipefail

echo "==> Enabling corepack + pnpm"
corepack enable
corepack prepare pnpm@9.4.0 --activate

echo "==> pnpm install"
pnpm install --frozen-lockfile=false

echo "==> Prisma client generate"
pnpm db:generate || true

if [ ! -f .env ]; then
  echo "==> Seeding .env from .env.example (SQLite + in-memory Redis defaults are fine)"
  cp .env.example .env
fi

echo "==> Running migrations + seed (SQLite file at packages/db/prisma/dev.db)"
pnpm db:migrate || pnpm --filter @showbook/db exec prisma migrate dev --name init
pnpm db:seed

cat <<'EOF'

┌──────────────────────────────────────────────────────────────────┐
│ ShowBook Codespace is ready.                                     │
│                                                                  │
│ Start both servers:                                              │
│     pnpm dev                                                     │
│                                                                  │
│ Ports 3000 (web) and 3001 (api) will auto-forward.               │
│ Demo accounts: +911111111111 (admin), +912222222222 (customer).  │
│ OTP: 123456                                                      │
└──────────────────────────────────────────────────────────────────┘
EOF
