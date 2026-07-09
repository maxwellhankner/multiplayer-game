import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  SHOTS_FIRED_ARENA_HALF,
  SHOTS_FIRED_BOXES,
  SHOTS_FIRED_EYE_FORWARD,
  SHOTS_FIRED_IMPACT_DURATION_MS,
  SHOTS_FIRED_MAX_RANGE,
  SHOTS_FIRED_PLAYER_HEIGHT,
  SHOTS_FIRED_TRACER_DURATION_MS,
} from '../../../shared/games/shots-fired/constants';
import type { RoomState, ShotImpactKind } from '../../../shared/types';
import ShotsFiredPaneGrid from './ShotsFiredPaneGrid';
import { getSplitPanes } from '../coin-rush/splitLayout';

interface ShotsFiredHostCanvasProps {
  state: RoomState;
}

interface PlayerMesh {
  id: string;
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
}

interface PistolMesh {
  group: THREE.Group;
}

interface ImpactSpark {
  group: THREE.Group;
  parts: THREE.Mesh[];
  offsets: THREE.Vector3[];
}

export default function ShotsFiredHostCanvas({ state }: ShotsFiredHostCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x4a5568);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6b7f96);
    scene.fog = new THREE.Fog(0x6b7f96, 28, 52);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.05);
    sun.position.set(12, 24, 8);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(SHOTS_FIRED_ARENA_HALF * 2, SHOTS_FIRED_ARENA_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x4a5d4a, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(SHOTS_FIRED_ARENA_HALF * 2, 36, 0x3a4f3a, 0x3a4f3a);
    grid.position.y = 0.02;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d3428, roughness: 0.9 });
    const wallH = 2.5;
    const wallT = 0.4;
    const span = SHOTS_FIRED_ARENA_HALF * 2;
    const walls = [
      [0, wallH / 2, -SHOTS_FIRED_ARENA_HALF, span, wallH, wallT],
      [0, wallH / 2, SHOTS_FIRED_ARENA_HALF, span, wallH, wallT],
      [-SHOTS_FIRED_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
      [SHOTS_FIRED_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
    ] as const;
    for (const [x, y, z, w, h, d] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      scene.add(wall);
    }

    const shortBoxMat = new THREE.MeshStandardMaterial({ color: 0xb08040, roughness: 0.85 });
    const tallBoxMat = new THREE.MeshStandardMaterial({ color: 0x5a6472, roughness: 0.8 });
    const boxEdgeMat = new THREE.LineBasicMaterial({ color: 0x1c2430 });
    const boxGeos: THREE.BoxGeometry[] = [];
    const boxEdgeGeos: THREE.EdgesGeometry[] = [];
    const JUMPABLE_MAX_HEIGHT = 1.5;
    for (const box of SHOTS_FIRED_BOXES) {
      const geo = new THREE.BoxGeometry(box.hw * 2, box.h, box.hd * 2);
      boxGeos.push(geo);
      const mesh = new THREE.Mesh(geo, box.h <= JUMPABLE_MAX_HEIGHT ? shortBoxMat : tallBoxMat);
      mesh.position.set(box.x, box.h / 2, box.z);
      scene.add(mesh);
      const edgeGeo = new THREE.EdgesGeometry(geo);
      boxEdgeGeos.push(edgeGeo);
      const edges = new THREE.LineSegments(edgeGeo, boxEdgeMat);
      edges.position.copy(mesh.position);
      scene.add(edges);
    }

    const playerMeshes = new Map<string, PlayerMesh>();
    const pistols = new Map<number, PistolMesh>();
    const tracerLines: THREE.Line[] = [];
    const impactSparks = new Map<string, ImpactSpark>();
    const cameras: THREE.PerspectiveCamera[] = [];

    const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.85, 4, 12);
    const headGeo = new THREE.SphereGeometry(0.26, 12, 12);

    const pistolBodyGeo = new THREE.BoxGeometry(0.09, 0.1, 0.32);
    const pistolGripGeo = new THREE.BoxGeometry(0.07, 0.16, 0.1);
    const pistolBarrelGeo = new THREE.BoxGeometry(0.05, 0.05, 0.14);
    const pistolHandGeo = new THREE.BoxGeometry(0.1, 0.08, 0.14);
    const pistolMetalMat = new THREE.MeshStandardMaterial({
      color: 0x3d3d3d,
      metalness: 0.75,
      roughness: 0.28,
      fog: false,
    });
    const pistolGripMat = new THREE.MeshStandardMaterial({
      color: 0x4a3020,
      metalness: 0.1,
      roughness: 0.9,
      fog: false,
    });
    const pistolHandMat = new THREE.MeshStandardMaterial({
      color: 0xc68642,
      metalness: 0.05,
      roughness: 0.85,
      fog: false,
    });

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
    const seenTracers = new Set<string>();

    const createPistol = (): PistolMesh => {
      const group = new THREE.Group();
      const slide = new THREE.Mesh(pistolBodyGeo, pistolMetalMat);
      const grip = new THREE.Mesh(pistolGripGeo, pistolGripMat);
      const barrel = new THREE.Mesh(pistolBarrelGeo, pistolMetalMat);
      const hand = new THREE.Mesh(pistolHandGeo, pistolHandMat);
      barrel.position.set(0, 0.02, 0.22);
      grip.position.set(0, -0.12, -0.02);
      grip.rotation.x = 0.25;
      hand.position.set(0, -0.18, 0.04);
      group.add(slide, barrel, grip, hand);
      group.scale.setScalar(2.5);
      group.position.set(0.34, -0.26, -0.48);
      group.rotation.set(-0.06, 0.1, 0.03);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.layers.set(0);
          obj.renderOrder = 999;
        }
      });
      return { group };
    };

    const syncPlayers = (players: RoomState['players']) => {
      const ids = new Set(players.map((p) => p.id));
      for (const [id, entry] of playerMeshes) {
        if (!ids.has(id)) {
          scene.remove(entry.group);
          entry.bodyMat.dispose();
          entry.headMat.dispose();
          playerMeshes.delete(id);
        }
      }

      for (let index = 0; index < players.length; index++) {
        const player = players[index];
        let entry = playerMeshes.get(player.id);
        if (!entry) {
          const group = new THREE.Group();
          const bodyMat = new THREE.MeshStandardMaterial({
            color: player.color,
            roughness: 0.72,
            metalness: 0.05,
            transparent: true,
            opacity: 1,
          });
          const headMat = bodyMat.clone();
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.55;
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 1.22;
          group.add(body, head);
          scene.add(group);
          entry = { id: player.id, group, bodyMat, headMat };
          playerMeshes.set(player.id, entry);
        } else {
          entry.bodyMat.color.set(player.color);
          entry.headMat.color.set(player.color);
        }

        entry.group.position.set(player.px, player.py, player.pz);
        entry.group.rotation.y = Math.PI - player.yaw;

        const opacity = player.eliminated ? 0.38 : 1;
        entry.bodyMat.opacity = opacity;
        entry.headMat.opacity = opacity;

        const layer = index + 1;
        entry.group.traverse((obj) => {
          obj.layers.set(layer);
        });
      }
    };

    const createSparkGroup = (kind: ShotImpactKind): ImpactSpark => {
      const group = new THREE.Group();
      const parts: THREE.Mesh[] = [];
      const offsets: THREE.Vector3[] = [];

      const coreColor = kind === 'wall' ? 0xfff8dc : 0xffe0a8;
      const sparkColor = kind === 'wall' ? 0xffcc66 : 0xff7744;

      const coreMat = new THREE.MeshBasicMaterial({
        color: coreColor,
        transparent: true,
        opacity: 1,
        fog: false,
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), coreMat);
      group.add(core);
      parts.push(core);
      offsets.push(new THREE.Vector3(0, 0, 0));

      const sparkGeo = new THREE.SphereGeometry(0.028, 4, 4);
      for (let i = 0; i < 10; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: sparkColor,
          transparent: true,
          opacity: 1,
          fog: false,
        });
        const spark = new THREE.Mesh(sparkGeo, mat);
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 1.4 + 0.1,
          (Math.random() - 0.5) * 2,
        ).normalize();
        const dist = 0.12 + Math.random() * 0.22;
        offsets.push(dir.clone().multiplyScalar(dist));
        spark.position.copy(offsets[offsets.length - 1]!);
        group.add(spark);
        parts.push(spark);
      }

      return { group, parts, offsets };
    };

    const disposeSpark = (spark: ImpactSpark) => {
      scene.remove(spark.group);
      for (const part of spark.parts) {
        part.geometry.dispose();
        (part.material as THREE.Material).dispose();
      }
    };

    const syncImpacts = (impacts: RoomState['shotImpacts'], gameTime: number) => {
      const activeIds = new Set<string>();

      for (const impact of impacts ?? []) {
        const age = gameTime - impact.spawnedAt;
        if (age > SHOTS_FIRED_IMPACT_DURATION_MS) continue;
        activeIds.add(impact.id);

        let spark = impactSparks.get(impact.id);
        if (!spark) {
          spark = createSparkGroup(impact.kind);
          impactSparks.set(impact.id, spark);
          scene.add(spark.group);
        }

        spark.group.position.set(impact.x, impact.y, impact.z);
        const fade = 1 - age / SHOTS_FIRED_IMPACT_DURATION_MS;
        const spread = age / SHOTS_FIRED_IMPACT_DURATION_MS;

        const core = spark.parts[0];
        if (core) {
          const scale = 1 + fade * 2.5;
          core.scale.set(scale, scale, scale);
          (core.material as THREE.MeshBasicMaterial).opacity = fade;
        }

        for (let i = 1; i < spark.parts.length; i++) {
          const part = spark.parts[i]!;
          const base = spark.offsets[i];
          if (!base) continue;
          part.position.set(
            base.x * (1 + spread * 2.2),
            base.y * (1 + spread * 1.6),
            base.z * (1 + spread * 2.2),
          );
          (part.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
        }
      }

      for (const [id, spark] of impactSparks) {
        if (!activeIds.has(id)) {
          disposeSpark(spark);
          impactSparks.delete(id);
        }
      }
    };

    const syncTracers = (tracers: RoomState['shotTracers'], gameTime: number) => {
      for (const line of tracerLines) {
        scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      tracerLines.length = 0;

      for (const tracer of tracers) {
        const age = gameTime - tracer.spawnedAt;
        if (age > SHOTS_FIRED_TRACER_DURATION_MS) continue;

        const travel = tracer.length ?? SHOTS_FIRED_MAX_RANGE;
        const endX = tracer.ox + tracer.dx * travel;
        const endY = tracer.oy + tracer.dy * travel;
        const endZ = tracer.oz + tracer.dz * travel;
        const points = [
          new THREE.Vector3(tracer.ox, tracer.oy, tracer.oz),
          new THREE.Vector3(endX, endY, endZ),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: 0xffee88,
          transparent: true,
          opacity: 1 - age / SHOTS_FIRED_TRACER_DURATION_MS,
        });
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        tracerLines.push(line);
      }
    };

    const renderFrame = () => {
      clock.getDelta();
      const room = stateRef.current;
      const players = room.players;
      const panes = getSplitPanes(players.length);

      while (cameras.length < players.length) {
        const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 80);
        cameras.push(cam);
        const pistol = createPistol();
        cam.add(pistol.group);
        pistols.set(cameras.length - 1, pistol);
      }

      syncPlayers(players);
      syncTracers(room.shotTracers ?? [], room.gameTime);
      syncImpacts(room.shotImpacts ?? [], room.gameTime);

      for (const tracer of room.shotTracers ?? []) {
        if (!seenTracers.has(tracer.id)) {
          seenTracers.add(tracer.id);
        }
      }

      renderer.setScissorTest(true);
      renderer.clear();

      for (let i = 0; i < players.length; i++) {
        const pane = panes[i];
        if (!pane) continue;

        const player = players[i];
        const cam = cameras[i];
        const pistol = pistols.get(i);
        if (pistol) {
          const showGun =
            !player.eliminated &&
            (room.phase === 'playing' || room.phase === 'countdown');
          pistol.group.visible = showGun;
        }

        const px = player.px;
        const pz = player.pz;
        const yaw = player.yaw;
        const pitch = player.pitch ?? 0;

        cam.position.set(
          px + Math.sin(yaw) * SHOTS_FIRED_EYE_FORWARD,
          SHOTS_FIRED_PLAYER_HEIGHT + (player.py ?? 0),
          pz + Math.cos(yaw) * SHOTS_FIRED_EYE_FORWARD,
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

        cam.layers.set(0);
        for (let j = 0; j < players.length; j++) {
          if (j !== i) cam.layers.enable(j + 1);
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
      for (const line of tracerLines) {
        scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      for (const spark of impactSparks.values()) {
        disposeSpark(spark);
      }
      impactSparks.clear();
      for (const entry of playerMeshes.values()) {
        scene.remove(entry.group);
        entry.bodyMat.dispose();
        entry.headMat.dispose();
      }
      playerMeshes.clear();
      for (const cam of cameras) {
        cam.removeFromParent();
      }
      bodyGeo.dispose();
      headGeo.dispose();
      pistolBodyGeo.dispose();
      pistolGripGeo.dispose();
      pistolBarrelGeo.dispose();
      pistolHandGeo.dispose();
      pistolMetalMat.dispose();
      pistolGripMat.dispose();
      pistolHandMat.dispose();
      wallMat.dispose();
      shortBoxMat.dispose();
      tallBoxMat.dispose();
      boxEdgeMat.dispose();
      for (const g of boxGeos) g.dispose();
      for (const g of boxEdgeGeos) g.dispose();
      (ground.material as THREE.Material).dispose();
      ground.geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const paneMode =
    state.phase === 'winner'
      ? 'winner'
      : state.phase === 'countdown'
        ? 'countdown'
        : state.phase === 'orient'
          ? 'orient'
          : 'play';

  return (
    <div className="shots-fired-host" ref={containerRef}>
      <ShotsFiredPaneGrid
        players={state.players}
        mode={paneMode}
        winnerId={state.winnerId}
      />
    </div>
  );
}
