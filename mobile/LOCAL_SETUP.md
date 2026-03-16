# Run app locally with Expo + local MongoDB

Use this when the **backend** and **MongoDB** run on your PC and the **app** runs in Expo Go on your phone (or Android emulator).

---

## 1. Backend and MongoDB on your PC

- **MongoDB**: Start MongoDB locally (e.g. `mongod` or MongoDB Compass / local install). Default: `mongodb://127.0.0.1:27017`.
- **Backend `.env`** (in `backend/.env`):
  ```env
  MONGODB_URI=mongodb://127.0.0.1:27017/h20online
  JWT_SECRET=h20-secret
  PORT=5000
  ```
- Start the backend:
  ```bash
  cd backend
  npm run dev
  ```
  You should see: `Backend is running on port 5000` and (if available) a line like `EXPO_PUBLIC_API_URL=http://192.168.x.x:5000`.

---

## 2. Point the app at your PC (phone / Expo Go)

Your phone must use your **PC’s LAN IP** (e.g. `192.168.1.x`), not `localhost`. Easiest:

**Option A – Auto-set IP and start Expo (recommended)**

From the **mobile** folder:

```bash
cd mobile
npm run local
```

This updates `mobile/.env` with your PC’s IP and starts Expo with a clear cache. Open the app on your phone (same Wi‑Fi as the PC).

**Option B – Set IP yourself**

1. On your PC run `ipconfig` and note the **IPv4** for Wi‑Fi (e.g. `192.168.1.5`).
2. In **mobile/.env** set:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.5:5000
   ```
   (use your actual IP)
3. From **mobile** folder:
   ```bash
   npx expo start -c
   ```
4. Open the app on your phone (same Wi‑Fi).

---

## 3. Android emulator only

The emulator sees your PC as `10.0.2.2`. Either:

- Set in **mobile/.env**: `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`, then `npx expo start -c`, or  
- Don’t set it; the app already falls back to `http://10.0.2.2:5000` on Android in dev.

---

## Checklist if it doesn’t work

- [ ] MongoDB is running (e.g. `mongod` or Compass).
- [ ] Backend is running (`cd backend && npm run dev`).
- [ ] Phone and PC are on the **same Wi‑Fi** (not mobile data).
- [ ] You ran **`npm run local`** (or set `EXPO_PUBLIC_API_URL` in `mobile/.env` and ran **`npx expo start -c`**).
- [ ] No firewall blocking port 5000 (see CONNECTION_HELP.md for Windows Firewall rule).

Test from the phone’s browser: open `http://YOUR_PC_IP:5000` (e.g. `http://192.168.1.5:5000`). If that loads, the app should connect.
