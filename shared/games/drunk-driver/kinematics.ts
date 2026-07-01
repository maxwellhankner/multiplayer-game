/**
 * Kinematic car helpers aligned with Coin Rush / Three.js camera convention:
 *   camera.rotation.y = Math.PI - yaw
 *   forward on XZ = (-sin(yaw), cos(yaw))
 *
 * Same pattern as server/games/coin-rush/gameplay.ts applyStickInput.
 */

export function drunkForwardFromYaw(yaw: number): { x: number; z: number } {
  return {
    x: -Math.sin(yaw),
    z: Math.cos(yaw),
  };
}

export function drunkRightFromYaw(yaw: number): { x: number; z: number } {
  return {
    x: Math.cos(yaw),
    z: Math.sin(yaw),
  };
}

/** Three.js Y rotation — local +Z is the hood / driving direction. */
export function drunkMeshRotationY(yaw: number): number {
  return -yaw;
}

/** Three.js camera Y rotation matching drunkMeshRotationY / Coin Rush. */
export function drunkCameraRotationY(yaw: number): number {
  return Math.PI - yaw;
}

export function drunkTurnRate(
  speed: number,
  wheelAngle: number,
  wheelbase: number,
): number {
  return (speed / wheelbase) * Math.tan(wheelAngle);
}
