# Frontier Client

A pixel-art territory strategy game client built with Vite, TypeScript, Canvas 2D, and Supabase Auth. It connects to the authoritative WebSocket game server and wakes a sleeping Render service with an HTTP health request.

## Gameplay
- Click a tile to inspect it.
- Expand into neutral land next to your territory for 4 gold.
- Capture enemy territory for 8 gold if your neighboring troop strength is greater than the defending garrison.
- Recruit 5 troops for 25 gold.
- Territories generate gold; troops slowly replenish.
- The leaderboard shows connected and away commanders.

## Run locally
```bash
npm install
npm run dev
```

Create a local `.env` file from `.env.example`. The publishable Supabase key is safe for the browser; never use a Supabase secret key here.

## Deploy to GitHub Pages
1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables. Add:
   - `VITE_SUPABASE_URL` = `https://rkenxijtbmiqcgwhvtgr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable key
   - `VITE_SERVER_URL` = your Render service URL, e.g. `https://frontier-server.onrender.com`
3. Push to `main`; the workflow builds and deploys the site.

## Notes
The world is shared by all clients on one server. The server saves snapshots to Supabase so the map and commander progress can survive a Render restart. The prototype currently has one global map and no separate match rooms or AI opponents.