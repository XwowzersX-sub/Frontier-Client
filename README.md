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
The world is shared by all clients on one server. The server saves snapshots to Supabase so the map and commander progress can survive a Render restart. The multiplayer prototype currently has one global map and no separate match rooms or multiplayer AI. Single-player supports configurable AI commanders, map presets, team formats, and win targets.

## Fullscreen controls and construction

- The battlefield fills the screen. A floating dock at the bottom contains Command, Build, and Units panels.
- Click one of your land tiles to select it. Click adjacent neutral or rival land to expand; there are no drawn routes. The Command panel sets the troop ratio to 25%, 50%, 75%, or 100%.
- Build hotkeys 1–7 select City, Factory, Port, Defense Post, Market, Farm, and Highway. Hover over a building to read its description, cost, and placement rules. Select a structure, then click one of your own territories.
- Ports must be placed on a coastline and enable settlement ferries and trade boats. Cities can be upgraded to level 4. Factories and Markets increase gold income; Farms improve troop recovery; Defense Posts make a tile harder to capture. Highways connect to cities, factories, markets, or other highway segments and add gold income.
- Solo match setup includes FFA, Duos, Trios, and Squads; Continents, Island Chain, Pangaea, and Highlands maps; 0–7 AI opponents; four AI difficulty levels; and a configurable land-win target. Team modes automatically add enough AI commanders to form opposing teams.
- Solo campaigns can be paused, resumed, or sped up to 2×/4×. WASD pans the camera, Q/E zooms, C centers, M toggles the grid, and Space pauses.
- Solo campaigns can be saved locally, loaded, exported as portable JSON files, or imported from another save file.
- The Units panel includes quick chat and emoji pings. Multiplayer messages are broadcast by the server; solo messages appear in the field report.
- Solo sandbox modifiers include Random Spawn, Infinite Gold, Infinite Troops, and Anonymous Names. These settings are saved in exported campaign files. Middle-mouse drag pans too.
- Settings include fine pixel scaling, grid visibility, and troop-count display. Sound preference is saved, but sound effects are not implemented yet.
- Nicknames and display settings are saved in the browser.
