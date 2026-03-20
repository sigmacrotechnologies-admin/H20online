# Map a domain to your AWS server

Use this when you have a **public IP** (e.g. 13.62.57.255) and want to use a **domain** (e.g. app.yourdomain.com, api.yourdomain.com).

---

## 1. Get a domain

Register a domain from any provider, e.g.:

- **Route 53** (AWS): https://aws.amazon.com/route53/
- **Namecheap**, **GoDaddy**, **Google Domains**, etc.

Example: you own **yourdomain.com**.

---

## 2. Add DNS A records (point domain to your server IP)

In your domain’s DNS settings, add **A records** that point to your **EC2 public IP** (e.g. 13.62.57.255).

Common setup:

| Type | Name / Host        | Value (IP)     | Use case              |
|------|--------------------|----------------|------------------------|
| A    | (blank or @)       | 13.62.57.255   | yourdomain.com         |
| A    | api                | 13.62.57.255   | api.yourdomain.com     |
| A    | admin              | 13.62.57.255   | admin.yourdomain.com  |

- **api.yourdomain.com** → backend (port 5000)
- **admin.yourdomain.com** → admin app (port 3000)

Wait 5–30 minutes for DNS to propagate. Check with:

```bash
ping api.yourdomain.com
```

It should show your server IP.

---

## 3. Use Nginx as reverse proxy (recommended)

So you can use **port 80/443** and **HTTPS** instead of :5000 and :3000.

**On Ubuntu server:**

```bash
sudo apt update
sudo apt install nginx -y
```

**Backend (API)** – e.g. `api.yourdomain.com` → Node on port 5000:

```bash
sudo nano /etc/nginx/sites-available/h20-api
```

Paste (replace `api.yourdomain.com` and `13.62.57.255` if different):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Admin** – e.g. `admin.yourdomain.com` → static files (or your current port 3000):

```bash
sudo nano /etc/nginx/sites-available/h20-admin
```

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /home/ubuntu/H20online/admin/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/h20-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/h20-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Open: **http://admin.yourdomain.com** and **http://api.yourdomain.com**.

---

## 4. Add HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

Follow prompts. After that you get:

- **https://api.yourdomain.com**
- **https://admin.yourdomain.com**

---

## 5. Update your apps to use the domain

**Backend (Ubuntu):**  
If you use a different port or Nginx, no change needed. If the backend must know its public URL, set it in backend `.env` (e.g. for emails/links).

**Admin:**  
Rebuild so the browser calls the **domain**, not the IP:

```bash
cd ~/H20online/admin
echo 'VITE_API_URL=https://api.yourdomain.com' > .env
npm run build
pm2 restart h20-admin
```

If you use Nginx to serve `dist`, copy the new `dist` to the path Nginx uses and reload Nginx (or keep using PM2 serve and Nginx proxy to port 3000).

**Mobile (APK):**  
In `mobile/eas.json`, set `EXPO_PUBLIC_API_URL` to `https://api.yourdomain.com` for the build profile, then rebuild the APK.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Register domain |
| 2 | DNS A records: api.yourdomain.com and admin.yourdomain.com → your EC2 IP |
| 3 | Nginx: proxy api → :5000, serve admin (or proxy to :3000) |
| 4 | certbot for HTTPS |
| 5 | Rebuild admin with `VITE_API_URL=https://api.yourdomain.com`; update mobile build if needed |
