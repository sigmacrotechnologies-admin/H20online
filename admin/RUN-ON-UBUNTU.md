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

**Current AWS deployment:** `http://13.62.57.255:3000` (admin) · API `http://13.62.57.255:5000`

---

## Redeploy after code updates (EC2)

**Important:** `pm2 restart` alone does **not** update the UI. You must **rebuild** `admin/dist` after every `git pull`.

On the server (`/home/ubuntu/H20online` or your clone path):

```bash
cd /home/ubuntu/H20online
git pull

# Recommended — clean build + PM2 restart
chmod +x scripts/redeploy-admin.sh
./scripts/redeploy-admin.sh
```

Or manually:

```bash
cd /home/ubuntu/H20online
git pull

cd admin
cp .env.production.aws.example .env.production   # if missing
npm install
npm run deploy:prod    # deletes old dist, builds fresh production bundle

cd ..
pm2 delete h20-admin 2>/dev/null || true
pm2 start ecosystem.config.cjs --only h20-admin --env production
pm2 save
```

Verify the **new** bundle is live (hash must match build output):

```bash
curl -s http://127.0.0.1:3000/ | grep assets
```

Browser: open **http://13.62.57.255:3000** and hard refresh (**Ctrl+Shift+R**).

---

## Still seeing the old admin?

| Cause | Fix |
|-------|-----|
| Only ran `pm2 restart` | Run `npm run deploy:prod` in `admin/` first |
| Old `dist/` not replaced | `deploy:prod` removes `dist/` before build |
| Code not on server | Push to GitHub, then `git pull` on EC2 |
| Wrong URL (port **5000**) | Use **:3000** for PM2 admin, or rebuild and `pm2 restart h20-backend` if `NODE_ENV=production` serves admin on :5000 |
| Old PM2 process (`vite preview`) | `pm2 delete h20-admin` then start via `ecosystem.config.cjs` |
| Browser cache | Hard refresh or incognito |
| Multiple PM2 apps | `pm2 list` — stop duplicate admin processes |

Check new UI: sidebar should include **Tax settings** and **Serviceable areas**.

---

## Backend redeploy

```bash
cd /home/ubuntu/H20online/backend
npm install --omit=dev
pm2 restart h20-backend
pm2 save
```

If `NODE_ENV=production`, backend also serves `admin/dist` on port **5000**. After admin rebuild, restart backend too:

```bash
pm2 restart h20-backend
```

Verify:

```bash
curl http://13.62.57.255:5000/api/health
curl -s http://13.62.57.255:3000/ | grep assets
```

**Note:** If you set `NODE_ENV=production` in `backend/.env`, you must also set `ALLOWED_ORIGINS=http://13.62.57.255:3000` (admin origin). Without `NODE_ENV=production`, CORS stays open (current AWS behavior).
