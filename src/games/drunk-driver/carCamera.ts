import * as THREE from 'three';
import {
  drunkForwardFromYaw,
  drunkMeshRotationY,
} from '../../../shared/games/drunk-driver/kinematics';

/** Chase cam sits above and behind the car. */
export const DRUNK_CHASE_HEIGHT = 3.6;
export const DRUNK_CHASE_BACK = 5.5;
export const DRUNK_CHASE_LOOK_AHEAD = 8;
export const DRUNK_CHASE_LOOK_HEIGHT = 0.85;

const _lookTarget = new THREE.Vector3();

/** Third-person chase camera locked to car position and heading. */
export function applyDrunkDriverCamera(
  camera: THREE.PerspectiveCamera,
  px: number,
  pz: number,
  yaw: number,
): void {
  const { x: forwardX, z: forwardZ } = drunkForwardFromYaw(yaw);
  camera.position.set(
    px - forwardX * DRUNK_CHASE_BACK,
    DRUNK_CHASE_HEIGHT,
    pz - forwardZ * DRUNK_CHASE_BACK,
  );
  _lookTarget.set(
    px + forwardX * DRUNK_CHASE_LOOK_AHEAD,
    DRUNK_CHASE_LOOK_HEIGHT,
    pz + forwardZ * DRUNK_CHASE_LOOK_AHEAD,
  );
  camera.lookAt(_lookTarget);
}

export function applyDrunkDriverCarTransform(
  group: THREE.Group,
  px: number,
  pz: number,
  yaw: number,
): void {
  group.position.set(px, 0, pz);
  group.rotation.y = drunkMeshRotationY(yaw);
}
