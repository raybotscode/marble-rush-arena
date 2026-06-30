import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useGameStore, MARBLE_COLORS, type MarbleColor } from '../store/gameStore';
import { updateMarblePosition as updateSharedPos, updateLeader as updateSharedLeader } from '../marbleTracking';

const COURSE_START_Z = -12;
const COURSE_FINISH_Z = 15;
const RACE_TIMEOUT = 90;
const COUNTDOWN_SECONDS = 3;

/** Deterministic shuffle — produces a different order per seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function RaceManager() {
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const setRaceTime = useGameStore((s) => s.setRaceTime);
  const updateMarblePosition = useGameStore((s) => s.updateMarblePosition);
  const setMarbleActualPos = useGameStore((s) => s.setMarbleActualPos);
  const setLeaderColor = useGameStore((s) => s.setLeaderColor);
  const setRaceResult = useGameStore((s) => s.setRaceResult);
  const selectedMarble = useGameStore((s) => s.selectedMarble);
  const setCountdown = useGameStore((s) => s.setCountdown);

  const { world } = useRapier();
  const raceTimeRef = useRef(0);
  const finishOrderRef = useRef<string[]>([]);
  const gateReleased = useRef(false);
  const impulseApplied = useRef(false);
  const marbleBodies = useRef<Map<string, any>>(new Map());
  const raceSeed = useRef(0);
  const isDisposed = useRef(false);

  // --- COUNTDOWN (3 seconds) ---
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownValue = useRef(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (phase === 'countdown' && !countdownInterval.current) {
      // Generate a unique random seed for THIS race
      raceSeed.current = Math.random() * 2147483647;
      countdownValue.current = COUNTDOWN_SECONDS;
      setCountdown(COUNTDOWN_SECONDS);
      gateReleased.current = false;
      impulseApplied.current = false;
      finishOrderRef.current = [];
      raceTimeRef.current = 0;
      marbleBodies.current.clear();
      isDisposed.current = false;

      countdownInterval.current = setInterval(() => {
        if (isDisposed.current) return;
        countdownValue.current -= 1;
        setCountdown(countdownValue.current);
        if (countdownValue.current <= 0) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
          countdownInterval.current = null;
          gateReleased.current = true;
          setPhase('racing');
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [phase, setCountdown, setPhase]);

  // --- FIND MARBLE BODIES (every frame until all found) ---
  // We do this from countdown onward so bodies are ready when racing starts
  useFrame(() => {
    if (phase !== 'countdown' && phase !== 'racing') return;
    if (isDisposed.current) return;
    if (marbleBodies.current.size >= MARBLE_COLORS.length) return;

    try {
      world.forEachRigidBody((body: any) => {
        const name = body.userData?.name;
        if (name && typeof name === 'string' && name.startsWith('marble-')) {
          const color = name.replace('marble-', '');
          if (!marbleBodies.current.has(color)) {
            marbleBodies.current.set(color, body);
          }
        }
      });
    } catch {}
  });

  // --- APPLY STARTING IMPULSES (randomized order, staggered) ---
  useEffect(() => {
    if (phase === 'racing' && gateReleased.current && !impulseApplied.current && world) {
      impulseApplied.current = true;

      // Shuffle marble launching order so blue doesn't always win
      const seed = raceSeed.current;
      const shuffled = seededShuffle(MARBLE_COLORS, seed);

      // Stagger launch: each marble fires with 30-120ms delay (random per marble)
      shuffled.forEach((color, idx) => {
        // Each marble gets its own unique sub-seed from the race seed
        const marbleSeed = ((seed * (idx + 1) * 7919) & 0x7fffffff) / 2147483647;
        const staggerMs = idx * 5 + Math.floor(marbleSeed * 20); // 5-25ms stagger
        
        setTimeout(() => {
          if (isDisposed.current) return;
          const body = marbleBodies.current.get(color);
          if (!body) return;

          // Equal push — enough momentum to carry through the whole course
          // Gravity + slopes maintain speed. Low damping keeps them rolling.
          const zImpulse = 0.1;                           // light push
          const xImpulse = 0.0;                           // dead straight start
          const yImpulse = 0.0;                           // gravity handles vertical

          body.applyImpulse(
            { x: xImpulse, y: yImpulse, z: zImpulse },
            true
          );
        }, staggerMs);
      });
    }
  }, [phase, world]);

  // --- FINISH RACE ---
  const doFinishRace = useRef(() => {});
  doFinishRace.current = () => {
    if (isDisposed.current) return;
    const fullOrder = [...finishOrderRef.current];
    for (const c of MARBLE_COLORS) {
      if (!fullOrder.includes(c)) fullOrder.push(c);
    }
    const winner = fullOrder[0] as MarbleColor;
    const userWon = selectedMarble === winner;

    setRaceResult({
      winner,
      finishOrder: fullOrder as MarbleColor[],
      userMarble: (selectedMarble || 'blue') as MarbleColor,
      userWon,
    });
  };

  // --- EVERY FRAME: track actual 3D positions ---
  useFrame((_state, delta) => {
    if (phase !== 'racing') return;
    if (isDisposed.current) return;

    const cappedDelta = Math.min(delta, 0.05);
    raceTimeRef.current += cappedDelta;
    setRaceTime(raceTimeRef.current);

    let bestZ = -Infinity;
    let bestColor: string | null = null;

    marbleBodies.current.forEach((body, color) => {
      try {
        const t = body.translation();
        if (!t) return;

        // Store actual 3D world position in the store AND shared ref
        setMarbleActualPos(color as MarbleColor, { x: t.x, y: t.y, z: t.z });
        updateSharedPos(color as MarbleColor, t.x, t.y, t.z);

        // Track leader based on actual Z position
        if (t.z > bestZ) {
          bestZ = t.z;
          bestColor = color;
        }

        // Progress based on Z along the course
        let progress = (t.z - COURSE_START_Z) / (COURSE_FINISH_Z - COURSE_START_Z);

        // Funnel area bonus: marbles that have dropped below the surface
        // in the center are making progress even if Z hasn't advanced much
        if (t.z > -4 && t.z < 8 && t.y < 1.5) {
          const funnelDepth = Math.max(0, 1.5 - t.y);
          const funnelBonus = funnelDepth * 0.15;
          const funnelZoneProgress = 0.25 + funnelBonus;
          progress = Math.max(progress, funnelZoneProgress);
        }

        // Also use y-position as progress indicator when falling
        if (t.y < 3.5 && t.z > -8 && t.z < 3) {
          // Marble has dropped below the high track — it's in the bowl/funnel zone
          progress = Math.max(progress, 0.3);
        }

        const clamped = Math.max(0.001, Math.min(0.999, progress));
        updateMarblePosition(color as MarbleColor, clamped);

        // Finish detection
        if (!finishOrderRef.current.includes(color) && t.z > 14.5) {
          finishOrderRef.current.push(color);
        }
      } catch {}
    });

    if (bestColor) {
      setLeaderColor(bestColor as MarbleColor);
      updateSharedLeader(bestColor as MarbleColor);
    }

    // End race
    const allFinished = finishOrderRef.current.length >= MARBLE_COLORS.length;
    const timeout = raceTimeRef.current > RACE_TIMEOUT;

    if (allFinished || timeout) {
      doFinishRace.current();
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDisposed.current = true;
    };
  }, []);

  // Reset on return to lobby
  useEffect(() => {
    if (phase === 'lobby') {
      gateReleased.current = false;
      impulseApplied.current = false;
      finishOrderRef.current = [];
      raceTimeRef.current = 0;
      marbleBodies.current.clear();
    }
  }, [phase]);

  return null;
}
