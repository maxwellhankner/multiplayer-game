# Project context — Multiplayer Browser Games

High-level reference for how the app works today.

Jackbox-style party platform: one **host screen** (PC/TV) + **phone controllers**. Server-authoritative rooms over Socket.IO on **port 3001** (`npm run dev`).

**Playable games:** Scribble Time, Balloon Drop, Coin Rush, Hoe Down Derby. Placeholders appear in the lobby as “coming soon.”

**Flow:** Create/join room → lobby (game: specific or random pool, bots, ready) → countdown → play → winner → back to lobby. Session wins persist across rounds in a room.

**Architecture:** Each game registers in three places — `shared/games/<id>/` (catalog), `server/games/<id>/` (logic + bot AI), `src/games/<id>/` (host + controller views). Room lifecycle lives in `server/game.ts`. Platform UI is minimal dark; game themes are per-game.

**Session modes:** `pc-host` works today. `personal-computers` and `mobile-only` are planned, not built.

**Solo dev:** Host at `/host/XXXX`, controllers at `/room/XXXX` (incognito for a second human), or **Add bot** in lobby. Sound browser at `/sounds`.

**Audio:** Game sounds defined in `src/audio/catalog.ts` (Kenney library or `/sounds/game/`). Room events wired in `src/hooks/useRoomSounds.ts`.
