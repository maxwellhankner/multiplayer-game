import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  COIN_RUSH_ARENA_HALF,
  COIN_RUSH_EYE_FORWARD,
  COIN_RUSH_PLAYER_HEIGHT,
} from '../../../shared/games/coin-rush/constants';
import type { RoomState } from '../../../shared/types';
import { getSplitPanes } from './splitLayout';

interface CoinRushHostCanvasProps {
  state: RoomState;
}

interface CoinMesh {
  id: string;
  mesh: THREE.Mesh;
  baseY: number;
  spin: number;
}

export default function CoinRushHostCanvas({ state }: CoinRushHostCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87b5d8);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87b5d8, 28, 52);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
    sun.position.set(12, 24, 8);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(COIN_RUSH_ARENA_HALF * 2, COIN_RUSH_ARENA_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.92 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(COIN_RUSH_ARENA_HALF * 2, 36, 0x2a4f2a, 0x2a4f2a);
    grid.position.y = 0.02;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.85 });
    const wallH = 2.5;
    const wallT = 0.4;
    const span = COIN_RUSH_ARENA_HALF * 2;
    const walls = [
      [0, wallH / 2, -COIN_RUSH_ARENA_HALF, span, wallH, wallT],
      [0, wallH / 2, COIN_RUSH_ARENA_HALF, span, wallH, wallT],
      [-COIN_RUSH_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
      [COIN_RUSH_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
    ] as const;
    for (const [x, y, z, w, h, d] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      scene.add(wall);
    }

    const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 24);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd54a,
      emissive: 0x9a7200,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.25,
    });

    const coinMeshes = new Map<string, CoinMesh>();
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

    const syncCoins = (coins: RoomState['coins']) => {
      const ids = new Set(coins.map((c) => c.id));
      for (const [id, entry] of coinMeshes) {
        if (!ids.has(id)) {
          scene.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          coinMeshes.delete(id);
        }
      }
      for (const coin of coins) {
        let entry = coinMeshes.get(coin.id);
        if (!entry) {
          const mesh = new THREE.Mesh(coinGeo, coinMat);
          mesh.rotation.x = Math.PI / 2;
          const baseY = 1.1 + Math.random() * 0.25;
          mesh.position.set(coin.x, baseY, coin.z);
          scene.add(mesh);
          entry = { id: coin.id, mesh, baseY, spin: 0.6 + Math.random() * 0.5 };
          coinMeshes.set(coin.id, entry);
        } else {
          entry.mesh.position.x = coin.x;
          entry.mesh.position.z = coin.z;
        }
      }
    };

    const renderFrame = () => {
      const dt = clock.getDelta();
      const room = stateRef.current;
      const players = room.players;
      const panes = getSplitPanes(players.length);

      while (cameras.length < players.length) {
        cameras.push(new THREE.PerspectiveCamera(70, 1, 0.1, 80));
      }

      syncCoins(room.coins);

      const t = performance.now() * 0.001;
      for (const entry of coinMeshes.values()) {
        entry.spin += dt * 1.4;
        entry.mesh.rotation.z = entry.spin;
        entry.mesh.position.y = entry.baseY + Math.sin(t * 2 + entry.mesh.position.x) * 0.12;
      }

      renderer.setScissorTest(true);
      renderer.clear();

      for (let i = 0; i < players.length; i++) {
        const pane = panes[i];
        if (!pane) continue;

        const player = players[i];
        const cam = cameras[i];
        const px = player.px;
        const pz = player.pz;
        const yaw = player.yaw;
        const pitch = player.pitch ?? 0;

        cam.position.set(
          px + Math.sin(yaw) * COIN_RUSH_EYE_FORWARD,
          COIN_RUSH_PLAYER_HEIGHT,
          pz + Math.cos(yaw) * COIN_RUSH_EYE_FORWARD,
        );
        cam.rotation.order = 'YXZ';
        cam.rotation.y = Math.PI - yaw;
        cam.rotation.x = -pitch;

        const vx = Math.floor(pane.left * width);
        const vy = Math.floor((1 - pane.top - pane.height) * height);
        const vw = Math.floor(pane.width * width);
        const vh = Math.floor(pane.height * height);

        if (vw <= 0 || vh <= 0) continue;

        cam.aspect = vw / vh;
        cam.updateProjectionMatrix();

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
      for (const entry of coinMeshes.values()) {
        scene.remove(entry.mesh);
      }
      coinMeshes.clear();
      coinGeo.dispose();
      coinMat.dispose();
      wallMat.dispose();
      (ground.material as THREE.Material).dispose();
      ground.geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const panes = getSplitPanes(state.players.length);

  return (
    <div className="coin-rush-host" ref={containerRef}>
      {state.players.map((player, i) => {
        const pane = panes[i];
        if (!pane) return null;
        return (
          <div
            key={player.id}
            className="coin-rush-pane-label"
            style={{
              left: `${pane.left * 100}%`,
              top: `${pane.top * 100}%`,
              width: `${pane.width * 100}%`,
            }}
          >
            <span className="coin-rush-pane-name" style={{ color: player.color }}>
              {player.name}
            </span>
            <span className="coin-rush-pane-score">{player.score}/5</span>
          </div>
        );
      })}
    </div>
  );
}
