import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment, ContactShadows } from '@react-three/drei';
import { Track, GameMarble } from './Track';
import { CameraController } from './CameraController';
import { RaceManager } from './RaceManager';
import { useGameStore, MARBLE_COLORS } from '../store/gameStore';

function SceneContent() {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[8, 12, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-4, 8, -2]}
        intensity={0.4}
        color="#4488ff"
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={0.6}
        color="#ffddaa"
      />

      {/* Environment reflections for glossy marbles */}
      <Environment preset="studio" />

      {/* Soft shadows */}
      <ContactShadows
        position={[0, -2.5, 2]}
        opacity={0.4}
        scale={20}
        blur={2.5}
        far={5}
      />

      {/* Physics world */}
      <Physics
        gravity={[0, -9.81, 0]}
        debug={false}
        updatePriority={-1}
      >
        <Track />

        {/* Marbles - Only active when in race to save physics perf */}
        {MARBLE_COLORS.map((color, i) => (
          <GameMarble
            key={color}
            color={color}
            index={i}
            active={phase !== 'lobby'}
          />
        ))}

        <RaceManager />
      </Physics>

      {/* Camera */}
      <CameraController />
    </>
  );
}

export function GameScene() {
  return (
    <Canvas
      shadows
      camera={{
        position: [0, 6, -2],
        fov: 50,
        near: 0.1,
        far: 50,
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
      }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
