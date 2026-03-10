# Production Blank Page - Troubleshooting Guide

Localhost works perfectly, but https://umnaapptst.testatozas.in/home shows a blank page. Here's how to fix it.

## 1. Check Browser Console (Most Important)

**Press F12** on the deployed site → **Console** tab. Look for red errors.

- **If you see an error** → The Error Boundary we added will now show it on the page. Share the error message.
- **If scripts fail to load (404)** → Asset path or build issue.
- **If CORS errors** → Backend `FRONTEND_URL` may be wrong.

## 2. Verify Production Build Uses Correct Env

The build **must** use `.env.production`:

```bash
cd frontend
npm run build
```

Vite automatically loads `.env.production` when running `vite build`. Verify the file exists:

```
frontend/.env.production
```

Contents should be:
```
VITE_API_URL=https://umnaapptst.testatozas.in
VITE_TILESERVER_URL=https://umnaapptst.testatozas.in/api/map
```

## 3. Backend Environment (Production Server)

On the **production server**, ensure `backend/.env` has:

```
FRONTEND_URL=https://umnaapptst.testatozas.in
```

Without this, Google OAuth redirects and CORS may fail.

## 4. Build & Deploy Steps

1. **Build frontend** (from project root):
   ```bash
   cd frontend && npm run build
   ```
   This creates `frontend/dist/`.

2. **Backend serves frontend** – The server looks for:
   - `FRONTEND_BUILD_PATH` env var, or
   - `backend/build`, or
   - `frontend/dist`

3. **Ensure `frontend/dist` exists** before starting the backend in production.

## 5. Common Causes of Blank Page

| Cause | Solution |
|-------|----------|
| JS bundle 404 | Check that `index.html` and `/assets/*.js` are served correctly |
| React crash | Error Boundary will now show the error on the page |
| Wrong API URL | Rebuild with `.env.production` present |
| Not logged in | `/home` requires login – you'll be redirected to Login page (not blank) |
| Map tiles fail | Check `VITE_TILESERVER_URL` and backend `/api/map/tiles` proxy |

## 6. Quick Test

After deploying, open:
- https://umnaapptst.testatozas.in/ (Landing page – should load)
- https://umnaapptst.testatozas.in/login (Login page – should load)
- https://umnaapptst.testatozas.in/home (If not logged in → redirects to Login)

If the **root** and **login** pages load but **home** is blank after login, the issue is likely in `HomePage` or `MapComponent` (e.g. map tiles, API, or Socket.io).
