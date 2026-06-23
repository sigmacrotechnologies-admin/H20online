#!/usr/bin/env bash
# Full production redeploy on AWS EC2 — backend + admin (surveys, API, UI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pull latest from main..."
git fetch origin main
git checkout main
git pull origin main

echo "==> Backend..."
cd "$ROOT/backend"
npm install --omit=dev
pm2 restart h20-backend

echo "==> Admin (production API from config/aws-production.json)..."
cd "$ROOT/admin"
npm install
npm run deploy:prod

cd "$ROOT"
pm2 restart h20-admin 2>/dev/null || pm2 start ecosystem.config.cjs --only h20-admin --env production
pm2 restart h20-backend
pm2 save

echo ""
echo "==> Health (must show adminSurveysApi: true)..."
curl -s http://127.0.0.1:5000/api/health | head -c 400
echo ""
echo ""
echo "==> Admin bundle..."
curl -s http://127.0.0.1:3000/ | grep -o 'assets/index-[^"]*' | head -1 || true
echo ""
echo "Done. Browser: http://13.62.57.255:3000 (Ctrl+Shift+R)"
