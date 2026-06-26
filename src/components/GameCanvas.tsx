import { useEffect, useRef, useState } from 'react';
import type { RoomState } from '../../shared/types';
import { COLORS, GAMEPLAY, LANE_LAYOUT, PLAYER_FIELD_LAYOUT, computeTrackLayout, getJumpHeightAtPhase, getLanesBackToFront } from '../../shared/constants';
import { drawRoadTexture } from '../roadTexture';

interface GameCanvasProps {
  state: RoomState;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, layout: ReturnType<typeof computeTrackLayout>) {
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(0, layout.roadTop, w, layout.roadHeight);
  ctx.fillStyle = COLORS.dirtEdge;
  ctx.fillRect(0, layout.shadowTop, w, layout.shadowHeight);
}

function drawPlayerFieldBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  layout: ReturnType<typeof computeTrackLayout>,
) {
  if (!PLAYER_FIELD_LAYOUT.SHOW_FIELD_BORDER) return;

  ctx.strokeStyle = 'rgba(218, 165, 32, 0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, layout.fieldTop, w, layout.fieldHeight);
}

function drawLaneSegment(
  ctx: CanvasRenderingContext2D,
  w: number,
  layout: ReturnType<typeof computeTrackLayout>,
  lane: number,
) {
  if (!LANE_LAYOUT.SHOW_SEGMENT_BACKGROUND) return;

  const top = layout.laneSegmentTop(lane);
  ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
  ctx.fillRect(0, top, w, layout.laneSegmentHeight);
}

/** Blocky horse + wide-brim hat rider — matches user mockup */
function drawHorseAndRider(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  jumpH: number,
  color: string,
  flipPhase: number,
  eliminated: boolean,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, feetY - jumpH);
  ctx.scale(scale, scale);

  if (flipPhase > 0) {
    ctx.translate(20, -42);
    ctx.rotate(-flipPhase * Math.PI * 2);
    ctx.translate(-20, 42);
  }

  if (eliminated) ctx.globalAlpha = 0.35;

  const s = (v: number) => v;

  // Legs
  ctx.fillStyle = color;
  for (const lx of [s(4), s(14), s(34), s(44)]) {
    ctx.fillRect(lx, s(-28), s(4), s(28));
  }

  // Horse body — horizontal block
  ctx.fillStyle = color;
  ctx.fillRect(s(0), s(-48), s(52), s(22));

  // Neck / head block
  ctx.fillRect(s(44), s(-58), s(22), s(18));

  // Snout bump
  ctx.fillRect(s(62), s(-52), s(10), s(10));

  // Rider body
  ctx.fillRect(s(16), s(-68), s(16), s(22));

  // Rider head (same color)
  ctx.fillRect(s(18), s(-80), s(12), s(12));

  // Wide-brim hat
  ctx.fillRect(s(8), s(-84), s(32), s(5));

  ctx.restore();
}

/** Tall rectangle obstacle */
function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = COLORS.obstacle;
  ctx.fillRect(x - width / 2, feetY - height, width, height);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - width / 2, feetY - height, width, height);
}

function drawHitbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
  ctx.fillRect(x, y, width, height);
}

function drawObstacleHitbox(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  groundY: number,
  width: number,
  height: number,
) {
  drawHitbox(ctx, screenX - width / 2, groundY - height, width, height);
}

function drawHorseHitbox(
  ctx: CanvasRenderingContext2D,
  horseX: number,
  groundY: number,
  jumpH: number,
  scale: number,
) {
  const footY = groundY - jumpH;
  const left = horseX + GAMEPLAY.HORSE_FOOT_LEFT_X * scale;
  const width = (GAMEPLAY.HORSE_FOOT_RIGHT_X - GAMEPLAY.HORSE_FOOT_LEFT_X) * scale;
  const height = GAMEPLAY.HORSE_BODY_HEIGHT * scale;
  drawHitbox(ctx, left, footY - height, width, height);
}

function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean) {
  if (!filled) {
    ctx.globalAlpha = 0.2;
  }
  ctx.fillStyle = COLORS.apple;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  if (filled) {
    ctx.fillStyle = COLORS.appleStem;
    ctx.fillRect(x - 1, y - 11, 2, 5);
  }
  ctx.globalAlpha = 1;
}

const DISPLAY_FONT = 'Rye, serif';

function drawPlayerLabel(
  ctx: CanvasRenderingContext2D,
  name: string,
  color: string,
  lives: number,
  horseX: number,
  laneCenter: number,
  scale: number,
) {
  const fontSize = Math.round(17 * scale);
  ctx.font = `${fontSize}px ${DISPLAY_FONT}`;
  ctx.textBaseline = 'middle';

  const displayName = name.toUpperCase();
  const nameWidth = ctx.measureText(displayName).width;
  const appleSize = 18 * scale;
  const rowGap = 6 * scale;
  const padX = 10 * scale;
  const padY = 6 * scale;
  const radius = 6 * scale;
  const labelY = laneCenter - 14 * scale;
  const plateW = nameWidth + padX * 2;
  const plateH = fontSize + padY * 2;
  const applesRowW = appleSize * 3;
  const blockH = plateH + rowGap + appleSize;
  const anchorRight = horseX - 28 * scale;
  const blockY = labelY - blockH / 2;
  const plateX = anchorRight - plateW;
  const plateY = blockY;
  const nameTextY = plateY + plateH / 2;
  const applesStartX = anchorRight - applesRowW;
  const applesY = plateY + plateH + rowGap + 7 * scale;

  ctx.beginPath();
  ctx.roundRect(plateX, plateY, plateW, plateH, radius);
  ctx.fillStyle = COLORS.namePlate;
  ctx.fill();
  ctx.strokeStyle = COLORS.namePlateBorder;
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(displayName, plateX + padX, nameTextY);

  for (let i = 0; i < 3; i++) {
    drawApple(ctx, applesStartX + appleSize / 2 + i * appleSize, applesY, i < lives);
  }
}

export default function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<Confetti[]>([]);
  const prevPhaseRef = useRef(state.phase);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.load('1em Rye').then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (prevPhaseRef.current !== 'winner' && state.phase === 'winner' && state.winnerId) {
      const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e91e63'];
      confettiRef.current = Array.from({ length: 120 }, () => ({
        x: 200 + (Math.random() - 0.5) * 400,
        y: 200,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      }));
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase, state.winnerId]);

  useEffect(() => {
    if (!fontsReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const playerCount = Math.max(state.players.length, 1);
      const layout = computeTrackLayout(w, h, playerCount);
      const scale = Math.min(layout.laneSegmentHeight / 130, 1.4);

      drawBackground(ctx, w, h, layout);
      drawPlayerFieldBorder(ctx, w, layout);

      const scrollX = state.scrollX ?? 0;
      const lanesBackToFront = getLanesBackToFront(layout);
      const showHitboxes = GAMEPLAY.SHOW_COLLISION_BOXES && state.phase === 'playing';

      for (const lane of lanesBackToFront) {
        drawRoadTexture(
          ctx,
          scrollX,
          w,
          layout.laneSegmentTop(lane),
          layout.laneSegmentHeight,
          lane,
        );
      }

      for (const lane of lanesBackToFront) {
        drawLaneSegment(ctx, w, layout, lane);

        const feetY = layout.laneGroundY(lane);

        for (const obs of state.obstacles) {
          if (typeof obs.lane === 'number' && obs.lane !== lane) continue;

          const screenX = obs.worldX - scrollX;
          if (screenX < -100) continue;

          drawObstacle(ctx, screenX, feetY, obs.width, obs.height);
          if (showHitboxes) {
            drawObstacleHitbox(ctx, screenX, feetY, obs.width, obs.height);
          }
        }

        const player = state.players.find((p) => p.lane === lane);
        if (!player) continue;

        const laneCenter = layout.laneCenterY(lane);
        const jumpH = getJumpHeightAtPhase(player.jumpPhase, player.isJumping);

        drawPlayerLabel(ctx, player.name, player.color, player.lives, layout.horseX, laneCenter, scale);

        drawHorseAndRider(
          ctx,
          layout.horseX,
          feetY,
          jumpH,
          player.color,
          player.flipPhase,
          player.eliminated,
          scale,
        );

        if (showHitboxes && !player.eliminated) {
          drawHorseHitbox(ctx, layout.horseX, feetY, jumpH, scale);
        }

        if (player.eliminated) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.font = `${Math.round(32 * scale)}px ${DISPLAY_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('OUT', layout.horseX + 30 * scale, laneCenter);
        }
      }

      if (state.phase === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = `120px ${DISPLAY_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = state.countdown > 0 ? String(state.countdown) : 'GO!';
        ctx.fillText(text, w / 2, h / 2);
      }

      if (state.phase === 'winner' && confettiRef.current.length > 0) {
        for (const c of confettiRef.current) {
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.25;
          c.rotation += c.rotSpeed;
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rotation);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
          ctx.restore();
        }
        confettiRef.current = confettiRef.current.filter((c) => c.y < h + 20);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, fontsReady]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = devicePixelRatio;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
