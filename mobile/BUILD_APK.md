# Build APK for testing with your AWS backend

The APK must be built with your backend URL so the app talks to your deployed API (e.g. AWS Ubuntu + Atlas).

---

## 1. Set your backend URL

**Option A – EAS Build (recommended, cloud build)**

1. Open **`mobile/eas.json`**.
2. In the profile you will use (`preview` or `production`), replace `YOUR_AWS_BACKEND_URL` in `env.EXPO_PUBLIC_API_URL` with your real backend host:
   - Example: `http://3.110.xx.xx:5000` (EC2 public IP)
   - Or: `https://api.yourdomain.com` (if you use a domain and HTTPS)
3. Do **not** add a trailing slash. Example: `http://3.110.xx.xx:5000`

**Option B – Local build**

1. Open **`mobile/.env`**.
2. Set `EXPO_PUBLIC_API_URL` to your backend URL, e.g.:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:5000
   ```
3. Replace `YOUR_EC2_PUBLIC_IP` with your AWS server’s public IP or domain.

---

## 2. Install EAS CLI (one time)

```bash
npm install -g eas-cli
```

Log in (or create an Expo account):

```bash
eas login
```

---

## 3. Configure the project for EAS (one time)

In the **`mobile`** folder:

```bash
cd mobile
eas build:configure
```

Choose the default options if you’re unsure.

---

## 4. Build the APK

In the **`mobile`** folder:

```bash
eas build --platform android --profile preview
```

- **preview** = builds an **APK** (good for testing and sharing).
- Build runs on Expo’s servers. When it finishes, you get a link to download the APK.

To build for production (also APK with current config):

```bash
eas build --platform android --profile production
```

---

## 5. Download and install

1. When the build completes, EAS prints a download link (or open the link from the email).
2. Download the APK to your computer or phone.
3. On your Android device: enable “Install from unknown sources” for the browser or file manager you use, then open the APK and install.
4. Open the app; it will use the backend URL you set in step 1.

---

## 6. Backend and firewall

- Your AWS backend must be listening on the port you use (e.g. `5000`).
- The EC2 security group must allow **inbound** traffic on that port (e.g. from `0.0.0.0/0` for testing, or restrict later).
- If you use a domain and HTTPS, set `EXPO_PUBLIC_API_URL` to `https://your-api.domain.com` (no port if it’s 443).

---

## Local build (without EAS)

If you prefer to build the APK on your machine:

```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK is at: `android/app/build/outputs/apk/release/app-release.apk`.  
The app will use whatever `EXPO_PUBLIC_API_URL` is in **`mobile/.env`** at the time you run `expo prebuild` / build.
