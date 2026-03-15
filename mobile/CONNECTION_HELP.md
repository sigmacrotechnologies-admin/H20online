# "Cannot reach server" – what to do

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
