# "Cannot reach server" – what to do

The app is trying to reach the backend but the connection is failing. Use the section that matches your setup.

---

## Still showing the same error? (APK + server)

If you already opened port 5000 and the error persists:

1. **Rebuild and reinstall the APK**  
   Any change to `app.json` (e.g. `usesCleartextTraffic`) or `eas.json` only applies to **new** builds. Uninstall the old APK, run `eas build --profile preview --platform android`, then install the **new** APK.

2. **Test in your phone’s browser**  
   On the same phone (Wi‑Fi or mobile data), open:  
   `http://YOUR_PUBLIC_IP:5000`  
   (e.g. `http://13.62.57.255:5000`).  
   - If this **fails**, the problem is network/server (Security Group, backend not running, or wrong IP).  
   - If this **loads**, the server is reachable; then a **new** APK build (with cleartext enabled) should work in the app.

3. **Confirm backend is running on the server**  
   SSH into Ubuntu and run: `pm2 list` or `pm2 restart backend`. Backend must be listening on `0.0.0.0:5000`.

4. **Confirm the APK’s URL**  
   The URL is set in `eas.json` under `preview.env.EXPO_PUBLIC_API_URL`. If your server’s public IP changed (e.g. new EC2 instance), update that value and rebuild the APK.

---

## When using the APK with your server (AWS / public IP)

**Error:** "Cannot reach server at http://13.62.57.255:5000" (or your server’s public IP).

**Cause:** The server’s firewall (AWS Security Group) is blocking port 5000 from the internet.

**Fix – open port 5000 on AWS:**

1. In **AWS Console** go to **EC2** → **Instances** → select your Ubuntu instance.
2. Open the **Security** tab and click the **Security group** (e.g. sg-xxxxx).
3. Click **Edit inbound rules** → **Add rule**:
   - **Type:** Custom TCP
   - **Port range:** 5000
   - **Source:** Anywhere-IPv4 (0.0.0.0/0) for testing; restrict later if you want.
4. **Save rules.**

**Also check:**

- Backend is running on the server: `pm2 list` or `pm2 restart backend` (or whatever your process name is).
- You can open **http://YOUR_PUBLIC_IP:5000** in your phone’s browser – if that loads, the app should work too.

---

## When running locally (Expo + PC backend)

Your phone is trying to talk to the app’s backend on your PC at **http://192.168.1.4:5000** but the connection is failing. Do these in order.

---

## 1. Use the correct PC address in the app

**What it means:** The app needs your computer’s **IP address** (like 192.168.1.4) so your phone can find the backend on your Wi‑Fi.

**What to do:**

1. On your **PC**, open **Command Prompt** or **PowerShell** and run:
   ```bash
   ipconfig
   ```
2. Find **Wireless LAN adapter Wi-Fi** (or the adapter you use for internet).
3. Note the **IPv4 Address** (e.g. `192.168.1.4` or `192.168.1.5`).
4. Open the file **`mobile/.env`** in your project and set (use your actual IP):
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.4:5000
   ```
   If your IPv4 was different, use that number instead of 192.168.1.4.

---

## 2. Restart Expo so it uses the new address

**What it means:** The app only reads the address when Expo starts. So after you change `mobile/.env`, you must **restart Expo and clear cache** so it picks up the new URL.

**What to do:**

1. Stop the current Expo process (Ctrl+C in the terminal where `npx expo start` is running).
2. In the **mobile** folder run:
   ```bash
   npx expo start -c
   ```
   The **-c** means “clear cache” so the new URL is used.
3. Open the app again on your phone (scan the QR code or reconnect).

---

## 3. Allow port 5000 in Windows Firewall (if it still doesn’t work)

**What it means:** Windows Firewall can block your phone from connecting to your PC on port 5000. Adding a rule **allows** that connection.

**What to do:**

1. On your **PC**, click the Start menu, type **PowerShell**.
2. Right‑click **Windows PowerShell** → **Run as administrator**.
3. Copy and paste this whole line and press Enter:
   ```powershell
   New-NetFirewallRule -DisplayName "Node 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   ```
4. Try the app on your phone again.

---

## Also check

- **Backend is running:** In a terminal, `cd backend` then `npm run dev`. You should see “Backend is running on port 5000”. Keep that terminal open.
- **Same Wi‑Fi:** Your phone and your PC must be on the **same Wi‑Fi network** (not mobile data, not a different network).
