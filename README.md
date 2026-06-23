# H2O Online Platform

End-to-end water delivery platform: **mobile app** (customers, suppliers, delivery partners), **admin portal**, and **REST API** backed by MongoDB.

| Component | Stack | Default port | Folder |
|-----------|-------|--------------|--------|
| Backend API | Node.js, Express 5, Mongoose | **5000** | `backend/` |
| Mobile app | Expo 54, React Native, Expo Router | **8081** (Metro) | `mobile/` |
| Admin portal | Vite 5, React 18 | **5174** (dev) / **3000** (prod) | `admin/` |
| Documentation | Puppeteer (screenshots / PDF) | — | `docs/` |

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Quick start (local)](#quick-start-local)
3. [Project structure](#project-structure)
4. [Environment variables](#environment-variables)
5. [Backend configuration](#backend-configuration)
6. [API reference](#api-reference)
7. [Admin portal](#admin-portal)
8. [Mobile app](#mobile-app)
9. [Production deployment](#production-deployment)
10. [Domain & HTTPS](#domain--https)
11. [Documentation tooling](#documentation-tooling)
12. [Troubleshooting](#troubleshooting)
13. [Security checklist](#security-checklist)

---

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | 18+ recommended |
| MongoDB | Local install or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| npm | Comes with Node |
| Expo CLI | For mobile dev (`npx expo`) |
| EAS CLI | For cloud APK builds (`npm install -g eas-cli`) |
| PM2 | Production process manager (Ubuntu server) |
| Nginx | Optional reverse proxy + HTTPS |

---

## Quick start (local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # edit MONGODB_URI, JWT_SECRET if needed
npm run check-mongo           # verify MongoDB is reachable
npm run seed                  # sample users, suppliers, products
npm run seed-plans            # subscription plans
npm run seed-delivery-partners
npm run dev                   # http://localhost:5000
```

Verify: open [http://localhost:5000/api/health](http://localhost:5000/api/health) — expect `{ "ok": true, "db": "connected" }`.

### 2. Mobile app

```bash
cd mobile
npm install
npm run local                 # auto-sets LAN IP in .env, starts Expo
```

Scan the QR code with **Expo Go** (phone and PC on the same Wi‑Fi), or press `w` for web / `a` for Android emulator.

### 3. Admin portal

```bash
cd admin
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:5000
npm run dev                   # http://localhost:5174
```

**Master login:** username `H2O admin` · password `admin@H2O`

---

## Project structure

```
H20online/
├── backend/
│   ├── server.js              # Express entry point
│   ├── config/db.js           # MongoDB connection
│   ├── middleware/            # auth, adminAuth
│   ├── routes/                # REST route modules
│   ├── models/                # Mongoose schemas
│   ├── services/              # AI (Groq), payouts, reports
│   └── scripts/               # seed, health checks
├── mobile/
│   ├── app/                   # Expo Router screens (51 routes)
│   ├── src/                   # screens, API client, contexts
│   ├── config/
│   │   ├── api.js             # API URL resolution logic
│   │   └── apiUrl.json        # Production API URL (single source)
│   ├── eas.json               # EAS build profiles + API URL for APK
│   └── scripts/               # set-local-url, set-production-url, icons
├── admin/
│   ├── src/pages/             # Dashboard, Users, Orders, Plans, etc.
│   └── src/api/               # Admin API client
└── docs/
    ├── capture-*.mjs          # Screenshot automation
    ├── generate-*-pdf.mjs     # PDF generation
    └── DOMAIN-SETUP.md        # Nginx + Let's Encrypt guide
```

---

## Environment variables

### Backend — `backend/.env`

Copy from `backend/.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/h20online` | MongoDB connection string (local or Atlas `mongodb+srv://…`) |
| `JWT_SECRET` | *(change in production)* | Secret for signing JWT tokens (mobile + admin) |
| `GROQ_API_KEY` | — | Groq API key for Water AI features (insights, reports, ask) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name |

The server binds to **`0.0.0.0`** so phones on the LAN can reach it. On startup it prints the LAN IP to use in `mobile/.env`.

### Admin — `admin/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000` | Backend base URL — **baked in at build time** (Vite) |

Production example: `VITE_API_URL=http://13.62.57.255:5000` or `https://api.yourdomain.com`

### Mobile — `mobile/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.5:5000` | Backend URL for Expo dev / Expo Go |

**How the mobile app picks the API URL** (`mobile/config/api.js`):

1. `EXPO_PUBLIC_API_URL` from `.env` (highest priority)
2. Dev fallback: Android emulator → `http://10.0.2.2:5000`, else → `http://localhost:5000`
3. Production APK fallback: `mobile/config/apiUrl.json` → `production`

**Production APK URL** is set in `eas.json` at build time — not from `.env`.

---

## Backend configuration

### NPM scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with nodemon (development) |
| `npm start` | Start production server |
| `npm run seed` | Seed users, suppliers, products |
| `npm run seed-plans` | Upsert subscription plans |
| `npm run seed-delivery-partners` | Sample delivery partners |
| `npm run check-mongo` | Test MongoDB connection |
| `npm run check` | Health + register smoke test |

**Additional scripts** (run manually):

```bash
node scripts/seed-docs-demo.js      # Demo data for screenshot docs
node scripts/seed-pickup-hubs.js    # Pickup hub locations
node scripts/test-ai.js             # Test Groq AI endpoints
```

### Database

- Database name: **`h20online`**
- Created automatically on first connection or seed
- Windows + Atlas: DNS fallback to `8.8.8.8` / `1.1.1.1` in `config/db.js`

### Authentication

| Audience | Header | Middleware |
|----------|--------|------------|
| Mobile app users | `Authorization: Bearer <token>` | `middleware/auth.js` |
| Admin portal | `Authorization: Bearer <token>` | `middleware/adminAuth.js` |

- JWT expiry: **7 days**
- Default secret fallback: `h20-secret` (override with `JWT_SECRET` in production)

### Seed credentials (development only)

| Role | Email | Password |
|------|-------|----------|
| Supplier | `aquapure@example.com` | `seedpass123` |
| Delivery partner | `rahul.dp@h2o.test` | `delivery123` |

---

## API reference

**Base URL:** `http://HOST:5000`

**Health checks:**

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `"H2Online Backend Running"` |
| GET | `/api/health` | `{ ok, db, readyState }` |

### Auth — `/api/auth`

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/register` | — | Customer signup: `{ name, email, phone?, password, … }` |
| POST | `/register-supplier` | — | Supplier onboarding |
| POST | `/register-delivery` | — | Delivery partner signup |
| POST | `/login` | — | `{ email, password }` → `{ user, token }` |

### Users — `/api/users` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/me` |
| PUT | `/me` |

### Products — `/api/products`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | — | Query: `search`, `minL`, `maxL`, `category`, `sort` |
| GET | `/:id` | — | Single product |
| POST | `/` | auth | Create product |
| PUT | `/:id` | auth | Update product |
| DELETE | `/:id` | auth | Delete product |

### Orders — `/api/orders` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/:id` |
| POST | `/` |
| PATCH | `/:id/cancel` |

### Reviews — `/api/reviews`

| Method | Path | Auth |
|--------|------|------|
| POST | `/` | auth |
| GET | `/product/:productId` | — |
| GET | `/me/order/:orderId` | auth |

### Wallet — `/api/wallet` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/credit` |
| POST | `/debit` |

### Addresses — `/api/addresses` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| PUT | `/:id` |
| DELETE | `/:id` |

### Plans — `/api/plans`

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | — |
| GET | `/:slug/products` | — |

### Subscriptions — `/api/subscriptions` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| PATCH | `/:id/cancel` |

### Bills — `/api/bills` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/:id/pay` |

### Water intake — `/api/water-intake` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| DELETE | `/:entryId` |
| GET | `/summary` |

### AI (Groq) — `/api/ai` *(auth required, needs `GROQ_API_KEY`)*

| Method | Path |
|--------|------|
| GET | `/water-insight` |
| GET | `/intake-sense` |
| POST | `/water-report` |
| POST | `/ask` |

### Supplier — `/api/supplier` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/orders/incoming` |
| GET | `/orders/history` |
| GET | `/orders/accepted` |
| PATCH | `/orders/:id/accept` |
| PATCH | `/orders/:id/reject` |
| PATCH | `/orders/:id/assign-rider` |
| PATCH | `/orders/:id/cancel` |
| GET | `/products` |
| GET | `/financials` |

### Suppliers profile — `/api/suppliers` *(auth required)*

| Method | Path |
|--------|------|
| GET | `/me` |

### Delivery partners — `/api/delivery-partners`

| Method | Path | Auth |
|--------|------|------|
| GET | `/me` | auth |
| PATCH | `/me` | auth |
| GET | `/` | auth |
| GET | `/subscriptions` | auth |
| GET | `/orders/incoming` | auth |
| GET | `/orders/history` | auth |
| GET | `/orders/summary` | auth |
| PATCH | `/orders/:id/picked-up` | auth |
| PATCH | `/orders/:id/delivered` | auth |
| GET | `/financials` | auth |

### Support

| Prefix | Endpoints *(all auth)* |
|--------|------------------------|
| `/api/customer-support` | GET/POST `/tickets`, GET/POST `/tickets/:id`, POST `/tickets/:id/reply` |
| `/api/supplier-support` | GET `/thread`, POST `/message` |
| `/api/delivery-support` | GET `/thread`, POST `/message` |

### Admin — `/api/admin`

**Auth:**

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | — |
| GET | `/auth/me` | adminAuth |

**Management** *(all require `adminAuth`)*:

| Area | Endpoints |
|------|-----------|
| Users | GET `/users`, GET `/users/:id`, PUT `/users/:id`, DELETE `/users/:id` |
| Admins | POST `/admins` |
| Orders | GET `/orders`, GET `/orders/:id` |
| Suppliers | GET/POST/PATCH/DELETE `/suppliers`, `/suppliers/:id`, `/suppliers/:id/verify` |
| Plans | GET `/plans`, PUT `/plans/:id`, CRUD `/plan-products` |
| Pickup hubs | GET/POST `/pickup-hubs` |
| Subscriptions | GET/PATCH/DELETE `/subscriptions`, assign delivery, financials |
| Wallet | GET `/wallet-management`, POST `/wallet-management/:userId/adjust` |
| Financials | GET `/financials` |
| Delivery partners | GET `/delivery-partners`, PATCH `/delivery-partners/:id/verify` |
| Support | Supplier, delivery, customer support threads and replies |

**Admin role permissions:**

| Role | Financials | Delete users | Remove suppliers | Create admin |
|------|------------|--------------|------------------|--------------|
| Master | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Sub-admin | ❌ | ❌ | ❌ | ❌ |

---

## Admin portal

### Development

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5174**

### Production build (Ubuntu / AWS)

```bash
cd admin
echo 'VITE_API_URL=http://YOUR_SERVER_IP:5000' > .env
npm install
npm run build
sudo npm install -g serve pm2
pm2 serve dist 3000 --spa --name "h20-admin"
pm2 save && pm2 startup
```

Open **http://YOUR_SERVER_IP:3000**

See also: `admin/RUN-ON-UBUNTU.md`

### Admin UI routes

| Path | Page |
|------|------|
| `/login` | Admin login |
| `/` | Dashboard |
| `/users` | User management |
| `/orders` | Orders |
| `/suppliers` | Suppliers |
| `/plans` | Plans & rates |
| `/subscriptions` | Subscriptions |
| `/wallet-management` | Wallet adjustments |
| `/financials` | Financials *(admin/master only)* |
| `/admin-users` | Create admin users *(admin/master only)* |
| `/delivery-partners` | Delivery partners |
| `/supplier-support` | Supplier support chat |
| `/delivery-support` | Delivery support chat |
| `/customer-support` | Customer tickets |

---

## Mobile app

### App identity

| Setting | Value |
|---------|-------|
| Display name | H20nline |
| Slug | `h20online` |
| Package / bundle ID | `com.h20online.app` |
| Scheme | `h20online` |
| EAS project ID | `617044f2-1ffb-421f-94e0-3d1cd4530c70` |
| EAS owner | `apps-sigma` |
| Cleartext HTTP | Enabled (`usesCleartextTraffic: true`) |

### NPM scripts

| Command | Purpose |
|---------|---------|
| `npm run local` | Detect LAN IP → write `.env` → `expo start -c` |
| `npm run prod:local` | Point `.env` at production API → `expo start -c` |
| `npm run start` | Standard Expo start |
| `npm run web` | Expo web (port 8081) |
| `npm run android` / `ios` | Native dev build |
| `npm run icons` | Regenerate launcher icons from H20 logo |
| `npm run build:apk` | EAS production APK |
| `npm run build:apk:preview` | EAS preview APK |

### API URL modes

| Mode | URL source | Command |
|------|------------|---------|
| Local dev (phone) | `mobile/.env` (auto LAN IP) | `npm run local` |
| Test production API in Expo | `mobile/.env` → AWS URL | `npm run prod:local` |
| Production APK | `eas.json` env at build time | `npm run build:apk` |
| Android emulator | Hardcoded `10.0.2.2:5000` | — |

### Change production API URL

Update **both** files, then rebuild the APK:

1. `mobile/config/apiUrl.json` → `"production": "http://NEW_IP:5000"`
2. `mobile/eas.json` → `EXPO_PUBLIC_API_URL` in each build profile

Current production value: **`http://13.62.57.255:5000`**

### EAS build profiles (`eas.json`)

| Profile | Distribution | Android | API URL |
|---------|--------------|---------|---------|
| `development` | internal, dev client | — | AWS URL |
| `preview` | internal APK | `buildType: apk` | AWS URL |
| `production` | internal APK | `buildType: apk` | AWS URL |

### One-time EAS setup

```bash
npm install -g eas-cli
eas login
cd mobile
eas build:configure
```

### Build production APK

```bash
cd mobile
npm install
npm run icons          # once, or after logo change
npm run build:apk
```

See `mobile/BUILD_APK.md` for troubleshooting (EAS upload size, peer deps, cleartext).

---

## Production deployment

Documented setup: **Ubuntu EC2** with PM2. No Docker configuration is included in this repo.

### Architecture overview

```
                    ┌─────────────────────────────────────┐
  Mobile APK  ─────►│  EC2 (e.g. 13.62.57.255)            │
  Admin browser ───►│  ├── Backend  :5000  (PM2)          │
                    │  ├── Admin SPA :3000  (PM2 serve)   │
                    │  └── Nginx :80/443  (optional)      │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                              MongoDB Atlas / local
```

### Backend on Ubuntu

```bash
cd backend
npm install
cp .env.example .env
# Set MONGODB_URI (Atlas recommended for production)
# Set JWT_SECRET to a strong random value
# Set GROQ_API_KEY if using AI features
npm run seed && npm run seed-plans && npm run seed-delivery-partners
pm2 start server.js --name backend
pm2 save && pm2 startup
```

### AWS security group (inbound rules)

| Port | Protocol | Purpose |
|------|----------|---------|
| 5000 | TCP | Backend API |
| 3000 | TCP | Admin portal (if accessed directly) |
| 80 | TCP | HTTP (if using Nginx) |
| 443 | TCP | HTTPS (if using Nginx + Certbot) |
| 22 | TCP | SSH |

### Verify deployment

```bash
curl http://YOUR_SERVER_IP:5000/api/health
# Expected: {"ok":true,"db":"connected",...}
```

---

## Domain & HTTPS

Full guide: **`docs/DOMAIN-SETUP.md`**

Summary:

1. **DNS A records** → point `api.yourdomain.com` and `admin.yourdomain.com` to your server IP
2. **Nginx** → proxy `api` → `127.0.0.1:5000`, serve admin from `admin/dist`
3. **Certbot** → `sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com`
4. **Rebuild admin** with `VITE_API_URL=https://api.yourdomain.com`
5. **Rebuild mobile APK** with `EXPO_PUBLIC_API_URL=https://api.yourdomain.com` in `eas.json`

Example Nginx API block:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Documentation tooling

The `docs/` folder generates screenshot catalogs and PDFs for the platform.

```bash
cd docs
npm install
npm run docs              # Capture all app screens + PDF
npm run customer-journey  # Customer-only journey PDF
```

| Script | Output |
|--------|--------|
| `npm run capture` | Screenshots → `docs/screenshots/` |
| `npm run pdf` | `docs/H2O-Screens-Documentation.pdf` |
| `npm run customer-journey` | `docs/customer journey.pdf` |

Requires Expo web running on **http://localhost:8081** and backend on **:5000**.

---

## Troubleshooting

### Mobile cannot reach backend (timeout)

1. Backend running? Check `http://localhost:5000/api/health`
2. Phone and PC on the **same Wi‑Fi**
3. Use PC **LAN IP** in `mobile/.env`, not `localhost`
4. Run `npm run local` in `mobile/` to auto-detect IP
5. **Windows Firewall** — allow inbound TCP 5000:

   ```powershell
   New-NetFirewallRule -DisplayName "Node 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   ```

6. **AWS:** security group must allow inbound TCP 5000

See `mobile/CONNECTION_HELP.md` and `mobile/LOCAL_SETUP.md`.

### MongoDB connection failed

```bash
cd backend
npm run check-mongo
```

- Local: ensure MongoDB service is running
- Atlas: verify `MONGODB_URI`, IP whitelist, and network access

### Admin shows blank or API errors after deploy

- `VITE_API_URL` must be the **public** URL the browser can reach (not `localhost` when opened from another machine)
- Rebuild after changing `.env`: `npm run build`
- Restart PM2: `pm2 restart h20-admin`

### EAS build fails (peer dependencies)

`mobile/.npmrc` sets `legacy-peer-deps=true`. Run `npm install` in `mobile/` before building.

### AI features not working

Set `GROQ_API_KEY` in `backend/.env`. Test with `node scripts/test-ai.js`.

---

## Security checklist

- [ ] Never commit `.env` files (`backend/.env`, `admin/.env`, `mobile/.env`)
- [ ] Set a strong `JWT_SECRET` in production
- [ ] Change master admin password or restrict admin access by IP
- [ ] Use MongoDB Atlas with IP whitelist in production
- [ ] Prefer HTTPS (Nginx + Certbot) over plain HTTP for production
- [ ] Rotate seed/demo passwords before going live
- [ ] Restrict AWS security group to required ports only
- [ ] Keep `GROQ_API_KEY` server-side only (never in mobile or admin client)

---

## Related documentation

| File | Contents |
|------|----------|
| `backend/README.md` | Backend setup, seeding, firewall |
| `admin/README.md` | Admin roles and login |
| `admin/RUN-ON-UBUNTU.md` | PM2 deploy steps |
| `mobile/BUILD_APK.md` | EAS APK build guide |
| `mobile/CONNECTION_HELP.md` | Network troubleshooting |
| `mobile/LOCAL_SETUP.md` | Full local dev workflow |
| `docs/DOMAIN-SETUP.md` | Domain, Nginx, HTTPS |

---

## Key values quick reference

| Setting | Value |
|---------|-------|
| Backend port | `5000` |
| Backend host | `0.0.0.0` |
| MongoDB database | `h20online` |
| Admin dev port | `5174` |
| Admin prod port | `3000` |
| Expo Metro port | `8081` |
| Production API | `http://13.62.57.255:5000` |
| Android emulator API | `http://10.0.2.2:5000` |
| Master admin login | `H2O admin` / `admin@H2O` |
| Mobile request timeout | 25s (60s for AI endpoints) |
