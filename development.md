# Development plan

Upcoming features and implementation ideas. For how the app works today, see [project-context.md](./project-context.md).

## In progress

- **Sound design** — Wire Kenney/library SFX to game moments (lobby join/leave and countdown done; more TBD).

## Next up

- **More sounds** — Ready, win, life lost, per-game cues as we pick them in `/sounds`.
- **Refactor `server/game.ts`** — Move per-game tick/input out of the monolithic room file as the catalog grows.
- **Per-game lobby settings** — Difficulty, rounds, time limits from a schema instead of hard-coded defaults.

## Later

- **Split-screen FPS** — Three.js host, N viewports, stick controllers; validates analog input + 3D rendering.
- **Session mode: personal-computers** — Each player gets a full client view, not just a controller.
- **Session mode: mobile-only** — Phones show gameplay + controls with no host PC.
- **Host disconnect policy** — Promote host, pause, or end room when host leaves mid-session.
- **Stats / accounts** — Optional persistence beyond session wins in a room.

## Ideas (unscheduled)

- Game cards in lobby with mode badges and player count hints.
- Dev stress-test page with fake controller sockets.
- Input replay logs for regression testing game logic.
