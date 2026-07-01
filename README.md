# Multiplayer Browser Games

A platform for couch-co-op and remote party games in the browser. One device hosts the lobby; others join as controllers. **Hoe Down Derby** is the first playable game.

## Quick start

```bash
npm install
npm run dev
```

1. Open **http://localhost:3001** → **Host Lobby** or **Join Lobby**
2. For couch play: host on PC, phones scan the QR code (same local network for PC Host mode)
3. In the lobby, use **Add bot** to fill seats for solo testing
4. Everyone taps **Ready** to start

> Use port **3001** on all devices — not 5173.

## Solo testing with bots

In the host lobby, click **Add bot** to add AI players (limits depend on the selected game). Bots auto-ready when you ready up. Remove bots with **×** on their row.

## Production

```bash
npm run build
npm start
```

## Project docs

- [project-context.md](./project-context.md) — how the app works (architecture, flow, solo dev)
- [development.md](./development.md) — upcoming features and planning

## Hoe Down Derby rules

- 3 apples (lives) per player
- Hit a gate or barrel → lose 1 apple
- Last player standing wins
