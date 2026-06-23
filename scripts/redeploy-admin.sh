#!/usr/bin/env bash
# Redeploy admin SPA on AWS EC2 (run from repo root on the server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Git pull latest..."
git pull origin main || git pull

echo "==> Build admin (clean dist + production API URL)..."
cd admin
npm install
npm run deploy:prod

echo "==> Restart PM2 admin..."
cd "$ROOT"
if pm2 describe h20-admin >/dev/null 2>&1; then
  pm2 delete h20-admin || true
fi
pm2 start ecosystem.config.cjs --only h20-admin --env production
pm2 save

echo ""
echo "==> Verify (compare JS hash with build output above):"
sleep 1
curl -s http://127.0.0.1:3000/ | grep -o 'assets/index-[^"]*' | head -2 || echo "WARN: port 3000 not responding"

echo ""
echo "Open in browser (hard refresh Ctrl+Shift+R): http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP'):3000"
echo "If you use port 5000 for admin, also run: cd backend && pm2 restart h20-backend"
