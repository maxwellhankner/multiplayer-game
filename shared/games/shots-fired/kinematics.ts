import {
  SHOTS_FIRED_CAMERA_FORWARD,
  SHOTS_FIRED_CAMERA_Y,
} from './constants.js';

/** Eye position — front center of the head sphere (nose), matches host camera. */
export function getEyePosition(
  px: number,
  pz: number,
  yaw: number,
  py = 0,
): { x: number; y: number; z: number } {
  return {
    x: px + Math.sin(yaw) * SHOTS_FIRED_CAMERA_FORWARD,
    y: SHOTS_FIRED_CAMERA_Y + py,
    z: pz + Math.cos(yaw) * SHOTS_FIRED_CAMERA_FORWARD,
  };
}

/**
 * Camera forward — matches Three.js PerspectiveCamera with
 * rotation.order = 'YXZ', rotation.y = PI - yaw, rotation.x = -pitch.
 */
export function getLookDirection(
  yaw: number,
  pitch: number,
): { x: number; y: number; z: number } {
  const yRot = Math.PI - yaw;
  const xRot = -pitch;
  const x = -Math.sin(yRot) * Math.cos(xRot);
  const y = Math.sin(xRot);
  const z = -Math.cos(yRot) * Math.cos(xRot);
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
