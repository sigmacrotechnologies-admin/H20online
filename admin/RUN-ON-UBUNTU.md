# Run admin on Ubuntu server

## 1. Set the backend API URL (choose one)

**Option A – Create `.env` in the admin folder (recommended)**

On the server, in the admin folder. Use your **backend’s public URL** (so the browser can reach it), not localhost:

```bash
cd /path/to/admin
echo 'VITE_API_URL=http://YOUR_SERVER_PUBLIC_IP:5000' > .env
```

Example: if your EC2 public IP is 13.62.57.255:

```bash
echo 'VITE_API_URL=http://13.62.57.255:5000' > .env
```

Use `http://localhost:5000` only if you open the admin from the same machine (e.g. SSH tunnel). If you open the admin from your PC at http://SERVER_IP:3000, the API URL must be the server’s public IP so the browser sends requests to the server.

**Option B – One command (no .env file)**

Build with the URL in the same line:

```bash
cd /path/to/admin
VITE_API_URL=http://localhost:5000 npm run build
```

---

## 2. Install dependencies and build

```bash
cd /path/to/admin
npm install
npm run build
```

---

## 3. Serve with PM2

```bash
sudo npm install -g serve pm2
cd /path/to/admin
pm2 serve dist 3000 --spa --name "h20-admin"
pm2 save
pm2 startup
```

Then open in browser: **http://YOUR_SERVER_IP:3000**
