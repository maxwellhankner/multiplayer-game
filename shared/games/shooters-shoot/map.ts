/** Playable half-extent. Larger than Coin Rush so the hills and buildings have room. */
export const SHOOTERS_SHOOT_ARENA_HALF = 30;

export interface ShootersShootBox {
  x: number;
  z: number;
  hw: number;
  hd: number;
  /** Height of the solid, measured from `y`. */
  h: number;
  /** Bottom of the solid in world Y. */
  y: number;
  variant: 'crate' | 'pillar' | 'building' | 'stair';
}

export interface ShootersShootDome {
  x: number;
  z: number;
  r: number;
  /** Sphere center Y — the dome is the upper hemisphere. */
  y: number;
}

export function shootersTerrainHeight(x: number, z: number): number {
  return (
    1.6 +
    3.4 * Math.cos(x * 0.062) * Math.cos(z * 0.062) +
    0.85 * Math.sin(x * 0.12 - z * 0.09)
  );
}

function sit(x: number, z: number): number {
  return shootersTerrainHeight(x, z);
}

function stairsToward(
  faceX: number,
  faceZ: number,
  axis: 'x' | 'z',
  sign: 1 | -1,
  width: number,
  roofH: number,
  baseY: number,
  steps = 8,
  depth = 0.72,
): ShootersShootBox[] {
  const rise = roofH / steps;
  const boxes: ShootersShootBox[] = [];
  for (let i = 0; i < steps; i++) {
    const h = rise * (i + 1);
    const along = depth * (steps - i - 0.5);
    const x = axis === 'x' ? faceX + sign * along : faceX;
    const z = axis === 'z' ? faceZ + sign * along : faceZ;
    boxes.push({
      x,
      z,
      hw: axis === 'x' ? depth / 2 : width / 2,
      hd: axis === 'z' ? depth / 2 : width / 2,
      h,
      y: baseY,
      variant: 'stair',
    });
  }
  return boxes;
}

const houseX = 14;
const houseZ = -10;
const houseHw = 5.4;
const houseHd = 4.2;
const houseH = 4.0;
const houseY = sit(houseX, houseZ);

const shackX = -16;
const shackZ = 12;
const shackHw = 4.0;
const shackHd = 3.3;
const shackH = 3.2;
const shackY = sit(shackX, shackZ);

const crateSpots: Array<[number, number]> = [
  [4, 18],
  [-6, 20],
  [20, 4],
  [-22, -8],
  [6, -20],
];

const crates: ShootersShootBox[] = crateSpots.map(([x, z], index) => ({
  x,
  z,
  hw: index === 1 ? 1.5 : 1.2,
  hd: index === 1 ? 1.5 : 1.2,
  h: index === 3 ? 1.6 : 1.1,
  y: sit(x, z),
  variant: 'crate' as const,
}));

const pillar: ShootersShootBox = {
  x: -2,
  z: 8,
  hw: 1.35,
  hd: 1.35,
  h: 2.4,
  y: sit(-2, 8),
  variant: 'pillar',
};

export const SHOOTERS_SHOOT_BOXES: readonly ShootersShootBox[] = [
  {
    x: houseX,
    z: houseZ,
    hw: houseHw,
    hd: houseHd,
    h: houseH,
    y: houseY,
    variant: 'building',
  },
  ...stairsToward(houseX, houseZ - houseHd, 'z', -1, 3.8, houseH, houseY),
  {
    x: shackX,
    z: shackZ,
    hw: shackHw,
    hd: shackHd,
    h: shackH,
    y: shackY,
    variant: 'building',
  },
  ...stairsToward(shackX + shackHw, shackZ, 'x', 1, 3.2, shackH, shackY, 7, 0.7),
  pillar,
  ...crates,
];

export const SHOOTERS_SHOOT_DOMES: readonly ShootersShootDome[] = [
  { x: -11, z: -7, r: 3.4, y: sit(-11, -7) },
  { x: 9, z: 16, r: 4.1, y: sit(9, 16) },
  { x: 22, z: -18, r: 2.6, y: sit(22, -18) },
];

export function boxTop(box: ShootersShootBox): number {
  return box.y + box.h;
}

export function domeHeightAt(dome: ShootersShootDome, x: number, z: number): number | null {
  const dx = x - dome.x;
  const dz = z - dome.z;
  const r2 = dome.r * dome.r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r2 - 1e-6) return null;
  return dome.y + Math.sqrt(Math.max(0, r2 - d2));
}
