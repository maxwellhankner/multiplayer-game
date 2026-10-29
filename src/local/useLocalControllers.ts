import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  SHOTS_FIRED_LOOK_SPEED,
  SHOTS_FIRED_PITCH_SPEED,
} from '../../shared/games/shots-fired/constants';
import {
  SHOOTERS_SHOOT_LOOK_SPEED,
  SHOOTERS_SHOOT_PITCH_SPEED,
} from '../../shared/games/shooters-shoot/constants';
import type { CoinStickInput } from '../../shared/types';

export interface LocalSlotState {
  slotId: string;
  kind: 'gamepad' | 'keyboard';
  label: string;
  name: string;
  playerId: string | null;
}

export interface LocalPadInfo {
  index: number;
  label: string;
}

interface UseLocalControllersOptions {
  roomId: string;
  enabled: boolean;
  /** Menu is open, or the match is not accepting play input. */
  inputSuspended: boolean;
  /** Lobby or the player-settings overlay is on screen. */
  joinEnabled: boolean;
  activeGameId: string | null;
  phase: string;
  takenNames: readonly string[];
}

interface SlotEdge {
  jump: boolean;
  shoot: boolean;
  melee: boolean;
  reload: boolean;
  jumpAt: number;
  shootAt: number;
  meleeAt: number;
}

interface SlotInternal {
  slotId: string;
  kind: 'gamepad' | 'keyboard';
  gamepadIndex: number | null;
  label: string;
  name: string;
  playerId: string | null;
  socket: Socket;
  edge: SlotEdge;
  wasSending: boolean;
}

const DEADZONE = 0.16;
const STICK_TICK_SEC = 1 / 30;
const MOUSE_RAD_PER_PX = 0.0026;
const ZERO_STICK: CoinStickInput = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, lookDX: 0, lookDY: 0 };

function isFpsGame(gameId: string | null): boolean {
  return gameId === 'shots-fired' || gameId === 'shooters-shoot';
}

function fpsEvent(gameId: string, action: 'input' | 'shoot' | 'melee' | 'jump' | 'reload'): string {
  const prefix = gameId === 'shooters-shoot' ? 'player:shooters-shoot' : 'player:shots-fired';
  return `${prefix}-${action}`;
}

function lookSpeeds(gameId: string): { look: number; pitch: number } {
  if (gameId === 'shooters-shoot') {
    return { look: SHOOTERS_SHOOT_LOOK_SPEED, pitch: SHOOTERS_SHOOT_PITCH_SPEED };
  }
  return { look: SHOTS_FIRED_LOOK_SPEED, pitch: SHOTS_FIRED_PITCH_SPEED };
}

function axis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.abs(value);
  if (magnitude < DEADZONE) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - DEADZONE) / (1 - DEADZONE));
}

function buttonDown(pad: Gamepad, index: number): boolean {
  const button = pad.buttons[index];
  if (!button) return false;
  return button.pressed || button.value > 0.45;
}

function gamepadLabel(pad: Gamepad): string {
  const id = pad.id || '';
  const lower = id.toLowerCase();
  const slot = pad.index + 1;
  if (
    lower.includes('054c') ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    lower.includes('sony')
  ) {
    return `PlayStation ${slot}`;
  }
  if (lower.includes('xbox') || lower.includes('045e') || lower.includes('xinput') || lower.includes('x-box')) {
    return `Xbox ${slot}`;
  }
  const raw = id.split('(')[0]?.trim();
  if (raw) return `${raw.slice(0, 28)} ${slot}`;
  return `Controller ${slot}`;
}

function nextPlayerName(used: Set<string>): string {
  for (let i = 1; i <= 8; i++) {
    const name = `Player ${i}`;
    if (!used.has(name.toLowerCase())) return name;
  }
  return `Player ${used.size + 1}`;
}

function toPublic(slot: SlotInternal): LocalSlotState {
  return {
    slotId: slot.slotId,
    kind: slot.kind,
    label: slot.label,
    name: slot.name,
    playerId: slot.playerId,
  };
}

function freshEdge(): SlotEdge {
  return { jump: false, shoot: false, melee: false, reload: false, jumpAt: 0, shootAt: 0, meleeAt: 0 };
}

export function useLocalControllers({
  roomId,
  enabled,
  inputSuspended,
  joinEnabled,
  activeGameId,
  phase,
  takenNames,
}: UseLocalControllersOptions) {
  const slotsRef = useRef<SlotInternal[]>([]);
  const [slots, setSlots] = useState<LocalSlotState[]>([]);
  const [pads, setPads] = useState<LocalPadInfo[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pointerLocked, setPointerLocked] = useState(false);

  const enabledRef = useRef(enabled);
  const suspendedRef = useRef(inputSuspended);
  const joinRef = useRef(joinEnabled);
  const gameRef = useRef(activeGameId);
  const phaseRef = useRef(phase);
  const roomRef = useRef(roomId);
  const namesRef = useRef(takenNames);
  const padsSigRef = useRef('');
  const seenButtonsRef = useRef<Map<number, boolean[]>>(new Map());
  const keysRef = useRef(new Set<string>());
  const mouseRef = useRef({ dx: 0, dy: 0, left: false, right: false });
  const latchRef = useRef({ jump: false, shoot: false, melee: false, reload: false });

  enabledRef.current = enabled;
  suspendedRef.current = inputSuspended;
  joinRef.current = joinEnabled;
  gameRef.current = activeGameId;
  phaseRef.current = phase;
  roomRef.current = roomId;
  namesRef.current = takenNames;

  const publish = useCallback(() => {
    setSlots(slotsRef.current.map(toPublic));
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    const slot = slotsRef.current.find((entry) => entry.slotId === slotId);
    if (!slot) return;
    slot.socket.disconnect();
    slotsRef.current = slotsRef.current.filter((entry) => entry.slotId !== slotId);
    publish();
  }, [publish]);

  const addSlot = useCallback((kind: 'gamepad' | 'keyboard', gamepadIndex: number | null, label: string) => {
    if (!enabledRef.current) return;
    const slotId = kind === 'keyboard' ? 'keyboard' : `pad:${gamepadIndex}`;
    if (slotsRef.current.some((entry) => entry.slotId === slotId)) return;
    if (slotsRef.current.length >= 8) {
      setNotice('This screen already has 8 players.');
      return;
    }

    const used = new Set<string>([
      ...slotsRef.current.map((entry) => entry.name.toLowerCase()),
      ...namesRef.current.map((name) => name.toLowerCase()),
    ]);
    const name = nextPlayerName(used);
    const socket = io(undefined, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      forceNew: true,
    });
    const slot: SlotInternal = {
      slotId,
      kind,
      gamepadIndex,
      label,
      name,
      playerId: null,
      socket,
      edge: freshEdge(),
      wasSending: false,
    };
    slotsRef.current = [...slotsRef.current, slot];
    setNotice(null);
    publish();

    const drop = (message: string) => {
      if (!slotsRef.current.includes(slot)) return;
      setNotice(message);
      slotsRef.current = slotsRef.current.filter((entry) => entry !== slot);
      socket.disconnect();
      publish();
    };

    socket.on('connect', () => {
      socket.emit(
        'player:join',
        { roomId: roomRef.current, name },
        (result: { ok: boolean; playerId?: string; error?: string }) => {
          if (!slotsRef.current.includes(slot)) {
            socket.disconnect();
            return;
          }
          if (!result.ok || !result.playerId) {
            drop(result.error ?? 'Could not add that player');
            return;
          }
          slot.playerId = result.playerId;
          setNotice(null);
          publish();
        },
      );
    });

    socket.on('player:kicked', () => {
      drop(`${name} was removed`);
    });

    socket.on('connect_error', () => {
      drop('Could not connect that controller');
    });
  }, [publish]);

  const addKeyboard = useCallback(() => {
    addSlot('keyboard', null, 'Keyboard & mouse');
  }, [addSlot]);

  const startMatch = useCallback(() => {
    for (const slot of slotsRef.current) {
      if (slot.playerId) slot.socket.emit('player:ready');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onLockChange = () => {
      setPointerLocked(document.pointerLockElement != null);
    };
    document.addEventListener('pointerlockchange', onLockChange);

    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.code);
      if (event.code === 'Space') latchRef.current.jump = true;
      if (event.code === 'ArrowUp' && gameRef.current === 'hoe-down-derby') latchRef.current.jump = true;
      if (event.code === 'KeyF' || event.code === 'KeyQ') latchRef.current.melee = true;
      if (event.code === 'KeyX' && gameRef.current === 'shooters-shoot') latchRef.current.reload = true;
      const playing = phaseRef.current === 'countdown' || phaseRef.current === 'playing';
      const keyboardPlaying = playing && !suspendedRef.current && slotsRef.current.some((slot) => slot.kind === 'keyboard');
      if (!keyboardPlaying) return;
      if (
        event.code === 'Space' ||
        event.code.startsWith('Arrow') ||
        event.code === 'KeyF' ||
        event.code === 'KeyX' ||
        event.code === 'KeyC'
      ) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };
    const onBlur = () => {
      keysRef.current.clear();
      mouseRef.current.left = false;
      mouseRef.current.right = false;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement == null) return;
      mouseRef.current.dx += event.movementX;
      mouseRef.current.dy += event.movementY;
    };
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      const onUi = target instanceof Element && Boolean(target.closest('button, a, input, .screen-controls, .local-players-overlay'));
      if (!onUi) {
        if (event.button === 0) {
          mouseRef.current.left = true;
          if (gameRef.current === 'hoe-down-derby') latchRef.current.jump = true;
          else latchRef.current.shoot = true;
        }
        if (event.button === 2) {
          mouseRef.current.right = true;
          latchRef.current.melee = true;
        }
      }
      const wantsMouse =
        isFpsGame(gameRef.current) &&
        !suspendedRef.current &&
        (phaseRef.current === 'countdown' || phaseRef.current === 'playing') &&
        slotsRef.current.some((slot) => slot.kind === 'keyboard' && slot.playerId);
      if (!wantsMouse || event.button !== 0 || document.pointerLockElement || onUi) return;
      document.body.requestPointerLock();
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) mouseRef.current.left = false;
      if (event.button === 2) mouseRef.current.right = false;
    };
    const onContextMenu = (event: MouseEvent) => {
      const wantsMouse =
        isFpsGame(gameRef.current) &&
        !suspendedRef.current &&
        (phaseRef.current === 'countdown' || phaseRef.current === 'playing') &&
        slotsRef.current.some((slot) => slot.kind === 'keyboard');
      if (wantsMouse) event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!enabledRef.current) return;

      const gamepads = navigator.getGamepads?.() ?? [];
      const nextPads: LocalPadInfo[] = [];
      for (const pad of gamepads) {
        if (!pad) continue;
        nextPads.push({ index: pad.index, label: gamepadLabel(pad) });
        const slotId = `pad:${pad.index}`;
        const assigned = slotsRef.current.some((slot) => slot.slotId === slotId);
        const downs = pad.buttons.map((button) => button.pressed || button.value > 0.45);
        const prev = seenButtonsRef.current.get(pad.index);
        seenButtonsRef.current.set(pad.index, downs);
        const pressed = !prev ? downs.some(Boolean) : downs.some((down, index) => down && !prev[index]);
        if (pressed && !assigned && joinRef.current) {
          addSlot('gamepad', pad.index, gamepadLabel(pad));
        }
      }
      const sig = nextPads.map((pad) => `${pad.index}:${pad.label}`).join('|');
      if (sig !== padsSigRef.current) {
        padsSigRef.current = sig;
        setPads(nextPads);
      }

      const playing = phaseRef.current === 'countdown' || phaseRef.current === 'playing';
      const suspended = suspendedRef.current || !playing;
      const gameId = gameRef.current;
      const now = performance.now();

      if (suspended) {
        mouseRef.current.dx = 0;
        mouseRef.current.dy = 0;
        latchRef.current = { jump: false, shoot: false, melee: false, reload: false };
      }
      const latch = latchRef.current;

      for (const slot of slotsRef.current) {
        if (!slot.playerId) continue;
        if (gameId && isFpsGame(gameId)) {
          if (suspended) {
            if (slot.wasSending) {
              slot.socket.emit(fpsEvent(gameId, 'input'), ZERO_STICK);
              slot.wasSending = false;
            }
            continue;
          }
          const frame = readSlotFrame(slot, gamepads, gameId, keysRef.current, mouseRef.current, latch);
          slot.socket.emit(fpsEvent(gameId, 'input'), {
            moveX: frame.moveX,
            moveY: frame.moveY,
            lookX: frame.lookX,
            lookY: frame.lookY,
            lookDX: frame.lookDX,
            lookDY: frame.lookDY,
            sprint: frame.sprint,
            crouch: frame.crouch,
          });
          emitHeld(slot, now, frame, {
            shoot: () => slot.socket.emit(fpsEvent(gameId, 'shoot')),
            melee: () => slot.socket.emit(fpsEvent(gameId, 'melee')),
            jump: () => slot.socket.emit(fpsEvent(gameId, 'jump')),
            reload: gameId === 'shooters-shoot'
              ? () => slot.socket.emit(fpsEvent(gameId, 'reload'))
              : undefined,
          });
          slot.wasSending = true;
        } else if (gameId === 'hoe-down-derby') {
          if (suspended) {
            slot.edge.jump = false;
            continue;
          }
          const frame = readSlotFrame(slot, gamepads, 'hoe-down-derby', keysRef.current, mouseRef.current, latch);
          emitHeld(slot, now, frame, {
            shoot: () => {},
            melee: () => {},
            jump: () => slot.socket.emit('player:jump'),
          });
        }
      }
      latchRef.current = { jump: false, shoot: false, melee: false, reload: false };
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      if (document.pointerLockElement) document.exitPointerLock();
      for (const slot of slotsRef.current) slot.socket.disconnect();
      slotsRef.current = [];
      seenButtonsRef.current.clear();
      keysRef.current.clear();
      setSlots([]);
      setPads([]);
    };
  }, [enabled, roomId, addSlot]);

  useEffect(() => {
    if (inputSuspended && document.pointerLockElement) document.exitPointerLock();
  }, [inputSuspended]);

  const unassignedPads = useMemo(
    () => pads.filter((pad) => !slots.some((slot) => slot.slotId === `pad:${pad.index}`)),
    [pads, slots],
  );

  return {
    slots,
    unassignedPads,
    notice,
    pointerLocked,
    hasKeyboard: slots.some((slot) => slot.kind === 'keyboard' && slot.playerId),
    addKeyboard,
    removeSlot,
    startMatch,
  };
}

interface SlotFrame {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  lookDX: number;
  lookDY: number;
  jump: boolean;
  shoot: boolean;
  melee: boolean;
  sprint: boolean;
  crouch: boolean;
  reload: boolean;
}

const STILL_FRAME: SlotFrame = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  lookDX: 0,
  lookDY: 0,
  jump: false,
  shoot: false,
  melee: false,
  sprint: false,
  crouch: false,
  reload: false,
};

function readSlotFrame(
  slot: SlotInternal,
  gamepads: ArrayLike<Gamepad | null>,
  gameId: string,
  keys: Set<string>,
  mouse: { dx: number; dy: number; left: boolean; right: boolean },
  latch: { jump: boolean; shoot: boolean; melee: boolean; reload: boolean },
): SlotFrame {
  const shooters = gameId === 'shooters-shoot';
  if (slot.kind === 'gamepad' && slot.gamepadIndex != null) {
    const pad = gamepads[slot.gamepadIndex] ?? null;
    if (!pad) return { ...STILL_FRAME };
    let moveX = axis(pad.axes[0] ?? 0);
    let moveY = -axis(pad.axes[1] ?? 0);
    const lookX = axis(pad.axes[2] ?? 0);
    const lookY = -axis(pad.axes[3] ?? 0);
    if (Math.hypot(moveX, moveY) < 0.01) {
      if (buttonDown(pad, 14)) moveX -= 1;
      if (buttonDown(pad, 15)) moveX += 1;
      if (buttonDown(pad, 12)) moveY += 1;
      if (buttonDown(pad, 13)) moveY -= 1;
    }
    const jump = gameId === 'hoe-down-derby'
      ? [0, 1, 2, 3, 5, 7, 12].some((index) => buttonDown(pad, index))
      : buttonDown(pad, 0);
    const shoot = buttonDown(pad, 7) || buttonDown(pad, 5);
    const melee = shooters ? buttonDown(pad, 3) : buttonDown(pad, 2);
    return {
      moveX,
      moveY,
      lookX,
      lookY,
      lookDX: 0,
      lookDY: 0,
      jump,
      shoot,
      melee,
      sprint: shooters && buttonDown(pad, 10),
      crouch: shooters && buttonDown(pad, 1),
      reload: shooters && buttonDown(pad, 2),
    };
  }

  const moveX = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const moveY = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const speeds = lookSpeeds(gameId);
  const lookDX = (mouse.dx * MOUSE_RAD_PER_PX) / (speeds.look * STICK_TICK_SEC);
  const lookDY = (-mouse.dy * MOUSE_RAD_PER_PX) / (speeds.pitch * STICK_TICK_SEC);
  mouse.dx = 0;
  mouse.dy = 0;
  const jump = gameId === 'hoe-down-derby'
    ? keys.has('Space') || keys.has('ArrowUp') || mouse.left || latch.jump
    : keys.has('Space') || latch.jump;
  return {
    moveX,
    moveY,
    lookX: 0,
    lookY: 0,
    lookDX,
    lookDY,
    jump,
    shoot: mouse.left || latch.shoot,
    melee: mouse.right || keys.has('KeyF') || keys.has('KeyQ') || latch.melee,
    sprint: shooters && (keys.has('ShiftLeft') || keys.has('ShiftRight')),
    crouch: shooters && (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC')),
    reload: shooters && (keys.has('KeyX') || latch.reload),
  };
}

function emitHeld(
  slot: SlotInternal,
  now: number,
  frame: SlotFrame,
  emit: { shoot: () => void; melee: () => void; jump: () => void; reload?: () => void },
) {
  if (frame.shoot && (!slot.edge.shoot || now - slot.edge.shootAt > 120)) {
    emit.shoot();
    slot.edge.shootAt = now;
  }
  if (frame.melee && (!slot.edge.melee || now - slot.edge.meleeAt > 150)) {
    emit.melee();
    slot.edge.meleeAt = now;
  }
  if (frame.jump && (!slot.edge.jump || now - slot.edge.jumpAt > 140)) {
    emit.jump();
    slot.edge.jumpAt = now;
  }
  if (frame.reload && !slot.edge.reload) emit.reload?.();
  slot.edge.shoot = frame.shoot;
  slot.edge.melee = frame.melee;
  slot.edge.jump = frame.jump;
  slot.edge.reload = frame.reload;
}
