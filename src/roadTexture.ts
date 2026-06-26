import { COLORS } from '../shared/constants';

const CELL_SIZE = 72;
const MARGIN = 100;

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function drawGrassPatch(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  seed: number,
) {
  const blades = 2 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < blades; i++) {
    const ox = (hash(seed, i + 2) - 0.5) * 16;
    const oy = (hash(seed, i + 3) - 0.5) * 10;
    const h = 4 + hash(seed, i + 5) * 6;
    const w = 2 + hash(seed, i + 8) * 2;
    ctx.fillStyle = hash(seed, i + 9) > 0.5 ? COLORS.grass : COLORS.grassDark;
    ctx.fillRect(screenX + ox, screenY + oy - h / 2, w, h);
  }
}

function drawFootsteps(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  seed: number,
) {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate((hash(seed, 3) - 0.5) * 0.5);
  ctx.fillStyle = COLORS.footprint;
  ctx.globalAlpha = 0.55;
  for (const dx of [-7, 5]) {
    ctx.beginPath();
    ctx.ellipse(dx, 0, 3, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTumbleweed(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  seed: number,
) {
  const radius = 7 + hash(seed, 4) * 5;
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.strokeStyle = COLORS.tumbleweed;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.85;
  const spokes = 9 + Math.floor(hash(seed, 6) * 3);
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2 + hash(seed, i + 10) * 0.6;
    const len = radius * (0.55 + hash(seed, i + 20) * 0.45);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Scrolling road decorations — world-locked, moves with scrollX like obstacles */
export function drawRoadTexture(
  ctx: CanvasRenderingContext2D,
  scrollX: number,
  screenWidth: number,
  segmentTop: number,
  segmentHeight: number,
  lane: number,
) {
  const startCell = Math.floor((scrollX - MARGIN) / CELL_SIZE);
  const endCell = Math.ceil((scrollX + screenWidth + MARGIN) / CELL_SIZE);

  for (let cell = startCell; cell <= endCell; cell++) {
    const seed = cell * 17 + lane * 991;
    const worldX = cell * CELL_SIZE + hash(seed, 7) * (CELL_SIZE * 0.55);
    const screenX = worldX - scrollX;
    const screenY = segmentTop + hash(seed, 11) * segmentHeight;
    const roll = hash(seed, 0);

    if (roll < 0.005) {
      drawTumbleweed(ctx, screenX, screenY, seed);
    } else if (roll < 0.05) {
      drawFootsteps(ctx, screenX, screenY, seed);
    } else if (roll < 0.26) {
      drawGrassPatch(ctx, screenX, screenY, seed);
    }
  }
}
