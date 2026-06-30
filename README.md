# Marble Rush Arena 🏁

A mobile-first 3D marble racing web game built with React, Three.js, Rapier physics, and Cloudflare.

Pick a marble, watch the physics simulation, and win demo credits when your marble crosses the finish line first.

## Tech Stack

- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4
- **3D:** Three.js + @react-three/fiber + @react-three/drei + @react-three/rapier
- **State:** Zustand
- **Backend:** Cloudflare Workers (TypeScript)
- **Database:** Cloudflare D1 (SQLite)
- **Deployment:** Cloudflare Pages + Workers

## Quick Start

```bash
# Install frontend deps
npm install --legacy-peer-deps

# Start dev server (frontend)
npm run dev

# In another terminal, start the worker (requires D1 setup)
cd worker && npm install && npx wrangler dev
```

## Project Structure

```
marble-rush-arena/
├── src/
│   ├── App.tsx              # Root component
│   ├── api.ts               # API client (all backend endpoints)
│   ├── store/
│   │   └── gameStore.ts     # Zustand state (auth, race, UI)
│   ├── components/
│   │   ├── Scene.tsx        # R3F Canvas + Physics + Lighting
│   │   ├── Track.tsx        # 14-segment 3D track + marbles
│   │   ├── CameraController.tsx  # Cinematic camera (6 shot types)
│   │   ├── RaceManager.tsx  # Physics-stepped race logic
│   │   ├── UI.tsx           # Main UI (auth, lobby, nav, results)
│   │   ├── Dashboard.tsx    # User dashboard + stats + history
│   │   ├── AdminPanel.tsx   # Admin settings + coupons + users
│   │   └── TermsPage.tsx    # Demo notice / legal page
│   └── hooks/
│       └── useAudio.ts      # Web Audio API sound system
├── worker/
│   ├── src/index.ts         # Cloudflare Worker API (all routes)
│   ├── schema.sql           # D1 database schema + seed data
│   ├── wrangler.toml        # Worker config
│   └── package.json
├── vite.config.ts
├── wrangler.toml            # Pages config
└── README.md
```

## D1 Database Setup

```bash
# 1. Create the D1 database (requires D1 permissions on API token)
npx wrangler d1 create marble-rush-arena

# 2. Copy the database_id from output into worker/wrangler.toml

# 3. Execute the schema
npx wrangler d1 execute marble-rush-arena --file=worker/schema.sql

# 4. Seed demo coupon
npx wrangler d1 execute marble-rush-arena \
  --command="INSERT OR IGNORE INTO coupon_codes (id, code, credits, max_uses) VALUES ('demo', 'MARBLEDEMO1000', 1000, 1000);"
```

## Environment Variables

Set these in Cloudflare dashboard or `.dev.vars`:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT token signing |
| `ADMIN_EMAIL` | Email that gets admin role on signup |
| `ADMIN_PASSWORD_HASH` | SHA-256 hash of admin password |

## Deploy to Cloudflare

```bash
# Frontend (Cloudflare Pages)
npx wrangler pages deploy dist/ --project-name=marble-rush-arena

# Worker API
cd worker
npx wrangler deploy
```

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account (email, username, password) |
| POST | `/api/auth/login` | Login (email, password) |
| GET | `/api/user/profile` | Get profile |
| GET | `/api/user/stats` | Win/loss stats |
| GET | `/api/user/race-history` | Recent races |
| GET | `/api/races/current` | Current race + pick counts |
| POST | `/api/races/pick` | Pick a marble for current race |
| POST | `/api/races/claim` | Claim winnings after race |
| POST | `/api/coupons/redeem` | Redeem coupon code |

Admin routes (require admin role):
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/settings` | View/update settings |
| POST | `/api/admin/coupons` | Create coupon |
| POST | `/api/admin/add-credits` | Add credits to user |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/races` | List races |
| POST | `/api/admin/start-race` | Force new race |
| POST | `/api/admin/set-race-result` | Set winner manually |

## Testing the Full Flow

1. Open the deployed URL on your phone
2. Sign up with email + username + password
3. You get 100 demo credits on signup
4. Join a race — pick one of the 6 marbles
5. Watch the 30-second countdown, then the race starts
6. Camera follows the leading marble through the course
7. When your marble wins, claim +10 demo credits
8. Check your stats and race history in the Dashboard
9. Redeem coupon code `MARBLEDEMO1000` for 1000 bonus credits

## Legal

**Demo only — no real-money gambling.** All credits are demo credits with no real-world value. See the in-app Terms page for full details.

Real-money features will only be added after proper legal review and licensing.

## Performance Notes

- Three.js chunk is ~3.2MB (gzipped ~1.1MB) — first load may be slow on slow connections
- Mobile: cap pixel ratio, reduce shadow map size, keep physics bodies minimal
- Use Low Quality Mode toggle for older devices
