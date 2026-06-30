import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, MARBLE_COLORS } from '../store/gameStore';

/**
 * Camera that follows the actual 3D world positions of marbles.
 * Reads real physics body positions from the Zustand store (set by RaceManager).
 * Works in three modes: lobby orbit, racing follow, results zoom-in.
 */
export function CameraController() {
  const { camera } = useThree();
  const phase = useGameStore((s) => s.phase);
  const marbleActualPositions = useGameStore((s) => s.marbleActualPositions);
  const leaderColor = useGameStore((s) => s.leaderColor);
  const raceResult = useGameStore((s) => s.raceResult);

  // Smooth camera state
  const smoothPos = useRef(new THREE.Vector3(0, 8, -2));
  const smoothLook = useRef(new THREE.Vector3(0, 2, 0));
  const lobbyAngle = useRef(0);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.06);

    // ===== LOBBY: slow orbit showing the full course =====
    if (phase === 'lobby') {
      lobbyAngle.current += 0.15 * dt;
      const r = 10;
      const h = 5.5 + Math.sin(lobbyAngle.current * 0.5) * 1.5;
      smoothPos.current.set(
        Math.sin(lobbyAngle.current) * r,
        h,
        Math.cos(lobbyAngle.current) * r - 2
      );
      smoothLook.current.set(0, 1.5, 0);

      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothLook.current);
      return;
    }

    // ===== COUNTDOWN: lock onto the start gate =====
    if (phase === 'countdown') {
      const targetPos = new THREE.Vector3(0, 3.8, -8);
      const targetLook = new THREE.Vector3(0, 3.5, -11);

      smoothPos.current.lerp(targetPos, 0.08);
      smoothLook.current.lerp(targetLook, 0.1);
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothLook.current);
      return;
    }

    // ===== RACING: follow the leader's actual 3D position =====
    if (phase === 'racing') {
      // Find the leading marble by actual Z position
      let leadPos: { x: number; y: number; z: number } | null = null;
      let bestZ = -Infinity;

      MARBLE_COLORS.forEach((color) => {
        const p = marbleActualPositions[color];
        if (p && p.z > bestZ) {
          bestZ = p.z;
          leadPos = p;
        }
      });

      // Fallback: use leaderColor from store if no pos found
      if (!leadPos && leaderColor) {
        leadPos = marbleActualPositions[leaderColor];
      }

      // If we have a leader position, follow it
      if (leadPos && leadPos.z !== 0) {
        // Camera hovers above and BEHIND the leader
        const camTarget = new THREE.Vector3(leadPos.x, leadPos.y, leadPos.z);

        // Offset: behind (-Z) and above (+Y)
        const behind = 2.0; // how far behind the marble
        const above = 2.0;  // how high above

        // The camera position is above+behind the marble
        const camPos = new THREE.Vector3(
          leadPos.x * 0.4,  // slight X offset for side-angle
          leadPos.y + above,
          leadPos.z - behind
        );

        // In the funnel/bowl area, zoom out wider
        const inFunnel = leadPos.z > -3 && leadPos.z < 6 && leadPos.y < 2;
        if (inFunnel) {
          camPos.set(2.5, 4.0, 3.0);
          camTarget.set(0, 0.5, 4.0);
        }

        // On the final speed straight, pull back more to show race finish
        if (leadPos.z > 10) {
          camPos.set(leadPos.x * 0.3, leadPos.y + 3.5, leadPos.z - 4);
        }

        // Smooth follow (faster lerp = more responsive)
        smoothPos.current.lerp(camPos, 0.06);
        smoothLook.current.lerp(camTarget, 0.08);

        camera.position.copy(smoothPos.current);
        camera.lookAt(smoothLook.current);
      } else {
        // No marble positions yet — stay at a wide view of the course
        const fallback = new THREE.Vector3(0, 6, -5);
        const fallbackLook = new THREE.Vector3(0, 2, 0);
        smoothPos.current.lerp(fallback, 0.05);
        smoothLook.current.lerp(fallbackLook, 0.05);
        camera.position.copy(smoothPos.current);
        camera.lookAt(smoothLook.current);
      }
      return;
    }

    // ===== RESULTS: zoom in on the winning marble =====
    if (phase === 'results') {
      const winner = raceResult?.winner;
      if (winner) {
        const winPos = marbleActualPositions[winner];
        if (winPos && winPos.z !== 0) {
          const camTarget = new THREE.Vector3(winPos.x, winPos.y + 0.3, winPos.z);
          const camPos = new THREE.Vector3(
            winPos.x + 0.3,
            winPos.y + 0.8,
            winPos.z - 1.5
          );

          smoothPos.current.lerp(camPos, 0.05);
          smoothLook.current.lerp(camTarget, 0.06);
          camera.position.copy(smoothPos.current);
          camera.lookAt(smoothLook.current);
        }
      }
      return;
    }
  });

  return null;
}
