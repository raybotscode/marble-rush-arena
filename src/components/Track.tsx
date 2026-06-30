import { useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { MARBLE_COLORS, MARBLE_COLOR_MAP } from '../store/gameStore';

const MARBLE_RADIUS = 0.18;
const LANE_WIDTH = 0.3;
const WALL_HEIGHT = 0.4;
const WALL_THICK = 0.06;

// Track segments — overlapping boxes forming a continuous zigzag course
const SEGMENTS = [
  { pos: [0, 4.0, -12], rot: [0, 0, 0], size: [2.8, 0.15, 2.0], color: '#e8e0d8', label: 'start' },
  { pos: [0, 3.65, -9.5], rot: [-0.12, 0, 0], size: [2.4, 0.12, 3.0], color: '#e8e0d8' },
  { pos: [0, 3.15, -6.5], rot: [0, 0, 0], size: [2.4, 0.12, 3.0], color: '#ee4444' },
  { pos: [2.5, 2.85, -4.2], rot: [0, -0.45, 0.05], size: [2.0, 0.12, 3.5], color: '#e8e0d8' },
  { pos: [-1.2, 2.55, -1.8], rot: [0.04, 0.55, -0.02], size: [1.0, 0.10, 3.8], color: '#888890' },
  { pos: [-1.2, 2.15, 1.0], rot: [0, 0, 0.04], size: [2.0, 0.12, 3.5], color: '#ffcc00' },
  { pos: [0, 1.85, 4.0], rot: [0, 0, 0], size: [3.0, 0.12, 2.5], color: '#f0e8e0' },
  { pos: [0, 1.15, 4.0], rot: [0, 0, 0], size: [2.2, 0.10, 2.2], color: '#ee4444' },
  { pos: [0, 0.35, 4.0], rot: [0, 0, 0], size: [1.6, 0.10, 1.6], color: '#ff8833' },
  { pos: [0, -0.35, 4.0], rot: [0, 0, 0], size: [1.2, 0.10, 1.2], color: '#ffcc00' },
  { pos: [0, -0.95, 4.0], rot: [0, 0, 0], size: [0.9, 0.10, 0.9], color: '#ffd700' },
  { pos: [1.8, -0.95, 6.0], rot: [0, -0.5, 0.04], size: [1.4, 0.10, 3.2], color: '#44dd66' },
  { pos: [-0.3, -1.05, 8.5], rot: [0.04, 0.35, -0.03], size: [1.4, 0.10, 3.2], color: '#44dd66' },
  { pos: [-0.3, -1.1, 11.0], rot: [0, 0, -0.02], size: [2.2, 0.10, 3.5], color: '#cc4444' },
  { pos: [-0.3, -1.15, 14.0], rot: [0, 0, 0], size: [2.6, 0.12, 2.0], color: '#e8e0d8', label: 'finish' },
];

// Chaos bumpers — plastic toy bumpers distributed across the course
const BUMPERS: [number, number, number][] = [
  // Bumper alley (segment 2 - red straight)
  [-0.7, 3.15, -7.2], [0.7, 3.15, -7.2],
  [-0.5, 3.15, -6.7], [0.5, 3.15, -6.7],
  [-0.3, 3.15, -6.2], [0.3, 3.15, -6.2],
  // Turn bumpers (segment 3 - right turn)
  [0.8, 2.85, -4.8], [1.2, 2.85, -3.8],
  [1.8, 2.85, -4.0], [2.0, 2.85, -4.8],
  // Bridge pegs area
  [-0.3, 2.6, -2.8], [0.0, 2.6, -2.5], [0.3, 2.6, -2.8],
  [-0.2, 2.6, -2.0], [0.2, 2.6, -2.0],
  // Bowl bumpers
  [-0.6, 1.9, 3.2], [0.6, 1.9, 3.2],
  [-0.4, 1.9, 4.0], [0.4, 1.9, 4.0],
  [-0.2, 1.9, 4.8], [0.2, 1.9, 4.8],
  // Green wavy section bumpers
  [-0.4, -0.9, 5.5], [0.4, -0.9, 5.5],
  [-0.2, -0.9, 6.5], [0.2, -0.9, 6.5],
  [-0.4, -1.0, 8.0], [0.4, -1.0, 8.0],
  // Speed straight bumpers
  [-0.6, -1.05, 10.5], [0.6, -1.05, 10.5],
  [-0.5, -1.05, 11.5], [0.5, -1.05, 11.5],
  [-0.4, -1.05, 12.5], [0.4, -1.05, 12.5],
];

// Finish lane positions
const FINISH_POSITIONS = MARBLE_COLORS.map((_, i) => {
  const offset = (i - (MARBLE_COLORS.length - 1) / 2) * LANE_WIDTH * 0.8;
  return [offset, -1.1, 15.5] as [number, number, number];
});

// Wall for a track segment — taller and more visible
function SegmentWalls({ pos, rot, size }: { pos: number[]; rot: number[]; size: number[] }) {
  const hw = size[0] / 2 + 0.03;
  const hd = size[2] / 2 + 0.03;
  const wallOpacity = 0.3;

  return (
    <group position={pos as any} rotation={rot as any}>
      {/* Left wall */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.5}>
        <mesh position={[-hw, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICK, WALL_HEIGHT, size[2] + 0.15]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={wallOpacity} />
        </mesh>
      </RigidBody>
      {/* Right wall */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.5}>
        <mesh position={[hw, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[WALL_THICK, WALL_HEIGHT, size[2] + 0.15]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={wallOpacity} />
        </mesh>
      </RigidBody>
      {/* Back wall */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.5}>
        <mesh position={[0, WALL_HEIGHT / 2, -hd]}>
          <boxGeometry args={[size[0] + 0.15, WALL_HEIGHT, WALL_THICK]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={wallOpacity} />
        </mesh>
      </RigidBody>
    </group>
  );
}

export function Track() {
  return (
    <group>
      {/* Track surface segments */}
      {SEGMENTS.map((seg, i) => (
        <RigidBody key={`seg-${i}`} type="fixed" colliders="cuboid" friction={0.08}>
          <mesh position={seg.pos as any} rotation={seg.rot as any}>
            <boxGeometry args={seg.size as any} />
            <meshStandardMaterial
              color={seg.color}
              roughness={0.35}
              metalness={0.05}
              transparent={seg.color === '#888890'}
              opacity={seg.color === '#888890' ? 0.6 : 1}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Side walls on every segment */}
      {SEGMENTS.map((seg, i) => (
        <SegmentWalls key={`walls-${i}`} pos={seg.pos} rot={seg.rot} size={seg.size} />
      ))}

      {/* Chaos bumpers */}
      {BUMPERS.map((pos, i) => (
        <RigidBody key={`bumper-${i}`} type="fixed" colliders="ball" restitution={0.7}>
          <mesh position={pos}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial color="#ff6666" roughness={0.3} metalness={0.2} />
          </mesh>
        </RigidBody>
      ))}

      {/* Bowl collision ring — invisible walls around the bowl edge */}
      {Array.from({ length: 16 }).map((_, j) => {
        const angle = (j / 16) * Math.PI * 2;
        const r = 1.5;
        return (
          <RigidBody key={`bowl-wall-${j}`} type="fixed" colliders="cuboid" restitution={0.6}>
            <mesh
              position={[Math.cos(angle) * r, 1.88, Math.sin(angle) * r + 4.0]}
              visible={false}
            >
              <boxGeometry args={[0.1, 0.4, 0.1]} />
            </mesh>
          </RigidBody>
        );
      })}

      {/* Funnel collision walls — concentric rings that direct marbles inward */}
      {Array.from({ length: 4 }).map((_, fi) => {
        const idx = 7 + fi;
        const seg = SEGMENTS[idx];
        if (!seg) return null;
        const segR = seg.size[0] / 2;
        const count = 8 + fi * 2;
        return Array.from({ length: count }).map((_, wi) => {
          const angle = (wi / count) * Math.PI * 2 + (fi * 0.7);
          // Vary radius per wall for an irregular ring
          const variation = 0.75 + Math.sin(wi * 1.3 + fi) * 0.2;
          const r = segR * variation;
          return (
            <RigidBody
              key={`funnel-${fi}-${wi}`}
              type="fixed"
              colliders="cuboid"
              restitution={0.5}
            >
              <mesh
                position={[
                  Math.cos(angle) * r,
                  seg.pos[1] + 0.02,
                  Math.sin(angle) * r + 4.0,
                ]}
                visible={false}
              >
                <boxGeometry args={[0.08, 0.08, 0.25]} />
              </mesh>
            </RigidBody>
          );
        });
      })}

      {/* Finish line flags */}
      {MARBLE_COLORS.map((color, i) => {
        const lp = FINISH_POSITIONS[i];
        return (
          <mesh
            key={`finish-flag-${i}`}
            position={[lp[0], -1.0, lp[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.2, 0.1]} />
            <meshBasicMaterial
              color={MARBLE_COLOR_MAP[color]}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Finish sensors */}
      {FINISH_POSITIONS.map((lp, i) => (
        <RigidBody key={`finish-sensor-${i}`} type="fixed" sensor colliders="cuboid">
          <mesh position={[lp[0], lp[1] + 0.05, lp[2]]} visible={false}>
            <boxGeometry args={[0.25, 0.3, 0.15]} />
          </mesh>
        </RigidBody>
      ))}

      {/* Safety net — catch marbles that fall off */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -3, 2]} visible={false}>
          <boxGeometry args={[30, 0.1, 30]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// Individual marble
export function GameMarble({
  color,
  index,
  active,
}: {
  color: string;
  index: number;
  active: boolean;
}) {
  const ref = useRef<any>(null);
  const hexColor =
    MARBLE_COLOR_MAP[color as keyof typeof MARBLE_COLOR_MAP] || '#888';

  // Spread marbles evenly across the start platform
  const laneOffset = (index - (MARBLE_COLORS.length - 1) / 2) * LANE_WIDTH;
  const startPos: [number, number, number] = [laneOffset, 4.08, -11.5];

  if (!active) return null;

  return (
    <RigidBody
      ref={ref}
      position={startPos}
      colliders="ball"
      restitution={0.5}
      friction={0.02}
      linearDamping={0.05}
      angularDamping={0.08}
      name={`marble-${color}`}
      userData={{ name: `marble-${color}` }}
      canSleep={false}
    >
      {/* Main sphere */}
      <mesh>
        <sphereGeometry args={[MARBLE_RADIUS, 20, 20]} />
        <meshPhysicalMaterial
          color={hexColor}
          roughness={0.12}
          metalness={0.08}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
          envMapIntensity={1.0}
        />
      </mesh>
      {/* Sparkle highlight */}
      <mesh position={[0.06, 0.06, MARBLE_RADIUS * 0.85]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="white" transparent opacity={0.6} />
      </mesh>
    </RigidBody>
  );
}

export { MARBLE_RADIUS, LANE_WIDTH };
