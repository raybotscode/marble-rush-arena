/**
 * SHARED MARBLE TRACKING REF
 * Direct mutable ref — no Zustand timing issues, no React re-render delays.
 * RaceManager writes every physics frame, CameraController reads every frame.
 */
import type { MarbleColor } from './store/gameStore';

export interface MarblePosition3D {
  x: number;
  y: number;
  z: number;
}

export const marblePositions: Record<MarbleColor, MarblePosition3D> = {
  blue: { x: 0, y: 0, z: 0 },
  cyan: { x: 0, y: 0, z: 0 },
  orange: { x: 0, y: 0, z: 0 },
  pink: { x: 0, y: 0, z: 0 },
  green: { x: 0, y: 0, z: 0 },
  gold: { x: 0, y: 0, z: 0 },
};

export let leaderColor: MarbleColor | null = null;
export let leaderPosition: MarblePosition3D = { x: 0, y: 0, z: 0 };

export function updateMarblePosition(color: MarbleColor, x: number, y: number, z: number) {
  marblePositions[color].x = x;
  marblePositions[color].y = y;
  marblePositions[color].z = z;
}

export function updateLeader(color: MarbleColor) {
  leaderColor = color;
  leaderPosition = marblePositions[color];
}
