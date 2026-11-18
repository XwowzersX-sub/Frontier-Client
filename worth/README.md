# WORTH client

Static Three.js client intended for GitHub Pages. It is a 3D, third-person arena-sport prototype with an Atrium lobby, contract board, five PvP pads/maps, two match presets (Loadout and Addition), local practice, and WASD/jump/crouch-roll movement.

## Current gameplay direction
WORTH uses checkpoint racing and central-zone control rather than weapon combat. Gear slots are movement/support/style tools. Addition upgrades focus on movement, stamina, ability recovery, jump, and scoring.

## GitHub Pages
The app is in `worth/` so it can live beside the existing Pixel Frontier client without changing its entry point. After merging this folder into the client's main branch, the existing static Pages workflow includes it automatically. Open:

`https://xwowzersx-sub.github.io/Frontier-Client/worth/`

## Configuration
Edit `config.js`:
- `serverUrl`: the Render WebSocket base URL, e.g. `wss://your-worth-service.onrender.com` (without `/ws`).
- The Supabase URL and publishable key are public browser settings. Never put service-role or secret keys here.

The code uses Three.js 0.187.0 from jsDelivr and Supabase JS 2.x from esm.sh. The first load needs network access to those CDNs.

## Local preview
From the `worth/` directory run `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Controls
- WASD: move
- Mouse: camera
- Space: jump; also cancels a roll
- Ctrl while still: crouch and move more slowly
- Ctrl while moving: forward roll with a speed boost
- E: interact with the contract board or a PvP pad
- Esc: release mouse capture

This is an early playable foundation, not a finished Unity game or full production matchmaking release.