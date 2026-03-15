# H20 Backend

Node.js + Express + MongoDB API for the H20 mobile app.

## Get signup working (app on phone)

1. **Start MongoDB** (service or `mongod`). Check: `npm run check-mongo`
2. **Start backend:** `npm run dev` (in the `backend` folder). You’ll see a line like `EXPO_PUBLIC_API_URL=http://192.168.x.x:5000`
3. **In `mobile/.env`** set that URL: `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000` (use the IP from step 2)
4. **Restart the app:** in `mobile` run `npx expo start -c`, then reopen the app on your phone
5. Phone and PC must be on the **same Wi‑Fi**. If it still fails, allow port 5000 in Windows Firewall (see below).

## Prerequisites

- **MongoDB** must be running locally (or use a cloud URI).
  - Install from https://www.mongodb.com/try/download/community or use MongoDB Atlas.
  - Local default: `mongodb://127.0.0.1:27017`
  - In MongoDB Compass, connect to `mongodb://127.0.0.1:27017` — the `h20online` database will appear after the first run (server or seed).

## Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`: `cp .env.example .env`
   - Edit `.env` if needed:
     - `MONGODB_URI=mongodb://127.0.0.1:27017/h20online`
     - `PORT=5000`
     - `JWT_SECRET=your-secret-key`

3. **Start MongoDB** (if local)
   - Start the MongoDB service, or run `mongod`.
   - Verify in Compass: connect to `mongodb://127.0.0.1:27017`.

4. **Seed the database** (creates `h20online` and sample data)
   ```bash
   npm run seed
   ```
   After this, you should see the `h20online` database and collections in Compass.

   **Plans and subscription products** (Basic Plan, Family Pack, etc. with product prices):
   ```bash
   npm run seed-plans
   ```
   Run this after `npm run seed` (or on an existing DB) to upsert plans and plan products.

5. **Start the server**
   ```bash
   npm run dev
   ```
   You should see: `MongoDB connected to database: h20online` and `Server on port 5000`.

6. **Health check**
   - Open http://localhost:5000/api/health — should return `{ "ok": true, "db": "connected" }`.
   - Or run: `node scripts/check-backend.js` (checks health + register with a test user).

## Mobile app – avoid "network request timeout"

- **Android emulator:** app uses `http://10.0.2.2:5000` by default (no change needed).
- **iOS simulator:** often works with `http://localhost:5000`.
- **Physical device:** the device cannot use `localhost` (that’s the device itself).
  - In the **mobile** project, create or edit `mobile/.env`:
    ```env
    EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000
    ```
  - Replace `YOUR_COMPUTER_IP` with your PC’s LAN IP (e.g. `192.168.1.5`). Find it: `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
  - Restart Expo after changing `.env`: run `npx expo start -c` in the mobile folder (the `-c` clears cache so the new URL is used).
  - **Windows Firewall:** if the phone still can't connect, allow port 5000. In PowerShell as Administrator: `New-NetFirewallRule -DisplayName "Node 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow`

## API Endpoints

- `GET /` – hello
- `GET /api/health` – health + DB status
- `POST /api/auth/register` – body: `{ name, email, phone?, password }`
- `POST /api/auth/register-supplier` – supplier onboarding
- `POST /api/auth/login` – body: `{ email, password }`
- `GET /api/products` – list products
- `POST /api/products` – create product (supplier auth)
- `GET /api/suppliers/me` – supplier profile (auth)
- `GET /api/orders`, `POST /api/orders`, etc.
- `GET /api/wallet`, `GET /api/users/me` – auth required
