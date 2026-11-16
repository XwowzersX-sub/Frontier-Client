# Frontier Client

Vite + TypeScript browser client with Supabase Auth, a selectable pixel map, and Render server wake/reconnect logic.

## Run locally
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages
1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables. Add:
   - `VITE_SUPABASE_URL` = `https://rkenxijtbmiqcgwhvtgr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable key
   - `VITE_SERVER_URL` = your Render service URL, e.g. `https://frontier-server.onrender.com`
3. Push to `main`. The included Actions workflow builds and deploys the site.

Never put a Supabase secret/service-role key in this client repo. The current map is a visual prototype; territory simulation and game commands are not implemented yet.