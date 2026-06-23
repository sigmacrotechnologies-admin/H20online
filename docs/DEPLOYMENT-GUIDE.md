# H2O Online — Deployment Guide

**Document type:** Deployment & configuration guide  
**Version:** 1.0  
**Platforms:** Local development · GitHub · AWS EC2  
**Production API (current):** `http://13.62.57.255:5000`  
**Production admin (current):** `http://13.62.57.255:3000`

---

## 1. Overview

H2O Online has three deployable components:

| Component | Folder | Local URL | Production (AWS) URL |
|-----------|--------|-----------|---------------------|
| Backend API | `backend/` | http://localhost:5000 | http://13.62.57.255:5000 |
| Admin portal | `admin/` | http://localhost:5174 | http://13.62.57.255:3000 |
| Mobile app | `mobile/` | Expo Metro :8081 | APK → production API |

**Database:** MongoDB Atlas (`H20online` database) — used for both local dev and production.

**Single source of truth for AWS URLs:** `config/aws-production.json`

When the EC2 IP or domain changes, update that file **and** sync all files listed in Section 3.

---

## 2. Architecture (Production)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────┐
│ Mobile APK  │────►│  EC2 Ubuntu │────►│  MongoDB Atlas (H20online)      │
│ Expo Go     │     │  :5000 API  │     │  mongodb+srv://...              │
└─────────────┘     │  :3000 Admin│     └─────────────────────────────────┘
                    └─────────────┘
       Browser ────► Admin SPA (static dist via PM2 serve)
```

**GitHub flow:** Push code → SSH to EC2 → `git pull` → rebuild → `pm2 restart`

---

## 3. Configuration matrix — what to change where

### 3.1 ⚠ CHANGE FOR PRODUCTION (before AWS deploy)

| # | File | Variable / setting | Production value | Notes |
|---|------|-------------------|------------------|-------|
| 1 | `backend/.env` (on server) | `NODE_ENV` | `production` | **Required** — enables CORS lock, env validation |
| 2 | `backend/.env` | `MONGODB_URI` | Atlas connection string | Same cluster OK; use strong credentials |
| 3 | `backend/.env` | `JWT_SECRET` | Random 32+ bytes | `openssl rand -hex 32` |
| 4 | `backend/.env` | `MASTER_ADMIN_PASSWORD` | Strong password | Must not be `admin@H2O` |
| 5 | `backend/.env` | `ALLOWED_ORIGINS` | `http://13.62.57.255:3000` | Admin browser origin; add HTTPS domain later |
| 6 | `backend/.env` | `RAZORPAY_KEY_ID` | Live key | `rzp_live_...` for real payments |
| 7 | `backend/.env` | `RAZORPAY_KEY_SECRET` | Live secret | Never commit to GitHub |
| 8 | `admin/.env.production` | `VITE_API_URL` | `http://13.62.57.255:5000` | Baked into admin build |
| 9 | `mobile/config/apiUrl.json` | `production` | `http://13.62.57.255:5000` | APK fallback URL |
| 10 | `mobile/eas.json` | `EXPO_PUBLIC_API_URL` | `http://13.62.57.255:5000` | All build profiles |
| 11 | `config/aws-production.json` | all fields | Current EC2 IP/URLs | Central reference |
| 12 | AWS Security Group | Inbound rules | 22, 5000, 3000, 80, 443 | See Section 7 |

**Template files (safe to commit):**

- Local backend: `backend/.env.local.example` → copy to `backend/.env`
- Production backend: `backend/.env.production.example` → copy to `backend/.env` on server
- Local admin: `admin/.env.example` → copy to `admin/.env`
- Production admin: `admin/.env.production.aws.example` → copy to `admin/.env.production`
- Local mobile: `mobile/.env.local.example` → copy to `mobile/.env`

### 3.2 Local development (no production flags)

| File | Setting | Local value |
|------|---------|-------------|
| `backend/.env` | `NODE_ENV` | `development` |
| `backend/.env` | `MONGODB_URI` | Atlas URI (same as prod cluster OK) |
| `backend/.env` | `PORT` | `5000` |
| `admin/.env` | `VITE_API_URL` | `http://localhost:5000` |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` | `http://YOUR_PC_IP:5000` or run `npm run local` |

**Do not set** `NODE_ENV=production` locally unless testing CORS/production validation.

---

## 4. Run locally (Atlas DB + local servers)

### Prerequisites

- Node.js 18+
- Git
- MongoDB Atlas cluster reachable from your PC (IP allowlist: `0.0.0.0/0` for dev or your IP)
- Phone on same Wi-Fi for Expo Go (optional)

### Step 1 — Backend

```bash
cd backend
npm install
cp .env.local.example .env
# Edit .env: set MONGODB_URI (Atlas), JWT_SECRET, Razorpay test keys, Google Maps key
npm run check-mongo
npm run dev
```

Verify: http://localhost:5000/api/health → `{ "ok": true, "db": "connected", "env": "development" }`

### Step 2 — Admin

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

Open: http://localhost:5174  
Login: `H2O admin` / `admin@H2O`

### Step 3 — Mobile

```bash
cd mobile
npm install
npm run local
```

This auto-sets `EXPO_PUBLIC_API_URL` to your PC LAN IP and starts Expo. Scan QR with Expo Go.

**Android emulator:** set `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000` in `mobile/.env`

**Test production API from Expo (no APK rebuild):**

```bash
cd mobile
npm run prod:local
npx expo start -c
```

---

## 5. GitHub setup

### 5.1 Repository

1. Create a GitHub repository (private recommended).
2. Ensure `.gitignore` excludes secrets:
   - `backend/.env`
   - `admin/.env`, `admin/.env.production`
   - `mobile/.env`
3. Push the codebase:

```bash
git add .
git commit -m "Initial H2O Online platform"
git remote add origin https://github.com/YOUR_ORG/H20online.git
git push -u origin main
```

**Never commit** real `MONGODB_URI`, `JWT_SECRET`, Razorpay live keys, or `.env` files.

### 5.2 Branch strategy (recommended)

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code deployed to EC2 |
| `develop` | Integration / testing (optional) |

Deploy to AWS from `main` after testing locally.

### 5.3 What stays on the server only (not in GitHub)

| Secret / config | Location |
|-----------------|----------|
| Production `backend/.env` | EC2 `/home/ubuntu/H20online/backend/.env` |
| Built admin `dist/` | Generated on server via `npm run build:prod` |
| PM2 process list | `pm2 save` on EC2 |

---

## 6. AWS EC2 deployment

### 6.1 Server requirements

- Ubuntu 22.04 LTS (or similar)
- Node.js 18+ (`nvm install 18`)
- PM2: `sudo npm install -g pm2 serve`
- Git
- Ports open in security group (Section 7)

### 6.2 First-time setup on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.62.57.255

# Clone repository
cd /home/ubuntu
git clone https://github.com/YOUR_ORG/H20online.git
cd H20online

# Backend
cd backend
npm install --omit=dev
cp .env.production.example .env
nano .env   # Set MONGODB_URI, JWT_SECRET, MASTER_ADMIN_PASSWORD, ALLOWED_ORIGINS, Razorpay keys

# Verify MongoDB + env
npm run check-mongo
node scripts/check-razorpay-env.js

# Admin build
cd ../admin
npm install
cp .env.production.aws.example .env.production
npm run build:prod

# Start with PM2 (from repo root)
cd ..
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # follow printed command
```

### 6.3 Verify deployment

```bash
curl http://localhost:5000/api/health
curl http://13.62.57.255:5000/api/health
```

Browser:

- Admin: http://13.62.57.255:3000
- API health: http://13.62.57.255:5000/api/health

### 6.4 Redeploy after GitHub push

On EC2:

```bash
cd /home/ubuntu/H20online
git pull origin main

# Backend
cd backend
npm install --omit=dev
pm2 restart h20-backend

# Admin (rebuild — API URL is baked in at build time)
cd ../admin
npm install
npm run build:prod
pm2 restart h20-admin

pm2 save
pm2 status
```

### 6.5 Mobile APK (production API)

On your dev machine:

```bash
cd mobile
# Confirm eas.json + config/apiUrl.json point to http://13.62.57.255:5000
npm run build:apk
```

Install APK on devices. API URL is embedded at build time.

---

## 7. AWS security group

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 5000 | TCP | 0.0.0.0/0 | Backend API (mobile + admin) |
| 3000 | TCP | 0.0.0.0/0 | Admin SPA (PM2 serve) |
| 80 | TCP | 0.0.0.0/0 | Nginx HTTP (optional) |
| 443 | TCP | 0.0.0.0/0 | Nginx HTTPS (optional) |

**MongoDB Atlas:** Network Access → allow EC2 public IP or `0.0.0.0/0` (restrict in production if possible).

---

## 8. Production API reference

**Base URL:** `http://13.62.57.255:5000`  
**Auth:** `Authorization: Bearer <JWT>` (customer/supplier/delivery routes)

### 8.1 Health & public

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | No |

### 8.2 Customer mobile APIs

| Prefix | Examples |
|--------|----------|
| `/api/auth` | login, register |
| `/api/users` | me, update profile |
| `/api/orders` | create, list, track |
| `/api/water-intake` | log intake, summary |
| `/api/leaderboard` | monthly rankings, preferences |
| `/api/wallet` | balance, credit, debit |
| `/api/subscriptions` | list, create, cancel |
| `/api/payments` | Razorpay create-order, verify |
| `/api/settings` | tax, payment settings |
| `/api/serviceability` | delivery area check |
| `/api/addresses` | CRUD |
| `/api/bills` | list, pay |
| `/api/ai` | water insight, report, ask |

### 8.3 Admin portal APIs

**Base:** same host · **Prefix:** `/api/admin/*`  
**Auth:** Admin JWT from `POST /api/admin/auth/login`

| Area | Paths |
|------|-------|
| Users | `/api/admin/users`, CRUD |
| Orders | `/api/admin/orders` |
| Suppliers | `/api/admin/suppliers`, verify |
| Delivery partners | `/api/admin/delivery-partners` |
| Plans & products | `/api/admin/plans`, plan-products |
| Subscriptions | `/api/admin/subscriptions` |
| Financials | `/api/admin/financials` |
| Wallet | `/api/admin/wallet-management` |
| Serviceable areas | `/api/admin/serviceable-areas` |
| Tax settings | `/api/admin/tax-settings` |
| Surveys | `/api/admin/surveys` |

### 8.4 Mobile client mapping

| App | Config file | Production value |
|-----|-------------|------------------|
| APK / release | `mobile/eas.json` | `EXPO_PUBLIC_API_URL=http://13.62.57.255:5000` |
| APK fallback | `mobile/config/apiUrl.json` | `"production": "http://13.62.57.255:5000"` |
| Admin SPA | `admin/.env.production` | `VITE_API_URL=http://13.62.57.255:5000` |

---

## 9. Pre-deployment checklist

### Backend

- [ ] `NODE_ENV=production` on EC2
- [ ] Strong `JWT_SECRET` (not default)
- [ ] `MASTER_ADMIN_PASSWORD` changed
- [ ] `ALLOWED_ORIGINS` includes admin URL
- [ ] Atlas URI correct; EC2 IP allowed in Atlas
- [ ] Razorpay keys set (live for production payments)
- [ ] `curl http://13.62.57.255:5000/api/health` returns ok

### Admin

- [ ] `admin/.env.production` has production `VITE_API_URL`
- [ ] `npm run build:prod` succeeds
- [ ] PM2 serving `admin/dist` on port 3000
- [ ] Login works at http://13.62.57.255:3000

### Mobile

- [ ] `eas.json` production profile URL correct
- [ ] `config/apiUrl.json` matches
- [ ] New APK built after API URL change
- [ ] Security group port 5000 open

### GitHub

- [ ] No `.env` files committed
- [ ] Latest code pushed to `main`
- [ ] EC2 `git pull` completed

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error on admin | Set `ALLOWED_ORIGINS=http://13.62.57.255:3000` and `NODE_ENV=production`; restart backend |
| Mobile cannot reach API | Check security group port 5000; verify URL in `mobile/.env` |
| `db: disconnected` | Check Atlas URI; add EC2 IP to Atlas Network Access |
| Admin shows wrong API | Rebuild admin with correct `.env.production` |
| Payments fail | Run `node backend/scripts/check-razorpay-env.js`; use matching test/live keys on backend + mobile |
| Production env check failed | See error list; fix `JWT_SECRET`, `MASTER_ADMIN_PASSWORD`, `ALLOWED_ORIGINS` |

---

## 11. HTTPS & custom domain (optional)

See `docs/DOMAIN-SETUP.md` for Nginx + Let's Encrypt.

After HTTPS:

1. Update `config/aws-production.json`
2. Update `backend/.env` → `ALLOWED_ORIGINS=https://admin.yourdomain.com`
3. Rebuild admin with `VITE_API_URL=https://api.yourdomain.com`
4. Rebuild mobile APK with new URL in `eas.json`
5. Open ports 80/443; consider closing direct 5000/3000 to public

---

## 12. Quick command reference

### Local

```bash
cd backend && npm run dev
cd admin && npm run dev
cd mobile && npm run local
```

### Production (EC2)

```bash
cd /home/ubuntu/H20online
git pull
cd backend && npm install --omit=dev && pm2 restart h20-backend
cd ../admin && npm run build:prod && pm2 restart h20-admin
pm2 status
```

### Generate this PDF

```bash
cd docs
npm run deployment-guide
```

---

## 13. Document control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial deployment guide — AWS EC2 13.62.57.255, Atlas, GitHub flow |

---

*End of document — H2O Online Deployment Guide v1.0*
