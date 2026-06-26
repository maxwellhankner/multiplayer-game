# Hoe Down Derby

A Jackbox-style multiplayer horse jumping game. The desktop hosts the game and displays the race; phones connect as controllers via QR code.

## Quick start

```bash
npm install
npm run dev
```

1. Open **http://localhost:3001** on your computer (host screen).
2. Scan the QR code with your phone (same Wi-Fi network).
3. Enter a username, tap **Ready**, then **Start Race**.
4. Tap **JUMP** on your phone to clear gates and barrels.

> **Important:** Use port **3001** on both devices — not 5173.

## Phone can't connect?

- Confirm both devices are on the **same Wi-Fi** (not cellular).
- Guest/public Wi-Fi often blocks phone ↔ laptop traffic — try a home network or phone hotspot.
- On Mac: **System Settings → Network → Firewall** — allow incoming connections for Node/tsx.
- Type the join URL manually on your phone if the QR code fails (shown on the lobby screen).

## Production

```bash
npm run build
npm start
```

Serves everything on port 3001.

## Game rules

- 3 apples (lives) per player
- Hit a gate or barrel → lose 1 apple
- Last player standing wins (backflip + confetti)
- Solo mode: play until you run out of apples
