import type { PlayerState } from '../../types.js';

export const SHOOTER_GUN_IDS = ['pistol', 'ak47', 'shotgun', 'sniper'] as const;

export type ShooterGunId = (typeof SHOOTER_GUN_IDS)[number];

export interface ShooterGun {
  id: ShooterGunId;
  name: string;
  /** Hits removed per pellet that connects. Health is 3. */
  damage: number;
  pellets: number;
  /** Cone half-angle in radians. 0 is perfectly accurate. */
  spread: number;
  magSize: number;
  reserve: number;
  fireMs: number;
  reloadMs: number;
  range: number;
  /** Held trigger keeps firing. */
  auto: boolean;
}

export const SHOOTER_GUNS: Record<ShooterGunId, ShooterGun> = {
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    damage: 1,
    pellets: 1,
    spread: 0.015,
    magSize: 12,
    reserve: 36,
    fireMs: 260,
    reloadMs: 1400,
    range: 34,
    auto: false,
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    damage: 1,
    pellets: 1,
    spread: 0.028,
    magSize: 30,
    reserve: 90,
    fireMs: 110,
    reloadMs: 2200,
    range: 44,
    auto: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    damage: 1,
    pellets: 8,
    spread: 0.14,
    magSize: 6,
    reserve: 24,
    fireMs: 820,
    reloadMs: 2300,
    range: 16,
    auto: false,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    damage: 3,
    pellets: 1,
    spread: 0,
    magSize: 5,
    reserve: 15,
    fireMs: 1200,
    reloadMs: 2700,
    range: 80,
    auto: false,
  },
};

export const DEFAULT_SHOOTER_GUNS: [ShooterGunId, ShooterGunId] = ['ak47', 'pistol'];

export function isShooterGunId(value: unknown): value is ShooterGunId {
  return SHOOTER_GUN_IDS.some((id) => id === value);
}

export function shooterGun(id: ShooterGunId): ShooterGun {
  return SHOOTER_GUNS[id];
}

export function playerGunIndex(player: Pick<PlayerState, 'gunIndex'>): 0 | 1 {
  return player.gunIndex === 1 ? 1 : 0;
}

export function playerGuns(player: Pick<PlayerState, 'guns'>): [ShooterGunId, ShooterGunId] {
  const primary = player.guns?.[0];
  const secondary = player.guns?.[1];
  return [
    isShooterGunId(primary) ? primary : DEFAULT_SHOOTER_GUNS[0],
    isShooterGunId(secondary) ? secondary : DEFAULT_SHOOTER_GUNS[1],
  ];
}

export function equippedGunId(player: Pick<PlayerState, 'guns' | 'gunIndex'>): ShooterGunId {
  return playerGuns(player)[playerGunIndex(player)];
}

export function equippedGun(player: Pick<PlayerState, 'guns' | 'gunIndex'>): ShooterGun {
  return shooterGun(equippedGunId(player));
}
