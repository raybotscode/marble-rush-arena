import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { MARBLE_COLORS, MARBLE_COLOR_MAP, useGameStore } from '../store/gameStore';

const MARBLE_RADIUS = 0.18;
const LANE_WIDTH = 0.3;

// ============================================================================
// CONTINUOUS TRACK SURFACE
// A single unbroken collision surface from START (-13) to FINISH (+16).
// Each section overlaps its neighbours by 1.0+ units so there's NO gap.
// The marble ALWAYS has a surface beneath it.
// ============================================================================

const SEGMENTS = [
  // === START AREA (z: -14 to -8) ===
  // Start platform — raised, flat
  { pos: [0, 5.0, -12], rot: [0, 0, 0], size: [3.0, 0.20, 4.0], color: '#f5f0eb', label: 'start' as const },
  // === DOWNHILL RAMP (z: -10 to 0) ===
  // Gentle slope down — these three boxes make a continuous descending surface
  { pos: [0, 4.0, -8], rot: [-0.06, 0, 0], size: [2.8, 0.20, 4.0], color: '#f0ebe5' },
  { pos: [0, 2.8, -5], rot: [-0.04, 0, 0], size: [2.8, 0.20, 4.0], color: '#ebe5df' },
  // === MID-COURSE (z: -3 to 3) ===
  // Wide sweeping surface — marble rolls left, then right
  { pos: [0.8, 2.0, -2], rot: [0, -0.15, 0], size: [2.4, 0.20, 4.0], color: '#e8e0d8' },
  // === BOWL/FUNNEL AREA (z: 1 to 7) ===
  // Descending surface into the bowl — still one continuous solid box (just deeper)
  { pos: [0, 0.8, 3], rot: [0, 0, 0], size: [3.2, 0.20, 4.0], color: '#f5f0eb' },
  // Funnel exit — deeper, the bowl/funnel rings sit ON TOP of this as obstacles
  { pos: [0, -0.3, 5.5], rot: [0, 0, 0], size: [2.4, 0.20, 3.0], color: '#e0d8d0' },
  // === EXIT RAMP UP (z: 4 to 8) ===
  // Ramp back up from funnel
  { pos: [0.5, 0.3, 6], rot: [0, -0.1, 0.03], size: [2.0, 0.20, 3.0], color: '#f0ebe5' },
  // === SPLIT / ZIGZAG / SPEED STRAIGHT (z: 6 to 14) ===
  { pos: [0, 0.6, 8], rot: [0, 0, 0], size: [2.6, 0.20, 3.0], color: '#f5f0eb' },
  { pos: [0, 0.4, 10.5], rot: [0, 0, 0], size: [2.4, 0.20, 3.5], color: '#cc4444' },
  { pos: [0, 0.1, 13], rot: [0, 0, 0], size: [2.6, 0.20, 4.0], color: '#4488dd' },
  // === FINISH (z: 11 to 16) ===
  { pos: [0, -0.1, 15], rot: [0, 0, 0], size: [2.6, 0.20, 2.5], color: '#f5f0eb', label: 'finish' as const },
];

// ============================================================================
// GIANT SAFETY NET — invisible floor covering the ENTIRE course area
// At y=-3, well below the lowest track point. Catches ANY marble that falls.
// ============================================================================
function SafetyNet() {
  return (
    <RigidBody type="fixed" colliders="cuboid" friction={0.15} restitution={0.2}>
      <mesh position={[0, -3, 2]} visible={false}>
        <boxGeometry args={[8, 0.5, 35]} />
      </mesh>
    </RigidBody>
  );
}

// ============================================================================
// COURSE WALLS — side barriers on BOTH sides of every segment
// Extended beyond each segment's Z bounds so they overlap and form a
// continuous wall from start to finish.
// ============================================================================
const WALL_HEIGHT = 0.5;
const WALL_THICK = 0.08;

function CourseWalls() {
  return (
    <>
      {SEGMENTS.map((seg, i) => {
        const hw = seg.size[0] / 2 + 0.05; // half-width + gap
        const depth = seg.size[2] + 0.5;   // extend beyond segment
        return (
          <group key={`walls-${i}`} position={seg.pos as any} rotation={seg.rot as any}>
            {/* LEFT wall */}
            <RigidBody type="fixed" colliders="cuboid" restitution={0.3} friction={0.02}>
              <mesh position={[-hw, WALL_HEIGHT / 2, 0]} visible={false}>
                <boxGeometry args={[WALL_THICK, WALL_HEIGHT, depth]} />
              </mesh>
            </RigidBody>
            {/* RIGHT wall */}
            <RigidBody type="fixed" colliders="cuboid" restitution={0.3} friction={0.02}>
              <mesh position={[hw, WALL_HEIGHT / 2, 0]} visible={false}>
                <boxGeometry args={[WALL_THICK, WALL_HEIGHT, depth]} />
              </mesh>
            </RigidBody>
          </group>
        );
      })}

      {/* END WALL — stops marbles rolling backwards off the start */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.2}>
        <mesh position={[0, 5.15, -13.8]} visible={false}>
          <boxGeometry args={[3.0, WALL_HEIGHT, WALL_THICK]} />
        </mesh>
      </RigidBody>
    </>
  );
}

// ============================================================================
// BOWL RINGS — decorative ring walls that sit ON TOP of the bowl surface
// These are obstacles, NOT the track surface.
// ============================================================================
function BowlRings() {
  const tiers = 8;
  const elements: React.ReactElement[] = [];
  for (let t = 0; t < tiers; t++) {
    const frac = t / tiers;
    const radius = 1.6 - frac * 1.3;
    const yPos = 0.9 - frac * 0.7;
    const count = Math.max(6, Math.floor(12 - frac * 5));
    for (let w = 0; w < count; w++) {
      const angle = (w / count) * Math.PI * 2 + t * 0.5;
      const r = radius * (0.85 + Math.sin(w * 1.3 + t) * 0.1);
      elements.push(
        <RigidBody key={`bowl-ring-${t}-${w}`} type="fixed" colliders="cuboid" restitution={0.35}>
          <mesh position={[Math.cos(angle) * r, yPos, Math.sin(angle) * r + 3]} visible={false}>
            <boxGeometry args={[0.08, 0.12, 0.08]} />
          </mesh>
        </RigidBody>
      );
    }
  }
  return <>{elements}</>;
}

// ============================================================================
// FUNNEL RINGS — descending rings on the funnel surface
// ============================================================================
function FunnelRings() {
  const levels = 4;
  const elements: React.ReactElement[] = [];
  for (let fi = 0; fi < levels; fi++) {
    const radius = 1.0 - fi * 0.25;
    const yPos = -0.2 - fi * 0.15;
    const count = 8 + fi * 2;
    for (let wi = 0; wi < count; wi++) {
      const angle = (wi / count) * Math.PI * 2 + fi * 0.6;
      const r = radius * (0.8 + Math.sin(wi * 1.1 + fi) * 0.15);
      elements.push(
        <RigidBody key={`funnel-ring-${fi}-${wi}`} type="fixed" colliders="cuboid" restitution={0.25}>
          <mesh position={[Math.cos(angle) * r, yPos, Math.sin(angle) * r + 5.5]} visible={false}>
            <boxGeometry args={[0.06, 0.08, 0.06]} />
          </mesh>
        </RigidBody>
      );
    }
  }
  return <>{elements}</>;
}

// ============================================================================
// BUMPERS — plastic dome bumpers on the track surface
// ============================================================================
const BUMPERS: [number, number, number][] = [
  [-0.6, 2.92, -5.5], [0.6, 2.92, -5.5],
  [-0.5, 2.12, -2.5], [0.5, 2.12, -2.5],
  [1.2, 2.02, -1.0], [0.4, 2.02, -0.5],
  [-0.5, 0.92, 2.5], [0.5, 0.92, 2.5],
  [-0.4, -0.18, 5.0], [0.4, -0.18, 5.0],
  [-0.5, 0.72, 7.5], [0.5, 0.72, 7.5],
  [-0.4, 0.52, 10.0], [0.4, 0.52, 10.0],
  [-0.5, 0.22, 12.5], [0.5, 0.22, 12.5],
];

function Bumpers() {
  return (
    <>
      {BUMPERS.map((pos, i) => (
        <RigidBody key={`bumper-${i}`} type="fixed" colliders="ball" restitution={0.55}>
          <mesh position={pos}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#ff6644" roughness={0.3} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

// ============================================================================
// FINISH LINE — sensors + color flags
// ============================================================================
const FINISH_POSITIONS = MARBLE_COLORS.map((_, i) => {
  const offset = (i - (MARBLE_COLORS.length - 1) / 2) * LANE_WIDTH * 0.8;
  return [offset, -0.05, 15.8] as [number, number, number];
});

function FinishLine() {
  return (
    <>
      {FINISH_POSITIONS.map((lp, i) => (
        <mesh key={`flag-${i}`} position={[lp[0], 0.05, lp[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.25, 0.12]} />
          <meshBasicMaterial color={MARBLE_COLOR_MAP[MARBLE_COLORS[i]]} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {FINISH_POSITIONS.map((lp, i) => (
        <RigidBody key={`sensor-${i}`} type="fixed" sensor colliders="cuboid">
          <mesh position={[lp[0], -0.02, lp[2]]} visible={false}>
            <boxGeometry args={[0.15, 0.2, 0.1]} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

// ============================================================================
// START GATE — kinematic bar that drops when race starts
// ============================================================================
function StartGate() {
  const ref = useRef<any>(null);
  const phase = useGameStore((s) => s.phase);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phase === 'racing') setOpen(true);
    if (phase === 'lobby') setOpen(false);
  }, [phase]);

  useFrame(() => {
    if (!ref.current) return;
    const targetY = open ? 4.4 : 5.1;
    const y = ref.current.translation().y;
    ref.current.setNextKinematicTranslation(new THREE.Vector3(0, y + (targetY - y) * 0.06, -10.3));
  });

  return (
    <group>
      <Text position={[0, 5.6, -13.5]} fontSize={0.35} color="#ffd700" anchorX="center" anchorY="middle">
        START
      </Text>
      <RigidBody ref={ref} type="kinematicPosition" position={[0, 5.1, -10.3]} restitution={0.1}>
        <mesh>
          <boxGeometry args={[2.4, 0.1, 0.06]} />
          <meshStandardMaterial color="#ff6644" emissive="#ff4400" emissiveIntensity={0.15} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// ============================================================================
// MAIN TRACK
// ============================================================================
export function Track() {
  return (
    <group>
      {/* SAFETY NET — invisible floor covering the entire course area */}
      <SafetyNet />

      {/* CONTINUOUS TRACK SURFACE — 11 overlapping boxes forming ONE surface */}
      {SEGMENTS.map((seg, i) => (
        <RigidBody key={`seg-${i}`} type="fixed" colliders="cuboid" friction={0} restitution={0.05}>
          <mesh position={seg.pos as any} rotation={seg.rot as any} receiveShadow>
            <boxGeometry args={seg.size as any} />
            <meshStandardMaterial color={seg.color} roughness={0.25} metalness={0.03} />
          </mesh>
        </RigidBody>
      ))}

      {/* COURSE WALLS — continuous side barriers */}
      <CourseWalls />

      {/* SURFACE OBSTACLES — sit on top of the track surface */}
      <Bumpers />
      <BowlRings />
      <FunnelRings />

      {/* START GATE */}
      <StartGate />

      {/* FINISH LINE */}
      <FinishLine />
    </group>
  );
}

// ============================================================================
// MARBLE
// ============================================================================
export function GameMarble({ color, index, active }: { color: string; index: number; active: boolean }) {
  const ref = useRef<any>(null);
  const hexColor = MARBLE_COLOR_MAP[color as keyof typeof MARBLE_COLOR_MAP] || '#888';
  const laneOffset = (index - (MARBLE_COLORS.length - 1) / 2) * LANE_WIDTH;

  if (!active) return null;

  return (
    <RigidBody
      ref={ref}
      position={[laneOffset, 5.08, -11.5]}
      colliders="ball"
      restitution={0.3}
      friction={0.1}
      linearDamping={0.02}
      angularDamping={0.02}
      name={`marble-${color}`}
      userData={{ name: `marble-${color}` }}
      canSleep={false}
    >
      <mesh castShadow>
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
      <mesh position={[0.06, 0.06, MARBLE_RADIUS * 0.85]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="white" transparent opacity={0.6} />
      </mesh>
    </RigidBody>
  );
}

export { MARBLE_RADIUS, LANE_WIDTH };
