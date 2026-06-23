# Build APK (production) — H20nline

Production API: **`http://13.62.57.255:5000`** (AWS EC2).  
Single source of truth for the URL: **`mobile/config/apiUrl.json`** — keep `eas.json` in sync when the IP changes.

---

## Quick: build production APK

```bash
cd mobile
npm install
npm run icons          # once, or after logo change
npm run check:apk      # validate env only (no EAS upload)
npm run build:apk      # syncs .env → eas.json → EAS cloud APK build
```

**Before first build**, ensure `mobile/.env` has:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

(API URL is taken from `config/aws-production.json` automatically.)

`npm run build:apk` runs **`scripts/prepare-apk-build.js`**, which:

1. Sets `EXPO_PUBLIC_API_URL` from `config/aws-production.json`
2. Copies Maps + Razorpay keys from `mobile/.env` into `eas.json` and `.env.production`
3. Starts EAS build with profile **production** (APK, internal distribution)

**AWS backend must be live:** `http://13.62.57.255:5000/api/health`

**Missing Product-icon images on EAS?** Do not exclude `mobile/assets/images/Product-icon/` in `.easignore` — Cart/Order screens require those PNGs at bundle time. Usually a bad nested `react-native@0.86` inside `0.81.5`. Fixed via `overrides` in `package.json` and `.npmrc` (`legacy-peer-deps=true`). After pulling, run `npm install` in `mobile/` then rebuild.

**Upload failed (`ECONNRESET` / large archive)?** Root `.easignore` uploads only the `mobile/` folder (~small archive). Retry on stable Wi‑Fi.

Or preview profile (also APK):

```bash
npm run build:apk:preview
```

Install the new APK on Android. Uninstall an old APK first if you changed `app.json` (icon, package name, cleartext).

---

## API URL: production vs local dev

| Mode | How API URL is set | Command |
|------|-------------------|---------|
| **Production APK** | `eas.json` → `EXPO_PUBLIC_API_URL` at build time | `npm run build:apk` |
| **Local dev (PC IP)** | `mobile/.env` auto-set to LAN IP | `npm run local` |
| **Test AWS API in Expo** | `mobile/.env` → production URL | `npm run prod:local` |
| **Back to local dev** | `mobile/.env` → PC LAN IP again | `npm run local` |

You do **not** need to edit `.env` before every APK build — EAS uses `eas.json`.

### Change AWS IP later

1. Edit **`mobile/config/apiUrl.json`** → `"production": "http://NEW_IP:5000"`
2. Copy the same URL into **`mobile/eas.json`** (preview + production `env`)
3. Rebuild: `npm run build:apk`

---

## One-time EAS setup

```bash
npm install -g eas-cli
eas login
cd mobile
eas build:configure
```

---

## App name & icon

- **Display name:** H20nline (`app.json` → `expo.name`)
- **Package:** `com.h20online.app`
- **Icon:** generated from `assets/images/H20-logo.png` via `npm run icons`

After changing the logo, run `npm run icons` then rebuild the APK.

---

## Requirements on AWS

- Backend running: `pm2 list` → `backend` online
- Security group: inbound **TCP 5000**
- Test: `http://13.62.57.255:5000/api/health`

HTTP (not HTTPS) is allowed via `usesCleartextTraffic` in `app.json`.

---

## Google Maps (address picker, distance, tracking)

**Web** loads Maps via JavaScript — works when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set.

**Expo Go on a phone** cannot use native Google Maps tiles with your own API key. The app uses a **WebView / Static Maps fallback** in Expo Go when the key is in `mobile/.env`.

1. Add to **`mobile/.env`** (same value as `GOOGLE_MAPS_API_KEY` in `backend/.env`):
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   ```
2. Enable in Google Cloud: **Maps JavaScript API**, **Geocoding API**, **Maps Static API**, **Maps SDK for Android**, **Maps SDK for iOS**.
3. Restart Expo: `npx expo start -c`

For **full native maps** (best on Android APK), use a **development build** or production APK (`npm run build:apk`) — `app.config.js` sets `android.config.googleMaps.apiKey` for native tiles.

---

## Local build (without EAS)

```bash
cd mobile
npm run prod:local     # or set .env to AWS URL
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`
