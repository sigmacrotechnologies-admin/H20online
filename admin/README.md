# H2O Admin Portal

Separate front-end app for H2O admin: manage users, orders, suppliers, plans and financials. Uses the same backend as the mobile app.

## Setup

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to your backend (e.g. `http://localhost:5000`).
2. Install and run:

```bash
cd admin
npm install
npm run dev
```

Open http://localhost:5174 (or the port Vite prints).

## Login

- **Master user (fixed):** Email/Username: `H2O admin`, Password: `admin@H2O`
- **Admin / Sub-admin:** Created by master or admin from "Admin users" in the dashboard. They log in with their email and password.

## Roles

| Role       | Users | Orders | Suppliers (add) | Suppliers (remove) | Plans & rates | Financials | Create admin |
|-----------|-------|--------|------------------|--------------------|---------------|-------------|--------------|
| Master    | ✅    | ✅     | ✅               | ✅                 | ✅            | ✅          | ✅           |
| Admin     | ✅    | ✅     | ✅               | ✅                 | ✅            | ✅          | ✅           |
| Sub-admin | ✅ (no delete) | ✅ | ✅               | ❌                 | ✅            | ❌          | ❌           |

- Sub-admin can **edit** users but **not delete** them.
- Sub-admin can **add** suppliers but **not remove** them.
- Sub-admin **cannot** see Financials or create admin users.

## Backend

Admin APIs are under `/api/admin/*`. Ensure the backend is running and CORS allows the admin origin (e.g. `http://localhost:5174`).
