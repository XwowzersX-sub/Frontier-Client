# Pixel Frontier — Offline Edition

A self-contained, browser-only pixel territory strategy game. The simulation runs locally: no accounts, backend, Supabase project, WebSocket, game server, analytics, or third-party runtime libraries.

## Play

1. Open the GitHub Pages site, or run `python3 -m http.server 8000` from this folder and visit `http://localhost:8000`.
2. Choose Play Solo and configure the map, AI count, difficulty, team size, and victory target.
3. Choose a starting location, then expand into neutral territory and challenge rival nations.
4. Build cities, factories, ports, and forts. Capture the target share of land or outlast every opponent.

The first load needs the static files from GitHub Pages. After the service worker has cached them, the game shell can load offline. Campaign saves live in this browser's local storage; Save File exports a portable JSON file.

## GitHub Pages deployment

The repository includes a static Pages workflow at .github/workflows/deploy.yml and requires no build step.

1. Open Settings → Pages.
2. Set Build and deployment → Source to GitHub Actions.
3. Push to main (or run the workflow manually under Actions).
4. Open the Pages URL shown in the workflow deployment summary.

No Actions secrets or environment variables are needed. This is a static site; there is no server to wake up and no Supabase configuration.

## Controls

- Left click neutral land or a rival nation to send an expansion/attack front.
- Left click your land to inspect it.
- Select a building from the bottom dock, then click a tile you own to place it.
- Choose 25%, 50%, 75%, or 100% troop commitment before an attack.
- Drag the map to pan; scroll to zoom.
- 1–4 select buildings; Backspace cancels selection; Space pauses; Esc closes a panel or deselects.
- A port enables longer-distance coastal landings.

## Included systems

- Procedurally generated world, pangaea, island-chain, highlands, and random maps.
- Free-for-all, Duos, Trios, and Squads.
- Up to 49 AI nations (50 commanders total), with four difficulty profiles.
- Tile ownership and a moving attack frontier with per-attack troop reserves.
- Terrain-sensitive capture costs, defender troop depletion, and fortification resistance.
- Gold income, troop regeneration/capacity, cities, factories, ports, and forts.
- Local saves, JSON import/export, pause, and simulation speed controls.
- 60%, 70%, or 80% land-control target and last-team-standing victory.

## Research and independence

Pixel Frontier is an independent implementation inspired by broad RTS concepts in OpenFront. It does not copy OpenFront source files, graphics, sounds, map data, logos, or fonts. Terrain, interface, names, and simulation code are original.

Research references:
- OpenFront architecture: https://github.com/openfrontio/OpenFrontIO/blob/main/docs/Architecture.md
- Attack implementation: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/AttackExecution.ts
- Nation AI behavior: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/nation/NationAttackBehavior.ts
- Repository and licensing: https://github.com/openfrontio/OpenFrontIO

OpenFront's source is AGPL-3.0; its asset notice distinguishes CC BY-SA resources from separately restricted proprietary assets. This project does not incorporate those files. Its original code is licensed under MIT; see LICENSE.

See RESEARCH.md for source findings and how the design influenced this independent implementation.

## Limitations

This is an offline single-player game. Different visitors to the Pages site do not share a map or match. There is no online matchmaking, login, shared leaderboard, or cloud save. Saves stay in the local browser unless exported. The mechanics are inspired by OpenFront but are not a one-to-one port of its complete simulation or balance.
