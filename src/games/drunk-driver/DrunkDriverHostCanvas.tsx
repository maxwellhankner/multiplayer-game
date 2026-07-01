import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DRUNK_FINISH_DISTANCE, DRUNK_ROAD_WIDTH, DRUNK_TRACK_LENGTH } from '../../../shared/games/drunk-driver/constants';
import type { PlayerState, RoomState } from '../../../shared/types';
import {
  applyDrunkDriverCamera,
  applyDrunkDriverCarTransform,
} from './carCamera';
import DrunkDriverPaneGrid from './DrunkDriverPaneGrid';
import { getSplitPanes } from '../coin-rush/splitLayout';

interface DrunkDriverHostCanvasProps {
  state: RoomState;
}

function buildScene(): {
  scene: THREE.Scene;
  carMeshes: Map<string, THREE.Group>;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc68642);
  scene.fog = new THREE.Fog(0xc68642, 40, 330);

  const ambient = new THREE.AmbientLight(0xffe8c8, 0.65);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.15);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  const trackCenterZ = DRUNK_TRACK_LENGTH / 2;
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.95 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(120, DRUNK_TRACK_LENGTH), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.05, trackCenterZ);
  scene.add(sand);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.88 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(DRUNK_ROAD_WIDTH, DRUNK_TRACK_LENGTH), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, trackCenterZ);
  scene.add(road);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
  for (let z = 0; z < DRUNK_TRACK_LENGTH; z += 8) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3.5), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  const finishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const finishLine = new THREE.Mesh(new THREE.PlaneGeometry(DRUNK_ROAD_WIDTH + 2, 1.2), finishMat);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, 0.03, DRUNK_FINISH_DISTANCE);
  scene.add(finishLine);

  const checker = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (let i = -3; i <= 3; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) continue;
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), checker);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(i * 1.1, 0.04, DRUNK_FINISH_DISTANCE + (j - 0.5) * 0.55);
      scene.add(tile);
    }
  }

  const carMeshes = new Map<string, THREE.Group>();

  return { scene, carMeshes };
}

function setCarLayers(group: THREE.Group, bodyLayer: number): void {
  group.traverse((obj) => {
    if (obj !== group) {
      obj.layers.set(bodyLayer);
    }
  });
}

function syncCars(
  carMeshes: Map<string, THREE.Group>,
  scene: THREE.Scene,
  players: PlayerState[],
  dashGeo: THREE.BoxGeometry,
  wheelGeo: THREE.CylinderGeometry,
) {
  const ids = new Set(players.map((p) => p.id));
  for (const [id, group] of carMeshes) {
    if (!ids.has(id)) {
      scene.remove(group);
      carMeshes.delete(id);
    }
  }

  for (let index = 0; index < players.length; index++) {
    const player = players[index];
    const bodyLayer = index + 1;

    let group = carMeshes.get(player.id);
    if (!group) {
      group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: player.color, roughness: 0.6 });
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.85 });

      const body = new THREE.Mesh(dashGeo, bodyMat);
      body.position.y = 0.45;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.55, 1.2),
        bodyMat,
      );
      cabin.position.set(0, 0.95, 0.2);

      const frontAxle = new THREE.Group();
      frontAxle.position.set(0, 0.45, 0.85);
      const frontLeft = new THREE.Mesh(wheelGeo, wheelMat);
      frontLeft.position.set(-0.72, 0, 0);
      const frontRight = new THREE.Mesh(wheelGeo, wheelMat);
      frontRight.position.set(0.72, 0, 0);
      frontAxle.add(frontLeft, frontRight);

      const rearAxle = new THREE.Group();
      rearAxle.position.set(0, 0.45, -0.85);
      const rearLeft = new THREE.Mesh(wheelGeo, wheelMat);
      rearLeft.position.set(-0.72, 0, 0);
      const rearRight = new THREE.Mesh(wheelGeo, wheelMat);
      rearRight.position.set(0.72, 0, 0);
      rearAxle.add(rearLeft, rearRight);

      group.add(body, cabin, frontAxle, rearAxle);
      group.userData.frontAxle = frontAxle;
      scene.add(group);
      carMeshes.set(player.id, group);
    } else {
      const body = group.children[0] as THREE.Mesh;
      (body.material as THREE.MeshStandardMaterial).color.set(player.color);
    }

    applyDrunkDriverCarTransform(group, player.px, player.pz, player.yaw);

    const frontAxle = group.userData.frontAxle as THREE.Group | undefined;
    if (frontAxle) {
      frontAxle.rotation.y = player.pitch;
    }

    setCarLayers(group, bodyLayer);
  }
}

export default function DrunkDriverHostCanvas({ state }: DrunkDriverHostCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xc68642);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const { scene, carMeshes } = buildScene();
    const dashGeo = new THREE.BoxGeometry(1.4, 0.7, 2.2);
    const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const cameras: THREE.PerspectiveCamera[] = [];

    let width = container.clientWidth;
    let height = container.clientHeight;

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      renderer.setSize(width, height, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      clock.getDelta();
      const room = stateRef.current;
      const players = room.players;
      const panes = getSplitPanes(players.length);

      while (cameras.length < players.length) {
        cameras.push(new THREE.PerspectiveCamera(72, 1, 0.1, DRUNK_TRACK_LENGTH * 0.75));
      }
      syncCars(carMeshes, scene, players, dashGeo, wheelGeo);

      renderer.setScissorTest(true);
      renderer.clear();

      for (let i = 0; i < players.length; i++) {
        const pane = panes[i];
        if (!pane) continue;

        const player = players[i];
        const cam = cameras[i];
        const { px, pz, yaw } = player;

        applyDrunkDriverCamera(cam, px, pz, yaw);

        const vx = Math.floor(pane.left * width);
        const vy = Math.floor((1 - pane.top - pane.height) * height);
        const vw = Math.floor(pane.width * width);
        const vh = Math.floor(pane.height * height);
        if (vw <= 0 || vh <= 0) continue;

        cam.aspect = vw / vh;
        cam.updateProjectionMatrix();

        cam.layers.set(0);
        for (let j = 0; j < players.length; j++) {
          cam.layers.enable(j + 1);
        }

        renderer.setViewport(vx, vy, vw, vh);
        renderer.setScissor(vx, vy, vw, vh);
        renderer.render(scene, cam);
      }

      renderer.setScissorTest(false);
      raf = requestAnimationFrame(renderFrame);
    };

    raf = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const group of carMeshes.values()) scene.remove(group);
      carMeshes.clear();
      dashGeo.dispose();
      wheelGeo.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="drunk-driver-host" ref={containerRef}>
      <div className="drunk-driver-blur-overlay" aria-hidden />
      <DrunkDriverPaneGrid players={state.players} mode="play" />
    </div>
  );
}
