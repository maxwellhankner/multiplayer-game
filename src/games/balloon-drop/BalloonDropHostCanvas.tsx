import { useEffect, useRef } from 'react';
import {
  BALLOON_DROP_ARENA_WIDTH,
  BALLOON_DROP_BALLOON_RADIUS,
  BALLOON_DROP_FLOOR_Y,
  BALLOON_DROP_PLAYER_RADIUS,
  BALLOON_DROP_PLAYER_Y,
} from '../../../shared/games/balloon-drop/constants';
import {
  getBalloonArenaCount,
  getBalloonArenaId,
  getBalloonArenaLabel,
  isBalloonTeamMode,
} from '../../../shared/games/balloon-drop/teams';
import type { PlayerState, RoomState } from '../../../shared/types';
import { getColumnSplitPanes } from './columnLayout';

interface BalloonDropHostCanvasProps {
  state: RoomState;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  sx: (x: number) => number,
  sy: (y: number) => number,
  scaleX: number,
) {
  const px = sx(player.px);
  const py = sy(BALLOON_DROP_PLAYER_Y);
  const r = BALLOON_DROP_PLAYER_RADIUS * scaleX;

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.max(8, scaleX * 5)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(player.name, px, py - r - 4);
}

function drawArena(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  players: PlayerState[],
  balloon: { x: number; y: number } | undefined,
  arenaLabel: string,
  solo: boolean,
  gameTime: number,
  allEliminated: boolean,
) {
  const scaleX = w / BALLOON_DROP_ARENA_WIDTH;
  const scaleY = h / 100;
  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => h - y * scaleY;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(1, '#e8f4fc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#6b4f2a';
  ctx.fillRect(0, sy(BALLOON_DROP_FLOOR_Y), w, h - sy(BALLOON_DROP_FLOOR_Y));
  ctx.fillStyle = '#4a8f3d';
  ctx.fillRect(0, sy(BALLOON_DROP_FLOOR_Y), w, 4);

  if (players.length > 1) {
    const sliceWidth = (BALLOON_DROP_ARENA_WIDTH / players.length) * scaleX;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 1; i < players.length; i++) {
      const lineX = sliceWidth * i;
      ctx.beginPath();
      ctx.moveTo(lineX, sy(BALLOON_DROP_FLOOR_Y));
      ctx.lineTo(lineX, 0);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  if (arenaLabel) {
    const labelSize = Math.max(12, w * 0.055);
    ctx.font = `700 ${labelSize}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(arenaLabel, w / 2 + 1, 11);
    ctx.fillStyle = '#fff';
    ctx.fillText(arenaLabel, w / 2, 10);
  }

  if (solo) {
    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.max(10, w * 0.05)}px system-ui,sans-serif`;
    ctx.fillText(`${Math.floor(gameTime / 1000)}s`, w - 8, 18);
  }

  if (allEliminated) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(14, w * 0.08)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('POP!', w / 2, h / 2);
    return;
  }

  for (const player of players) {
    if (!player.eliminated) drawPlayer(ctx, player, sx, sy, scaleX);
  }

  if (balloon) {
    const bx = sx(balloon.x);
    const by = sy(balloon.y);
    const br = BALLOON_DROP_BALLOON_RADIUS * scaleX;

    const grad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.2, bx, by, br);
    grad.addColorStop(0, '#ff8fab');
    grad.addColorStop(1, '#e63946');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(bx, by, br, br * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export default function BalloonDropHostCanvas({ state }: BalloonDropHostCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.floor(container.clientWidth * dpr);
      canvas.height = Math.floor(container.clientHeight * dpr);
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const render = () => {
      const room = stateRef.current;
      const players = room.players;
      const playerCount = players.length;
      const arenaCount = getBalloonArenaCount(playerCount);
      const panes = getColumnSplitPanes(arenaCount);
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const teamMode = isBalloonTeamMode(playerCount);

      ctx.clearRect(0, 0, cw, ch);

      const arenaIds = teamMode
        ? ['0', '1']
        : playerCount === 1
          ? ['0']
          : players.map((p) => p.id);

      for (let i = 0; i < arenaIds.length; i++) {
        const arenaId = arenaIds[i];
        const pane = panes[i];
        if (!pane || !arenaId) continue;

        const arenaPlayers = players.filter(
          (p) => getBalloonArenaId(p.lane, p.id, playerCount) === arenaId,
        );
        const balloon = room.balloons.find((b) => b.arenaId === arenaId);
        const allEliminated = arenaPlayers.length > 0 && arenaPlayers.every((p) => p.eliminated);
        const label = getBalloonArenaLabel(arenaId, playerCount);

        const x = pane.left * cw;
        const y = pane.top * ch;
        const w = pane.width * cw;
        const h = pane.height * ch;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.translate(x, y);
        drawArena(
          ctx,
          w,
          h,
          arenaPlayers,
          balloon,
          label,
          playerCount === 1,
          room.gameTime,
          allEliminated,
        );
        ctx.restore();

        if (i > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, ch);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="balloon-drop-host" ref={containerRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
