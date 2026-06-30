# Development Plan — Multiplayer Browser Games

This document captures the long-term vision, session modes, architecture direction, solo-dev workflow, and game library ideas. **Hoe Down Derby** is the first shipped game; the project is a **platform** that hosts many games behind one lobby.

Platform UI is minimal dark theme. Western styling is scoped to Hoe Down Derby only.

---

## Vision

Build a Jackbox-style multiplayer platform where:

1. Someone creates a **room** (lobby).
2. Other players **join** from their devices.
3. The **host** picks a game and configures settings.
4. Everyone **readies up**; the host starts (or auto-starts when all ready).
5. Gameplay runs according to the **session mode** (see below).

Games differ in mechanics, rendering (Canvas 2D, Three.js, DOM), and input — but share lobby, networking, roles, and lifecycle.

---

## Session Modes (Three Situations)

These are the three primary ways people play. The platform should support them as first-class concepts, even if not all are built in v1.

### Mode A — Living Room (Host Display + Phone Controllers)

**Primary target today.** Matches current Hoe Down Derby flow.

| Role | Device | Responsibility |
|------|--------|----------------|
| Host | PC / TV / large screen | Creates room, game selection, settings, kick; renders main game view |
| Players | Phones (or tablets) | Join via QR/link; name, color, ready; send inputs only |

- One authoritative **game screen** on the host device.
- Controllers are input surfaces (buttons, sticks, gestures).
- Best for: parties, couch co-op, classroom, bar trivia night.

### Mode B — Remote / Everyone on Their Own Screen

**Future phase.** Host runs a dedicated server (or cloud instance); each player runs a full client.

| Role | Device | Responsibility |
|------|--------|----------------|
| Host | PC (or headless server) | Room authority, game settings, optional participation as a player |
| Players | PC, laptop, tablet, phone | Full game view + local input |

- No single “TV screen” — each client renders their own viewport.
- Session mode chosen at room creation: `living-room` vs `distributed`.
- Split-screen FPS (Game 2) might become **one viewport per player** instead of split panes on one monitor.
- Best for: friends online, hybrid remote + local groups.

### Mode C — Mobile-Only (No Host PC)

**Future phase.** Host is also on a phone; every device shows gameplay **and** controls.

| Role | Device | Responsibility |
|------|--------|----------------|
| Host | Phone | Creates room, settings, kick; sees full game + optional host-only UI |
| Players | Phones | Same game view (synced state) + personal controls |

- Game state is server-authoritative; all clients render from the same snapshot.
- UI layout: game area + control overlay (or picture-in-picture controls).
- Performance and screen size are constraints — not every game supports this mode.
- Best for: waiting in line, quick sessions, no laptop available.

### Mode Matrix (per game)

Each game declares which modes it supports:

| Game | Mode A | Mode B | Mode C |
|------|--------|--------|--------|
| Hoe Down Derby | ✅ | 🔜 | 🔜 |
| Split-screen FPS (working title) | ✅ | 🔜 | ❌ |
| Trivia / voting | ✅ | ✅ | ✅ |
| Drawing / party word games | ✅ | ✅ | ✅ |

Games that need a large shared view (racing, FPS split-screen) may never support Mode C. Lightweight party games should support all three.

---

## Roles & Lobby Flow

### Who is the host?

- **First device that creates the room** is the host.
- Host retains: game picker, settings panel, kick, start/back-to-lobby (unless delegated later).
- If the host disconnects: define policy (promote next joiner, pause, or end room) — TBD in implementation.

### Standard lobby lifecycle

```
Create room → Join (QR / link / room code)
           → Lobby (names, colors, ready states)
           → Host selects game + settings
           → All ready (host may force-start with warning)
           → Countdown → Playing → Results
           → Rematch or return to lobby (pick another game)
```

### Host-only controls

- Select game from library
- Game-specific settings (difficulty, rounds, map, time limit)
- Kick player
- Return to lobby (abort current game)
- Optional: lock ready, max players, room visibility

### Player controls

- Join with name + avatar/color
- Ready / unready (if allowed)
- In-game input only on controller UI
- Rematch ready on results screen

---

## Architecture (current)

### Repository layout

```
shared/
  platform.ts           # Lobby settings, platform name
  session.ts            # PC Host / Mobile Only / Personal Computers
  types.ts              # RoomState, PlayerState
  constants.ts          # Hoe Down Derby tuning (move per-game later)
  games/
    types.ts            # GameDefinition (status, maxBots, …)
    bots.ts             # isBot, createBotId, pickBotName
    registry.ts         # All games catalog
    hoe-down-derby/
    tap-counter/        # placeholder
    button-hold/        # placeholder

server/
  index.ts              # Express + Socket.IO
  game.ts               # Room lifecycle (lobby still monolithic)
  room/
    bots.ts             # Host add/remove bots in lobby
  games/
    types.ts            # GameServerModule (tickBots, …)
    registry.ts
    hoe-down-derby/     # Bot AI for jumping
    tap-counter/        # stub
    button-hold/        # stub

src/
  platform pages        # Home, Host setup, Join, Lobby (minimal UI)
  styles/platform.css
  games/
    registry.tsx        # Client module router
    GameHostRouter.tsx
    GameControllerRouter.tsx
    placeholder/
    hoe-down-derby/     # Canvas, views, western CSS
    tap-counter/        # (uses placeholder views)
    button-hold/
```

### Game module contract

Each game folder provides three surfaces:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Catalog** | `shared/games/<id>/definition.ts` | `id`, `name`, `supportedModes`, `maxBots`, `status: playable \| placeholder` |
| **Server** | `server/games/<id>/` | `tickBots`, future: `tick`, `onInput`, `initRound` |
| **Client** | `src/games/<id>/` | `HostView`, `ControllerView`, optional `styles.css` |

Register new games in `shared/games/registry.ts`, `server/games/registry.ts`, and `src/games/registry.tsx`.

Placeholder games appear in the lobby picker (marked “coming soon”) but cannot start a round until `status: 'playable'`.

---

## Per-game bots (host-controlled)

For solo development and filling empty seats:

- **Host adds/removes bots** in the lobby via **Add bot** and **×** on bot rows.
- Socket events: `host:bot-add`, `host:bot-remove`.
- Each game defines `maxBots` in its definition (total players still capped at 8).
- Bots join with random names (`Bot Alpha`, …) and colors.
- Bots are **auto-ready** when added; when any human readies, all bots ready too.
- **Per-game bot AI** runs in `server/games/<id>/` during `playing` (e.g. Hoe Down Derby auto-jumps).

`TEST_MODE` env auto-bots are **removed** — use lobby bots instead.

Future: bot difficulty per game, bot-only lobbies for pure AI races.

---

## Architecture Direction (historical notes)

### Earlier target shape (incremental)

```
shared/
  types/          # Room, Player, GamePhase, platform enums
  constants/
  games/          # Per-game shared config (ids, modes, settings schema)

server/
  index.ts        # HTTP + Socket.IO
  lobby/          # Room CRUD, roles, ready, kick, game selection
  games/
    registry.ts   # Register game modules
    hoe-down/     # Extracted from current game.ts
    fps-arena/    # Future
  session/        # Mode A/B/C routing of state broadcasts

client/
  pages/
    HostPage.tsx      # Shell: lobby OR active game viewport
    JoinPage.tsx      # Controller shell
  platform/
    Lobby.tsx         # Generic lobby (game picker for host)
    GameHostRouter.tsx # Loads game-specific host renderer
  games/
    hoe-down/         # Canvas host view
    fps-arena/        # Three.js host view
  controller/
    GameControllerRouter.tsx # Loads game-specific controller UI
```

### Game module contract (draft)

Each game implements:

| Surface | Responsibility |
|---------|----------------|
| `id`, `name`, `description`, `supportedModes` | Metadata |
| `settingsSchema` | Host-configurable options |
| `minPlayers`, `maxPlayers` | Lobby validation |
| `server` | `init(room, settings)`, `tick(dt)`, `onInput(playerId, action)`, `serialize()` |
| `host` (client) | Render main view for Mode A (Canvas, Three.js, React DOM) |
| `controller` (client) | Input UI for phones |
| `client` (optional) | Full client for Mode B |

Server remains **authoritative** for all gameplay. Clients interpolate/render.

### Rendering stacks

| Stack | Good for |
|-------|----------|
| Canvas 2D | Side-scrollers, board-like views, Hoe Down Derby |
| Three.js | FPS, 3D party games, spatial puzzles |
| React DOM | Trivia, voting, text, drawing prompts |

Keep game-specific rendering inside each game's folder; platform shell stays agnostic.

---

## Game 2 — Split-Screen First-Person (Draft Spec)

**Working title:** *Dusty Duel* or *Saloon Shootout* (placeholder)

### Concept

- Each joined player controls one character in a shared 3D arena.
- **Mode A:** Host PC renders **split-screen** — one viewport per player (2–4 players typical; 8 is a stretch).
- Controllers: virtual joystick + aim zone + action buttons (or simplified tap-to-turn for MVP).
- Server simulates movement, collisions, hits; clients render local prediction optional later.

### Why it validates the platform

- Different input model (analog vs single button)
- Three.js host renderer
- Per-player camera assignment
- Game settings: map, round time, friendly fire

### MVP scope (suggested)

- Flat arena, blocky characters, one weapon
- 2–4 players, horizontal split on host
- Bots fill empty slots in dev (extend current `TEST_MODE` pattern)

### Mode support

- **A:** Split-screen on host ✅
- **B:** One full viewport per client 🔜
- **C:** Skip (too cramped on phones)

---

## Game Library Ideas

Organized by complexity and fit with session modes.

### Tier 1 — Party / low friction (good for all modes)

| Game | Hook | Status | ID |
|------|------|--------|-----|
| **Hoe Down Derby** | Horse jumping survival | playable | `hoe-down-derby` |
| **Tap Counter** | Tap race | placeholder | `tap-counter` |
| **Button Hold** | Hold challenge | placeholder | `button-hold` |
| **Wanted Poster** | Describe/draw/guess | idea | — |
| **Party Vote** | Rank choices, reveal bars | idea | — |

### Tier 2 — Skill / shared screen (Mode A primary)

| Game | Hook | Tech |
|------|------|------|
| **Split-screen FPS** | Arena duel | Three.js |
| **Stagecoach Heist** | Co-op vs obstacles | Canvas or Three.js |
| **Gold Rush Race** | Top-down racing | Canvas |
| **Lasso Legends** | Timing-based rope mini-games | Canvas |

### Tier 3 — Deeper / Mode B leaning

| Game | Hook | Notes |
|------|------|-------|
| **Frontier RPG battle** | Turn-based combat | Per-client UI |
| **Saloon Poker** | Hidden-hand card game | Phone = private hand |
| **Territory Control** | Light RTS zones | Mouse on PC clients |

Pick **one Tier 1 + one Tier 2** game to prove the platform before expanding the catalog.

---

## Solo Development Workflow

Testing multiplayer alone is hard. Standardize these approaches:

### Solo development (updated)

1. **Host lobby bots** — Add/remove bots in the UI (primary workflow).
2. **Multi-tab** — Host at `/host/XXXX`, controllers at `/room/XXXX` (incognito for a second player).
3. **Real phone** — Network URL from `/api/network` / QR code.
4. **Placeholder games** — Register in all three registries; implement server/client when ready.

```bash
npm run dev
```

No special env vars required for bots.

| Tab | URL | Role |
|-----|-----|------|
| 1 | `http://localhost:3001/host/XXXX` | Host display |
| 2 | `http://localhost:3001/room/XXXX` | Controller 1 |
| 3+ | same room URL | Controller 2, 3… |

Use Chrome normal + incognito to avoid sessionStorage clashes on join tabs.

### 3. Phone on same Wi-Fi

- Use network URL from `/api/network` (already implemented).
- QR code in lobby.

### 4. Simulated controller panel (dev-only)

Future: `/dev/controllers` page that opens N fake sockets for stress testing without tabs.

### 5. One computer, zero phones

Sufficient for daily dev: host tab + **Add bot** in lobby, or 2–3 join tabs.

### 6. Recording / replay

Future: log input events + state ticks for regression tests of game logic without UI.

---

## Phased Roadmap

### Phase 0 — Document & align ✅ (this file)

Agree on modes, roles, game module shape, and first migration steps.

### Phase 1 — Platform shell (refactor, no new gameplay)

- [ ] Rename/branding: platform name vs individual game titles
- [ ] Extract Hoe Down Derby into `games/hoe-down`
- [ ] Generic lobby: game list (single entry at first), host settings panel stub
- [ ] Room model: `selectedGameId`, `hostPlayerId`, `sessionMode: 'living-room'`
- [ ] Host reconnection (partially exists via `host:rejoin`)
- [ ] Return to lobby → game picker (not only rematch same game)

### Phase 2 — Second game MVP (split-screen FPS)

- [ ] Three.js host scaffold with N viewports
- [ ] FPS server module: spawn, move, shoot, score
- [ ] Virtual joystick controller
- [ ] Bots for solo testing

### Phase 3 — Game library UX

- [ ] Game cards with description, player count, mode badges
- [ ] Per-game settings UI from schema
- [ ] Results screen abstraction (winners, stats, rematch)

### Phase 4 — Mode B (distributed clients)

- [ ] Room flag: `sessionMode: 'distributed'`
- [ ] Full client entry route `/play/:roomId`
- [ ] Host-as-server option (headless or participating host)

### Phase 5 — Mode C (mobile-only shared screen)

- [ ] Combined view on join route when `sessionMode: 'mobile-only'`
- [ ] Touch layout guidelines per game
- [ ] Bandwidth / state payload optimization

---

## Open Questions (to decide before Phase 1 coding)

1. **Platform name** — Set to **Multiplayer Browser Games** in UI; repo folder remains `multiplayer-game`.
2. **Host transfer** — What happens when host closes laptop mid-lobby?
3. **Game switching** — Require all unready when host changes game selection?
4. **Authentication** — Anonymous forever, or optional accounts for friends lists later?
5. **Persistence** — Rooms ephemeral only, or save stats/leaderboards per game?
6. **FPS split layout** — Dynamic grid (2=vertical, 3–4=quad) or always 2×2 with empty panes?
7. **Package structure** — Monorepo stays one app, or split `server` / `client` / `games/*` packages?

---

## Technical Notes from Current Codebase

Things that carry forward:

- **Port 3001** — Express serves Vite dev middleware + Socket.IO; phones must use same port.
- **Socket events** — Pattern of `room:state` broadcast works for any game; extend payload with `gameState` blob per module.
- **Track width** — Hoe Down Derby sends `host:track-width` for collision alignment; other games may send their own host-capability handshake.
- **Shared constants** — `shared/constants.ts` is game-specific today; split into platform vs per-game config during Phase 1.

---

## Next Steps (recommended)

1. Review this doc; answer **Open Questions** above.
2. Agree on **Game 2** name and MVP scope (player count, map size).
3. Start **Phase 1** refactor: lobby game picker + extract Hoe Down Derby module without changing gameplay.
4. Implement **Tap Counter** as first non-western playable game.

---

*Last updated: planning draft — align before implementation.*
