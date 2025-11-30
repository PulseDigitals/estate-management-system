# Deployment Guide

This app is a Vite React frontend (`client/`) served by a Node/Express backend (`server/`), with Postgres sessions and Auth0 for OIDC. Follow these steps for a clean deploy.

## 1) Required environment variables
Set these in your hosting platform (do not commit secrets):
- `SESSION_SECRET` — long random string
- `DATABASE_URL` — Postgres URL (e.g., Neon) with `sslmode=require`
- `OIDC_ISSUER_URL` — your Auth0 domain, e.g. `https://<tenant>.auth0.com/`
- `OIDC_CLIENT_ID` — from Auth0 Application
- `OIDC_CLIENT_SECRET` — from Auth0 Application
- `OIDC_REDIRECT_URI` — e.g. `https://www.pulsedigitals.online/api/callback`
- `NODE_ENV=production`
- `PORT=3000` (or your choice)

## 2) Auth0 configuration
In the Auth0 app settings:
- Allowed Callback URLs: match `OIDC_REDIRECT_URI` (e.g. `https://www.pulsedigitals.online/api/callback`)
- Allowed Logout URLs: site origin (e.g. `https://www.pulsedigitals.online`)
- Allowed Web Origins: site origin (e.g. `https://www.pulsedigitals.online`)

## 3) Build and run
From the project root:
```bash
npm install
npm run build          # builds frontend (client/dist) and backend (dist/index.js)
npm start              # uses dist/index.js and serves client/dist
```
Use a process manager (pm2/systemd) or your platform’s runtime to keep it running.

## 4) HTTPS and cookies
- `NODE_ENV=production` enables secure cookies; serve behind HTTPS or a TLS-terminating proxy.
- For local testing on HTTP, use `NODE_ENV=development` and a local callback (e.g. `http://localhost:3000/api/callback`) added to Auth0 Allowed Callbacks.

## 5) Static assets
The server serves `client/dist` as static files with an SPA fallback to `index.html`. Ensure `npm run build` has been run before `npm start`.

## 6) Database/session store
The app uses Postgres sessions (`connect-pg-simple`). If `DATABASE_URL` is unreachable, it falls back to an in-memory store (not for production).

## 7) Health checks
- Hit `/api/login` to start Auth0 flow, ensure you return to `/`.
- After login, `/api/auth/user` should return your user JSON.
- Frontend should load assets from `client/dist` with CSS and JS intact.

## 8) Git hygiene
- `.env` should stay untracked (already in `.gitignore`).
- Optionally add `.env.example` with placeholder keys for collaborators.
