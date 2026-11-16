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

## Controls and presentation

- The main menu lets you choose single-player or multiplayer and set a commander nickname.
- The map is rendered as a detailed pixel-art canvas. Settings control pixel scale, grid visibility, troop counts, and optional sound effects.
- Select one of your territories, then drag across adjacent tiles to draw an expansion route.
- Choose 25%, 50%, 75%, or ALL IN in the bottom command HUD, then press **Expand / Attack**. Troops travel along the route and fight defenders; expansion does not spend gold.
- Recruiting still uses gold. Territory income replenishes troops over time.
- Nicknames and display settings are saved in the browser.

The multiplayer server validates each route, calculates troop losses, updates territory ownership, broadcasts the result, and persists the world snapshot.


## Fullscreen command controls

- The battlefield fills the entire screen; the bottom floating dock contains Command, Build, Units, and Weapons panels.
- Click one of your land tiles to select it, then click adjacent neutral or enemy land to expand. Choose an attack ratio of 25%, 50%, 75%, or 100% in the Command panel. Expansion uses troops rather than gold.
- Build hotkeys 1–7 select City, Factory, Port, Defense Post, Missile Silo, SAM Launcher, and Warship. Select a structure, then click one of your own territories. Ports require a coastline; Warships require a Port.
- In Weapons, click Arm Atom / Arm Hydrogen / Arm MIRV, then click one of your Missile Silos. Choose Fire and click enemy land to use ammunition. Enemy SAM launchers can intercept these simplified in-game strikes. Hotkeys 8, 9, and 0 select Atom, Hydrogen, and MIRV targeting.
- Cities can be upgraded to level 4. Factories and Ports generate additional gold; Cities raise local troop capacity; Defense Posts make a tile harder to capture.
- Settings include fine pixel scaling, grid, and troop-count display. Sound preference is saved but sound effects are not implemented yet.
