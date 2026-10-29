import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  SHOOTERS_SHOOT_ARENA_HALF,
  SHOOTERS_SHOOT_BOXES,
  SHOOTERS_SHOOT_HEAD_CENTER_Y,
  SHOOTERS_SHOOT_HEAD_RADIUS,
  SHOOTERS_SHOOT_IMPACT_DURATION_MS,
  SHOOTERS_SHOOT_MAX_RANGE,
  SHOOTERS_SHOOT_RELOAD_MS,
  SHOOTERS_SHOOT_MELEE_SWING_MS,
  SHOOTERS_SHOOT_TORSO_HEIGHT,
  SHOOTERS_SHOOT_TRACER_DURATION_MS,
} from '../../../shared/games/shooters-shoot/constants';
import { getEyePosition } from '../../../shared/games/shooters-shoot/kinematics';
import type { RoomState, ShotImpactKind } from '../../../shared/types';
import ShootersShootPaneGrid from './ShootersShootPaneGrid';
import { getSplitPanes } from '../coin-rush/splitLayout';

interface ShootersShootHostCanvasProps {
  state: RoomState;
}

interface PlayerMesh {
  id: string;
  group: THREE.Group;
  torsoMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  leftArm: THREE.Group;
}

interface ImpactSpark {
  group: THREE.Group;
  parts: THREE.Mesh[];
  offsets: THREE.Vector3[];
}

export default function ShootersShootHostCanvas({ state }: ShootersShootHostCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x14181e);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c2633);
    scene.fog = new THREE.Fog(0x1c2633, 20, 44);

    const ambient = new THREE.AmbientLight(0xb7c4d6, 0.38);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe2b0, 1.2);
    sun.position.set(12, 24, 8);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8fb4ff, 0.32);
    fill.position.set(-14, 10, -8);
    scene.add(fill);
    ambient.layers.enableAll();
    sun.layers.enableAll();
    fill.layers.enableAll();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(SHOOTERS_SHOOT_ARENA_HALF * 2, SHOOTERS_SHOOT_ARENA_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x2c332c, roughness: 0.92 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(SHOOTERS_SHOOT_ARENA_HALF * 2, 36, 0x3d4a3d, 0x313831);
    grid.position.y = 0.02;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.88 });
    const wallH = 2.5;
    const wallT = 0.4;
    const span = SHOOTERS_SHOOT_ARENA_HALF * 2;
    const walls = [
      [0, wallH / 2, -SHOOTERS_SHOOT_ARENA_HALF, span, wallH, wallT],
      [0, wallH / 2, SHOOTERS_SHOOT_ARENA_HALF, span, wallH, wallT],
      [-SHOOTERS_SHOOT_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
      [SHOOTERS_SHOOT_ARENA_HALF, wallH / 2, 0, wallT, wallH, span],
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
    for (const box of SHOOTERS_SHOOT_BOXES) {
      const geo = new THREE.BoxGeometry(box.hw * 2, box.h, box.hd * 2);
      boxGeos.push(geo);
      const mesh = new THREE.Mesh(
        geo,
        box.variant === 'pillar' ? tallBoxMat : shortBoxMat,
      );
      mesh.position.set(box.x, box.h / 2, box.z);
      scene.add(mesh);
      const edgeGeo = new THREE.EdgesGeometry(geo);
      boxEdgeGeos.push(edgeGeo);
      const edges = new THREE.LineSegments(edgeGeo, boxEdgeMat);
      edges.position.copy(mesh.position);
      scene.add(edges);
    }

    const playerMeshes = new Map<string, PlayerMesh>();
    const tracerLines: THREE.Line[] = [];
    const impactSparks = new Map<string, ImpactSpark>();
    const cameras: THREE.PerspectiveCamera[] = [];
    const viewGuns: THREE.Group[] = [];
    const viewGunGeos: THREE.BufferGeometry[] = [];
    const viewGunMats: THREE.Material[] = [];

    const makeViewGun = (layer: number): THREE.Group => {
      const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.55, roughness: 0.32 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.4, roughness: 0.48 });
      const accent = new THREE.MeshStandardMaterial({ color: 0xe7edf2, metalness: 0.7, roughness: 0.2 });
      viewGunMats.push(metal, dark, accent);

      const bodyGeo = new THREE.BoxGeometry(0.07, 0.085, 0.3);
      const barrelGeo = new THREE.BoxGeometry(0.032, 0.032, 0.24);
      const gripGeo = new THREE.BoxGeometry(0.048, 0.13, 0.055);
      const magGeo = new THREE.BoxGeometry(0.038, 0.11, 0.05);
      const sightGeo = new THREE.BoxGeometry(0.012, 0.028, 0.012);
      viewGunGeos.push(bodyGeo, barrelGeo, gripGeo, magGeo, sightGeo);

      const gun = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, metal);
      const barrel = new THREE.Mesh(barrelGeo, dark);
      barrel.position.set(0, 0.028, -0.24);
      const grip = new THREE.Mesh(gripGeo, dark);
      grip.position.set(0, -0.09, 0.07);
      grip.rotation.x = 0.4;
      const mag = new THREE.Mesh(magGeo, accent);
      mag.position.set(0, -0.085, -0.02);
      const sight = new THREE.Mesh(sightGeo, accent);
      sight.position.set(0, 0.058, -0.04);
      gun.add(body, barrel, grip, mag, sight);
      gun.traverse((obj) => {
        obj.layers.set(layer);
        obj.frustumCulled = false;
      });
      gun.userData.kick = 0;
      gun.userData.bob = 0;
      return gun;
    };

    const SKIN_COLOR = 0xf3b673;
    const GUN_COLOR = 0x555555;

    const torsoGeo = new THREE.BoxGeometry(0.52, SHOOTERS_SHOOT_TORSO_HEIGHT, 0.3);
    const headGeo = new THREE.SphereGeometry(SHOOTERS_SHOOT_HEAD_RADIUS, 14, 14);
    const worldShootArmGeo = new THREE.CapsuleGeometry(0.09, 0.34, 4, 8);
    const worldTorsoH = SHOOTERS_SHOOT_TORSO_HEIGHT;
    const worldTorsoY = worldTorsoH / 2;
    const worldHeadY = SHOOTERS_SHOOT_HEAD_CENTER_Y;
    const worldUpperY = worldTorsoY + worldTorsoH * 0.22;
    const worldShoulderZ = -0.1;
    const worldArmHalf = 0.26;
    const worldGunBarrelGeo = new THREE.BoxGeometry(0.05, 0.05, 0.14);
    const worldGunGripGeo = new THREE.BoxGeometry(0.04, 0.09, 0.04);

    const skinMat = new THREE.MeshStandardMaterial({
      color: SKIN_COLOR,
      roughness: 0.95,
      metalness: 0,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: GUN_COLOR,
      roughness: 0.85,
      metalness: 0.05,
    });

    const addWorldGun = (rightArm: THREE.Object3D, tipZ: number) => {
      const gun = new THREE.Group();
      gun.position.set(0.02, -0.03, tipZ);
      const barrel = new THREE.Mesh(worldGunBarrelGeo, gunMat);
      barrel.position.set(0, 0, -0.07);
      const grip = new THREE.Mesh(worldGunGripGeo, gunMat);
      grip.position.set(0, -0.05, 0.03);
      gun.add(barrel, grip);
      rightArm.add(gun);
    };

    const addWorldArm = (group: THREE.Group, shoulderX: number, skin: THREE.Material, withGun: boolean) => {
      const arm = new THREE.Group();
      arm.position.set(shoulderX, worldUpperY, worldShoulderZ);
      const forearm = new THREE.Mesh(worldShootArmGeo, skin);
      forearm.rotation.x = -Math.PI / 2;
      const armCenterZ = -0.04;
      forearm.position.set(0, 0, armCenterZ);
      arm.add(forearm);
      if (withGun) {
        addWorldGun(arm, armCenterZ - worldArmHalf);
      }
      group.add(arm);
      return arm;
    };

    const getMeleeSwing = (gameTime: number, lastMeleeAt: number): number => {
      if (!lastMeleeAt) return 0;
      const elapsed = gameTime - lastMeleeAt;
      if (elapsed < 0 || elapsed > SHOOTERS_SHOOT_MELEE_SWING_MS) return 0;
      return Math.sin((elapsed / SHOOTERS_SHOOT_MELEE_SWING_MS) * Math.PI);
    };

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

    const syncPlayers = (players: RoomState['players'], gameTime: number) => {
      const ids = new Set(players.map((p) => p.id));
      for (const [id, entry] of playerMeshes) {
        if (!ids.has(id)) {
          scene.remove(entry.group);
          entry.torsoMat.dispose();
          entry.skinMat.dispose();
          playerMeshes.delete(id);
        }
      }

      for (let index = 0; index < players.length; index++) {
        const player = players[index];
        let entry = playerMeshes.get(player.id);
        if (!entry) {
          const group = new THREE.Group();
          const torsoMat = new THREE.MeshStandardMaterial({
            color: player.color,
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            opacity: 1,
          });
          const playerSkinMat = skinMat.clone();
          const torso = new THREE.Mesh(torsoGeo, torsoMat);
          torso.position.y = worldTorsoY;
          const head = new THREE.Mesh(headGeo, playerSkinMat);
          head.position.y = worldHeadY;
          const leftArm = addWorldArm(group, -0.28, playerSkinMat, false);
          addWorldArm(group, 0.28, playerSkinMat, true);
          group.add(torso, head);
          scene.add(group);
          entry = { id: player.id, group, torsoMat, skinMat: playerSkinMat, leftArm };
          playerMeshes.set(player.id, entry);
        } else {
          entry.torsoMat.color.set(player.color);
        }

        entry.group.position.set(player.px, player.py, player.pz);
        entry.group.rotation.y = Math.PI - player.yaw;
        entry.group.scale.y = player.crouching && !player.eliminated ? 0.62 : 1;

        const swing = getMeleeSwing(gameTime, player.lastMeleeAt ?? 0);
        entry.leftArm.rotation.set(0, -swing * 1.05, swing * 0.12);

        const opacity = player.eliminated ? 0.38 : 1;
        entry.torsoMat.transparent = opacity < 1;
        entry.torsoMat.opacity = opacity;
        entry.skinMat.transparent = opacity < 1;
        entry.skinMat.opacity = opacity;

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
        if (age > SHOOTERS_SHOOT_IMPACT_DURATION_MS) continue;
        activeIds.add(impact.id);

        let spark = impactSparks.get(impact.id);
        if (!spark) {
          spark = createSparkGroup(impact.kind);
          impactSparks.set(impact.id, spark);
          scene.add(spark.group);
        }

        spark.group.position.set(impact.x, impact.y, impact.z);
        const fade = 1 - age / SHOOTERS_SHOOT_IMPACT_DURATION_MS;
        const spread = age / SHOOTERS_SHOOT_IMPACT_DURATION_MS;

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
        if (age > SHOOTERS_SHOOT_TRACER_DURATION_MS) continue;

        const travel = tracer.length ?? SHOOTERS_SHOOT_MAX_RANGE;
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
          opacity: 1 - age / SHOOTERS_SHOOT_TRACER_DURATION_MS,
        });
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        tracerLines.push(line);
      }
    };

    const renderFrame = () => {
      const dt = clock.getDelta();
      const room = stateRef.current;
      const players = room.players;
      const panes = getSplitPanes(players.length);

      while (cameras.length < players.length) {
        const cam = new THREE.PerspectiveCamera(70, 1, 0.08, 80);
        const gun = makeViewGun(16 + cameras.length);
        cam.add(gun);
        scene.add(cam);
        cameras.push(cam);
        viewGuns.push(gun);
      }

      syncPlayers(players, room.gameTime);
      syncTracers(room.shotTracers ?? [], room.gameTime);
      syncImpacts(room.shotImpacts ?? [], room.gameTime);

      for (const tracer of room.shotTracers ?? []) {
        if (!seenTracers.has(tracer.id)) {
          seenTracers.add(tracer.id);
          const shooterIndex = players.findIndex((player) => player.id === tracer.shooterId);
          const gun = viewGuns[shooterIndex];
          if (gun) gun.userData.kick = 1;
        }
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

        const eye = getEyePosition(px, pz, yaw, player.py ?? 0, Boolean(player.crouching));
        cam.position.set(eye.x, eye.y, eye.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.y = Math.PI - yaw;
        cam.rotation.x = -pitch;

        const gun = viewGuns[i];
        if (gun) {
          const kick = Number(gun.userData.kick ?? 0) * Math.exp(-dt * 14);
          gun.userData.kick = kick;
          const moving = player.sprinting || Math.hypot(player.px - Number(gun.userData.lastX ?? player.px), player.pz - Number(gun.userData.lastZ ?? player.pz)) > 0.004;
          gun.userData.lastX = player.px;
          gun.userData.lastZ = player.pz;
          gun.userData.bob = Number(gun.userData.bob ?? 0) + dt * (moving ? (player.sprinting ? 12 : 8) : 0);
          const bob = moving ? Math.sin(Number(gun.userData.bob)) * (player.crouching ? 0.004 : player.sprinting ? 0.016 : 0.009) : 0;
          const reloadLeft = (player.reloadUntil ?? 0) - room.gameTime;
          const reloading = reloadLeft > 0;
          const reloadT = reloading ? 1 - reloadLeft / SHOOTERS_SHOOT_RELOAD_MS : 0;
          const dip = reloading ? Math.sin(Math.min(1, Math.max(0, reloadT)) * Math.PI) : 0;
          gun.visible = !player.eliminated;
          gun.scale.setScalar(1.15);
          gun.position.set(0.16, -0.12 - dip * 0.12 + bob, -0.48 + kick * 0.05);
          gun.rotation.set(-0.06 + kick * 0.2 - dip * 0.3, 0.24, dip * 0.35);
        }

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
        cam.layers.enable(16 + i);

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
        entry.torsoMat.dispose();
        entry.skinMat.dispose();
      }
      playerMeshes.clear();
      for (const cam of cameras) {
        cam.removeFromParent();
      }
      for (const geo of viewGunGeos) geo.dispose();
      for (const mat of viewGunMats) mat.dispose();
      cameras.length = 0;
      torsoGeo.dispose();
      headGeo.dispose();
      worldShootArmGeo.dispose();
      worldGunBarrelGeo.dispose();
      worldGunGripGeo.dispose();
      skinMat.dispose();
      gunMat.dispose();
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
    <div className="shooters-shoot-host" ref={containerRef}>
      <ShootersShootPaneGrid
        players={state.players}
        mode={paneMode}
        winnerId={state.winnerId}
        gameTime={state.gameTime}
      />
    </div>
  );
}
