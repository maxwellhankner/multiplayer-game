import { useEffect, useRef } from 'react';

type Dir = 'up' | 'down' | 'left' | 'right';

interface UseControllerMenuOptions {
  enabled: boolean;
  /** Highlight and move between the buttons currently on screen. */
  navigate: boolean;
  gamepadIndices: readonly number[];
  onStart: () => void;
}

const FOCUS_SELECTOR = 'button:not([disabled]), label.settings-checkbox';
const CONFIRM_BUTTONS = [0, 2];
const START_BUTTON = 9;
const STICK_THRESHOLD = 0.5;
const HOLD_DELAY_MS = 320;
const REPEAT_MS = 140;

function pressed(pad: Gamepad, index: number): boolean {
  const button = pad.buttons[index];
  return Boolean(button && (button.pressed || button.value > 0.45));
}

function directionFromAxes(x: number, y: number): Dir | null {
  if (Math.abs(x) < STICK_THRESHOLD && Math.abs(y) < STICK_THRESHOLD) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

function directionOf(pad: Gamepad): Dir | null {
  if (pressed(pad, 12)) return 'up';
  if (pressed(pad, 13)) return 'down';
  if (pressed(pad, 14)) return 'left';
  if (pressed(pad, 15)) return 'right';
  return (
    directionFromAxes(pad.axes[0] ?? 0, pad.axes[1] ?? 0) ??
    directionFromAxes(pad.axes[2] ?? 0, pad.axes[3] ?? 0)
  );
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function activeScope(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[data-controller-modal]') ??
    document.querySelector<HTMLElement>('[data-controller-scope="page"]')
  );
}

function listFocusables(scope: HTMLElement): HTMLElement[] {
  const modal = scope.hasAttribute('data-controller-modal');
  return [...scope.querySelectorAll<HTMLElement>(FOCUS_SELECTOR)].filter((el) => {
    if (!modal && el.closest('[data-controller-modal]')) return false;
    return isVisible(el);
  });
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 4;
}

function stepFocus(current: HTMLElement, dir: Dir, items: HTMLElement[]): HTMLElement | null {
  const origin = current.getBoundingClientRect();
  const horizontal = dir === 'left' || dir === 'right';
  let aligned: HTMLElement | null = null;
  let alignedDist = Infinity;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const item of items) {
    if (item === current) continue;
    const rect = item.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - (origin.left + origin.width / 2);
    const dy = rect.top + rect.height / 2 - (origin.top + origin.height / 2);
    const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    if (primary < 8) continue;

    const sameBand = horizontal
      ? rangesOverlap(origin.top, origin.bottom, rect.top, rect.bottom)
      : rangesOverlap(origin.left, origin.right, rect.left, rect.right);
    if (sameBand && primary < alignedDist) {
      alignedDist = primary;
      aligned = item;
    }

    const secondary = horizontal ? Math.abs(dy) : Math.abs(dx);
    if (secondary > primary * 2.2) continue;
    const score = primary + secondary * 1.75;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return aligned ?? best;
}

function preferredFocus(items: HTMLElement[]): HTMLElement | null {
  return items.find((el) => el.hasAttribute('data-controller-initial')) ?? items[0] ?? null;
}

function applyFocus(next: HTMLElement | null, previous: HTMLElement | null): HTMLElement | null {
  if (previous && previous !== next) previous.classList.remove('controller-focus');
  if (!next) return null;
  next.classList.add('controller-focus');
  if (next.tagName !== 'BUTTON' && !next.hasAttribute('tabindex')) next.tabIndex = -1;
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return next;
}

function keyDirection(code: string): Dir | null {
  if (code === 'ArrowUp') return 'up';
  if (code === 'ArrowDown') return 'down';
  if (code === 'ArrowLeft') return 'left';
  if (code === 'ArrowRight') return 'right';
  return null;
}

export function useControllerMenu({
  enabled,
  navigate,
  gamepadIndices,
  onStart,
}: UseControllerMenuOptions) {
  const navigateRef = useRef(navigate);
  const indicesRef = useRef(gamepadIndices);
  const onStartRef = useRef(onStart);
  navigateRef.current = navigate;
  indicesRef.current = gamepadIndices;
  onStartRef.current = onStart;

  useEffect(() => {
    if (!enabled) return;

    let focused: HTMLElement | null = null;
    let userMoved = false;
    let wasNavigating = false;
    let heldDir: Dir | null = null;
    let heldSince = 0;
    let lastStep = 0;
    const seen = new Map<number, { confirm: boolean; start: boolean }>();

    const clearFocus = () => {
      focused = applyFocus(null, focused);
      heldDir = null;
      userMoved = false;
    };

    const ensureFocus = (items: HTMLElement[]) => {
      if (focused && items.includes(focused)) {
        if (!userMoved) {
          const preferred = preferredFocus(items);
          if (preferred && preferred !== focused) focused = applyFocus(preferred, focused);
        }
        return;
      }
      focused = applyFocus(preferredFocus(items), focused);
    };

    const move = (dir: Dir) => {
      const scope = activeScope();
      if (!scope) return;
      const items = listFocusables(scope);
      if (items.length === 0) return;
      ensureFocus(items);
      if (!focused) return;
      const next = stepFocus(focused, dir, items);
      if (!next) return;
      userMoved = true;
      focused = applyFocus(next, focused);
    };

    const activate = () => {
      if (!focused || !focused.isConnected) return;
      focused.click();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select')) return;
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        onStartRef.current();
        return;
      }
      if (!navigateRef.current) return;
      const dir = keyDirection(event.code);
      if (dir) {
        event.preventDefault();
        move(dir);
        return;
      }
      if (!event.repeat && (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyX')) {
        event.preventDefault();
        activate();
      }
    };

    const tick = () => {
      const pads = navigator.getGamepads?.() ?? [];
      let dir: Dir | null = null;
      let startEdge = false;
      let confirmEdge = false;
      const indices = indicesRef.current;

      for (const index of seen.keys()) {
        if (!indices.includes(index)) seen.delete(index);
      }

      for (const index of indices) {
        const pad = pads[index];
        if (!pad) continue;
        const confirm = CONFIRM_BUTTONS.some((button) => pressed(pad, button));
        const start = pressed(pad, START_BUTTON);
        const prev = seen.get(pad.index);
        seen.set(pad.index, { confirm, start });
        if (!prev) continue;
        if (start && !prev.start) startEdge = true;
        if (confirm && !prev.confirm) confirmEdge = true;
        if (!dir) dir = directionOf(pad);
      }

      if (startEdge) onStartRef.current();

      if (!navigateRef.current) {
        if (wasNavigating) clearFocus();
        wasNavigating = false;
        heldDir = null;
        return;
      }

      const scope = activeScope();
      const items = scope ? listFocusables(scope) : [];
      if (!wasNavigating) userMoved = false;
      wasNavigating = true;

      if (items.length === 0) {
        clearFocus();
        return;
      }
      ensureFocus(items);

      if (confirmEdge) activate();

      if (!dir) {
        heldDir = null;
        return;
      }

      const now = performance.now();
      if (dir !== heldDir) {
        heldDir = dir;
        heldSince = now;
        lastStep = now;
        move(dir);
        return;
      }

      const wait = now - heldSince < HOLD_DELAY_MS ? HOLD_DELAY_MS : REPEAT_MS;
      if (now - lastStep >= wait) {
        lastStep = now;
        move(dir);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const timer = window.setInterval(tick, 16);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearInterval(timer);
      focused?.classList.remove('controller-focus');
    };
  }, [enabled]);
}
