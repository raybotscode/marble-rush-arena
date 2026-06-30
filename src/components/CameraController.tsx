import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, MARBLE_COLORS } from '../store/gameStore';
import { marblePositions } from '../marbleTracking';

/**
 * TRACKING CAMERA
 * Reads marble positions from a shared mutable ref (no Zustand timing lag).
 * Smoothly follows the leader marble through the entire course.
 * Uses a single continuous offset function — no zone switching, no hard snaps.
 */
export function CameraController() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const raceResult = useGameStore((s) => s.raceResult);

  const smoothPos = useRef(new THREE.Vector3(0, 8, -2));
  const smoothLook = useRef(new THREE.Vector3(0, 2, 0));
  const lobbyAngle = useRef(0);
  const currentProgress = useRef(0);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.06);

    // --- LOBBY ---
    if (phase === 'lobby') {
      lobbyAngle.current += 0.12 * dt;
      const r = 14;
      const h = 7 + Math.sin(lobbyAngle.current * 0.5) * 1.5;
      smoothPos.current.set(Math.sin(lobbyAngle.current) * r, h, Math.cos(lobbyAngle.current) * r - 3);
      smoothLook.current.set(0, 3, 0);
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothLook.current);
      currentProgress.current = 0;
      return;
    }

    // --- COUNTDOWN ---
    if (phase === 'countdown') {
      // Establish shot — show the start area with all marbles
      smoothPos.current.lerp(new THREE.Vector3(0, 5, -9), 0.04);
      smoothLook.current.lerp(new THREE.Vector3(0, 4.8, -11), 0.04);
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothLook.current);
      return;
    }

    // --- RACING ---
    if (phase === 'racing') {
      // Find leader: scan all positions from the shared mutable ref (always current)
      let bestZ = -Infinity;
      let leadPos = { x: 0, y: 0, z: 0 };

      // Scan all marbles from the shared tracking ref (direct mutation, no React lag)
      for (const c of MARBLE_COLORS) {
        const p = marblePositions[c];
        if (p && p.z > bestZ) {
          bestZ = p.z;
          leadPos = p;
        }
      }

      // Fallback: if nothing found yet, use a fixed early-track position
      // so the camera is pointing at the right area before marbles start moving
      if (bestZ === -Infinity) {
        leadPos = { x: 0, y: 5.0, z: -11.5 };
        bestZ = -11.5;
      }

      // Shared ref already updated by RaceManager every frame

      // Calculate how far through the course the leader is
      // Start: z=-12, Finish: z=16  → total course length ~28 units
      const z = leadPos.z;
      const progress = Math.max(0, Math.min(1, (z + 12) / 28));
      currentProgress.current = progress;

      // === SINGLE CONTINUOUS CAMERA OFFSET FUNCTION ===
      // No if/else zones, no switching — just maths based on progress

      // HEIGHT above the marble:
      // High at start (8) → low during bowl/funnel (3) → rises at finish (6)
      const height = 8 - progress * 7 + Math.sin(progress * Math.PI * 0.8) * 2;

      // SIDE OFFSET: slightly to the right at start, left at mid, centred at end
      const sideOffset = Math.sin(progress * Math.PI * 1.3) * 1.5;

      // BEHIND/AHEAD: behind at start (z+4), transitions to ahead at ~70% course
      const behindAhead = progress < 0.65
        ? 4 - progress * 2
        : 4 - 0.65 * 2 - (progress - 0.65) * 12;

      // Compute target camera position
      const targetPos = new THREE.Vector3(
        leadPos.x + sideOffset,
        leadPos.y + height,
        z + behindAhead
      );

      // Look target: slightly ahead and above the lead marble
      const lookAhead = 1 + progress * 2;
      const targetLook = new THREE.Vector3(
        leadPos.x,
        leadPos.y + 0.5,
        z + lookAhead
      );

      // Smooth follow — faster tracking at high speeds, slower for smoothness
      const lerpAlpha = Math.min(1, (3 + progress * 2) * dt);
      smoothPos.current.lerp(targetPos, lerpAlpha);
      smoothLook.current.lerp(targetLook, lerpAlpha * 0.8);

      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothLook.current);
      return;
    }

    // --- RESULTS ---
    if (phase === 'results') {
      const winner = raceResult?.winner;
      if (winner) {
        const pos = marblePositions[winner];
        if (pos && pos.z !== 0) {
          const target = new THREE.Vector3(pos.x, pos.y + 0.3, pos.z);
          const camPos = new THREE.Vector3(pos.x + 0.5, pos.y + 1.2, pos.z - 3);
          smoothPos.current.lerp(camPos, 0.03);
          smoothLook.current.lerp(target, 0.04);
          camera.position.copy(smoothPos.current);
          camera.lookAt(smoothLook.current);
        }
      }
    }
  });

  return null;
}
