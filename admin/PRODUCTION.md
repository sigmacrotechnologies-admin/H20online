# Admin — production vs local

## Local development (your PC)

Uses **`admin/.env`** — keep this as localhost:

```
VITE_API_URL=http://localhost:5000
```

Run: `npm run dev` → http://localhost:5174  
Surveys call **local backend** — works with `cd backend && npm run dev`.

**Do not** use `npm run deploy:prod` for local dev.

---

## Production (AWS EC2)

Admin is a **static build**. The API URL is **baked in at build time** from **`admin/.env.production`**.

Production API (from `config/aws-production.json`):

```
VITE_API_URL=http://13.62.57.255:5000
```

Build on server:

```bash
cd admin
npm run deploy:prod
pm2 restart h20-admin
pm2 restart h20-backend
```

`deploy:prod` automatically:
1. Reads `config/aws-production.json`
2. Writes `admin/.env.production` (never localhost)
3. Builds fresh `dist/`

All admin API calls (users, orders, **surveys**, etc.) go to:

```
http://13.62.57.255:5000/api/admin/...
```

---

## Why surveys failed on production

| | Local | Production (before fix) |
|---|--------|-------------------------|
| Admin API URL | localhost:5000 | Sometimes localhost baked in, or old backend without survey routes |
| Survey create | POST localhost:5000/api/admin/surveys ✓ | POST :5000/api/admin/surveys → 404 if backend old |

**Fix:** Push full code to GitHub `main`, pull on EC2, `npm run deploy:prod`, restart **both** PM2 processes.

Verify backend:

```bash
curl http://127.0.0.1:5000/api/health
# must include: "adminSurveysApi": true
```

---

## Push from PC → deploy on EC2

**PC:** push to `main` (does not change your local `.env`).

**EC2:**

```bash
cd ~/H20online
chmod +x scripts/redeploy-production.sh
./scripts/redeploy-production.sh
```
