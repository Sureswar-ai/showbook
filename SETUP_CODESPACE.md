# Running ShowBook in GitHub Codespaces

Because Node.js can't be installed on your local machine (corporate policy blocks installers, winget, and binary downloads), ShowBook runs in a cloud dev environment instead. Your browser is the only thing that touches your corporate machine.

**No external services are required.** The app uses SQLite for persistence and an in-memory Redis adapter for seat locks and pub/sub. You don't need Neon, Upstash, or any signup beyond GitHub itself.

## One-time setup (≈ 5 minutes)

### 1. Push this repo to GitHub

From Git Bash on this machine (git is already installed):

```bash
cd "C:/Users/2408918/Downloads/Test_vscode/showbook"

git config --global user.name  "Your Name"
git config --global user.email "you@example.com"

git init
git branch -M main
git add .
git commit -m "initial showbook scaffold"

# Create an empty private repo at https://github.com/new (name it 'showbook')
git remote add origin https://github.com/<your-username>/showbook.git
git push -u origin main
```

### 2. Open a Codespace

1. Visit `https://github.com/<your-username>/showbook` in your browser.
2. Click the green **Code** button → **Codespaces** tab → **Create codespace on main**.
3. Wait ~60 seconds. The post-create script automatically runs `pnpm install`, generates Prisma, migrates the SQLite database, and seeds demo data.

### 3. Start the servers

In the Codespace terminal (opens automatically):

```bash
pnpm dev
```

Codespaces auto-forwards port 3000; a popup will offer to open it in your browser. Port 3001 is forwarded silently for API calls.

## Demo login

- **Admin:** phone `+911111111111`, OTP `123456`
- **Customer:** phone `+912222222222`, OTP `123456`

## Demo script (5 minutes)

1. Home page → pick Mumbai.
2. Click a "Now Showing" movie → **Book tickets** → pick a date → pick a showtime at a PVR.
3. Select 3 seats. Open a **second browser tab** at the same seat-layout URL (or another incognito window) and try to click the same seats — you'll watch them lock in real time via Socket.IO.
4. F&B → add a "Large Popcorn" → checkout.
5. Apply offer code `FLAT150`.
6. Click **Pay** → fake gateway modal → **Simulate Success**.
7. Land on confirmation with QR code. Click **Download PDF ticket**.
8. Go to `/profile` → cancel the booking → seats free up in the other tab.
9. Log out, log in as admin (`+911111111111`), visit `/admin` → revenue chart, occupancy table.

## Free-tier limits

- **GitHub Codespaces free:** 60 core-hours/month (30 hours on a 2-core codespace — plenty for demos)

## Resetting the demo data

```bash
pnpm db:reset    # drops + migrates + reseeds in ~10 seconds
```

## If Codespaces is blocked on your account

Same `.devcontainer/` config works on [Gitpod](https://gitpod.io) and [Replit](https://replit.com) — push the repo anywhere, open it there.
