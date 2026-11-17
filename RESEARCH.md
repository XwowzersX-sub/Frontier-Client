# OpenFront research notes and Pixel Frontier design map

Research date: 2026-11-17

This note records a review of public OpenFront source used to design Pixel Frontier — Offline Edition. The implementation here is an independent browser game. It uses broad game-design concepts (territorial expansion, an evolving frontier, economy, computer opponents, and land-control victory) rather than copying OpenFront source or assets.

## Sources reviewed

- OpenFront repository: https://github.com/openfrontio/OpenFrontIO
- Architecture: https://github.com/openfrontio/OpenFrontIO/blob/main/docs/Architecture.md
- GameRunner: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/GameRunner.ts
- Game state: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/game/GameImpl.ts
- Attack logic: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/AttackExecution.ts
- Attack state/border tracking: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/game/AttackImpl.ts
- Shared AI attack behavior: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/utils/AiAttackBehavior.ts
- Nation AI: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/nation/NationAttackBehavior.ts
- Tribe AI: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/TribeExecution.ts
- Victory checks: https://github.com/openfrontio/OpenFrontIO/blob/main/packages/engine/src/execution/WinCheckExecution.ts
- Asset licensing: https://github.com/openfrontio/OpenFrontIO/blob/main/LICENSE-ASSETS

## Main findings

### Simulation/rendering separation

The architecture document describes a browser client, deterministic simulation core, shared API/contracts and map/rule libraries, a coordinating game server, and a separate account/data API. The engine advances state in ticks, while the client renders it.

Pixel Frontier reduces this to a local simulation and canvas renderer. No game server, network transport, accounts, telemetry, or remote runtime libraries are needed. It does not emulate the online worker protocol.

### Grid, terrain, and ownership

OpenFront represents the world as tiles, with terrain and mutable ownership/state stored separately. Its attack execution advances through cardinal (north/south/east/west) neighbors; different map searches may use other neighborhoods.

Pixel Frontier uses typed arrays for land, terrain, ownership, and structures. Its capture front follows cardinal neighbors, preventing diagonal corner contact from acting as a direct land connection. The terrain map is generated locally.

### Expansion as a persistent moving front

An OpenFront attack has a troop pool, target, source and live border. It discovers candidate tiles at that border, prioritizes them, applies per-tick progress, checks that candidates still belong to the target and remain connected, applies capture costs, then adds newly exposed enemy/neutral neighbors. A front can refresh or stop when no eligible border remains.

Pixel Frontier gives each attack its own troop reserve, candidate frontier, border set, visited set, and progress remainder. Captures reveal additional tiles. A candidate must connect to the attacker's territory; a boat landing can seed a distant coastal front. Candidate priority includes nearby support and terrain weight. This reproduces the broad feel of a continuous advancing border, but it is a simplified independent algorithm.

### Troop economy and combat

OpenFront attack execution spends committed troops, applies tile-level attrition, considers terrain and defensive state, removes defender troops during capture, and ends an attack when its reserves or usable frontier are exhausted.

Pixel Frontier lets a player commit 25%, 50%, 75%, or 100% of available troops. Each capture consumes part of the attack force; rough terrain, defender reserve density and nearby forts raise resistance. The defender also loses reserves. These values are simplified and tuned for this offline game, not copied from the original combat formula.

### Computer opponents

The shared AI behavior uses troop-reserve thresholds and force commitment, while nation/tribe decisions consider neutral expansion, nearby opponents, incoming fronts, and naval options. The full online AI also includes a larger behavior and diplomacy stack.

Pixel Frontier's four difficulties change how often AI thinks, the troop reserve it waits for, the force it commits, and how often it constructs. AI prefers neutral borders, chooses reachable opponents, responds to incoming attacks, and can build a port to access distant coasts. It does not include the original full diplomacy, alliance, warship, or nation behavior systems.

### Victory and teams

OpenFront's win checks distinguish team and free-for-all contexts, calculate owned land against playable land, and include ranked/remaining-contender cases.

Pixel Frontier supports FFA, Duos, Trios, and Squads. Offline victory occurs when the player/team meets its selected land share or when only one team remains. Online ranking, lobby timers, disconnect handling and server archival do not apply.

## Offline scope

There is no real multiplayer, account/auth flow, shared match, server coordination, cloud save, online leaderboard, matchmaking, ranked ladder, alliance chat, replay server, or Supabase storage. Every visitor to Pages runs a separate local campaign. Browser storage is device/browser-specific; JSON import/export enables manual transfer.

## Licensing and assets

OpenFront source is identified as GNU AGPL-3.0. Its asset notice distinguishes resources under CC BY-SA 4.0 from proprietary and externally served assets that are not licensed for reuse. Pixel Frontier does not copy those source files, maps, images, sprites, fonts, sounds, logos or proprietary assets. This independent code is released under MIT; OpenFront is the research/inspiration reference only.
