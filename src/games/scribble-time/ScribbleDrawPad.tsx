import { useCallback, useEffect, useRef, useState } from 'react';
import { SCRIBBLE_CANVAS_SIZE } from '../../../shared/games/scribble-time/constants';
import type { ScribbleStroke } from '../../../shared/types';

interface ScribbleDrawPadProps {
  secondsLeft: number;
  prompt: string;
  submitted: boolean;
  onSubmit: (strokes: ScribbleStroke[]) => void;
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: ScribbleStroke[],
  width: number,
  height: number,
) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(3, w / 80);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo((pts[0].x / SCRIBBLE_CANVAS_SIZE) * w, (pts[0].y / SCRIBBLE_CANVAS_SIZE) * h);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo((pts[i].x / SCRIBBLE_CANVAS_SIZE) * w, (pts[i].y / SCRIBBLE_CANVAS_SIZE) * h);
    }
    ctx.stroke();
  }
}

export default function ScribbleDrawPad({
  secondsLeft,
  prompt,
  submitted,
  onSubmit,
}: ScribbleDrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<ScribbleStroke[]>([]);
  const drawingRef = useRef(false);
  const submittedOnceRef = useRef(false);
  const [frozenStrokes, setFrozenStrokes] = useState<ScribbleStroke[] | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const strokesToDraw = frozenStrokes ?? strokesRef.current;
    renderStrokes(ctx, strokesToDraw, w, h);
  }, [frozenStrokes]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const toNorm = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(
        0,
        Math.min(SCRIBBLE_CANVAS_SIZE, ((clientX - rect.left) / rect.width) * SCRIBBLE_CANVAS_SIZE),
      ),
      y: Math.max(
        0,
        Math.min(SCRIBBLE_CANVAS_SIZE, ((clientY - rect.top) / rect.height) * SCRIBBLE_CANVAS_SIZE),
      ),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (submitted) return;
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    e.preventDefault();
    drawingRef.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    strokesRef.current = [...strokesRef.current, { points: [p, p] }];
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || submitted) return;
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    e.preventDefault();
    const strokes = strokesRef.current;
    const current = strokes[strokes.length - 1];
    if (!current) return;
    strokesRef.current = [
      ...strokes.slice(0, -1),
      { points: [...current.points, p] },
    ];
    redraw();
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    if (submitted) return;
    strokesRef.current = [];
    redraw();
  };

  const sendDrawing = useCallback(() => {
    if (submittedOnceRef.current) return;
    submittedOnceRef.current = true;
    const snapshot = structuredClone(strokesRef.current);
    setFrozenStrokes(snapshot);
    onSubmit(snapshot);
  }, [onSubmit]);

  useEffect(() => {
    if (submittedOnceRef.current || submitted) return;
    if (secondsLeft > 1) return;
    sendDrawing();
  }, [secondsLeft, submitted, sendDrawing]);

  useEffect(() => {
    if (submitted && !submittedOnceRef.current) {
      sendDrawing();
    }
  }, [submitted, sendDrawing]);

  return (
    <div className="scribble-draw-pad">
      <div className="scribble-draw-header">
        <p className="scribble-draw-prompt">{prompt}</p>
        <span className="scribble-draw-timer">{secondsLeft}s</span>
      </div>
      <div className="scribble-draw-canvas-wrap" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="scribble-draw-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
      {submitted ? (
        <p className="scribble-draw-status">Drawing submitted — watch the main screen</p>
      ) : (
        <button type="button" className="scribble-clear-btn" onClick={clear}>
          Clear
        </button>
      )}
    </div>
  );
}

interface ScribblePreviewProps {
  strokes: ScribbleStroke[];
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  variant?: 'host' | 'mobile';
}

export function ScribblePreview({
  strokes,
  label,
  onClick,
  selected,
  variant = 'host',
}: ScribblePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderStrokes(ctx, strokes, w, h);
  }, [strokes]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`scribble-preview scribble-preview--${variant}${selected ? ' scribble-preview--selected' : ''}${onClick ? ' scribble-preview--btn' : ''}`}
      onClick={onClick}
    >
      <div className="scribble-preview-canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} className="scribble-preview-canvas" />
      </div>
      {label && <span className="scribble-preview-label game-player-name">{label}</span>}
    </Tag>
  );
}
