import { create } from 'zustand';

export type GamePhase = 'lobby' | 'countdown' | 'racing' | 'results';
export type MarbleColor = 'blue' | 'cyan' | 'orange' | 'pink' | 'green' | 'gold';

export interface MarblePosition {
  color: MarbleColor;
  position: number; // 0-1 through the course
  finished: boolean;
  finishOrder: number;
}

export interface MarbleActualPos {
  x: number;
  y: number;
  z: number;
}

export interface RaceResult {
  winner: MarbleColor;
  finishOrder: MarbleColor[];
  userMarble: MarbleColor;
  userWon: boolean;
}

export interface GameState {
  // Auth
  userId: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  credits: number;
  
  // Race state
  phase: GamePhase;
  countdown: number; // seconds remaining
  raceTime: number; // elapsed race time
  marbles: MarblePosition[];
  selectedMarble: MarbleColor | null;
  raceResult: RaceResult | null;
  raceId: string | null;
  
  /** Actual 3D world positions of each marble (updated every physics frame) */
  marbleActualPositions: Record<MarbleColor, MarbleActualPos>;
  
  /** The color of the marble currently in the lead, determined by actual 3D position */
  leaderColor: MarbleColor | null;

  // Actions
  setUserId: (id: string, name: string, role?: string) => void;
  setCredits: (n: number) => void;
  addCredits: (n: number) => void;
  selectMarble: (color: MarbleColor) => void;
  setPhase: (phase: GamePhase) => void;
  setCountdown: (n: number) => void;
  setRaceTime: (n: number) => void;
  updateMarblePosition: (color: MarbleColor, pos: number, finished?: boolean) => void;
  /** Store the actual 3D world position of a marble (from Rapier physics body) */
  setMarbleActualPos: (color: MarbleColor, pos: MarbleActualPos) => void;
  setLeaderColor: (color: MarbleColor | null) => void;
  setRaceResult: (result: RaceResult) => void;
  setRaceId: (id: string) => void;
  resetRace: () => void;
  reset: () => void;
}

const MARBLE_INITIALS: MarblePosition[] = [
  { color: 'blue', position: 0, finished: false, finishOrder: 0 },
  { color: 'cyan', position: 0, finished: false, finishOrder: 0 },
  { color: 'orange', position: 0, finished: false, finishOrder: 0 },
  { color: 'pink', position: 0, finished: false, finishOrder: 0 },
  { color: 'green', position: 0, finished: false, finishOrder: 0 },
  { color: 'gold', position: 0, finished: false, finishOrder: 0 },
];

const INITIAL_ACTUAL_POS: Record<MarbleColor, MarbleActualPos> = {
  blue: { x: 0, y: 0, z: 0 },
  cyan: { x: 0, y: 0, z: 0 },
  orange: { x: 0, y: 0, z: 0 },
  pink: { x: 0, y: 0, z: 0 },
  green: { x: 0, y: 0, z: 0 },
  gold: { x: 0, y: 0, z: 0 },
};

export const MARBLE_COLORS: MarbleColor[] = ['blue', 'cyan', 'orange', 'pink', 'green', 'gold'];

export const MARBLE_COLOR_MAP: Record<MarbleColor, string> = {
  blue: '#4488ff',
  cyan: '#00ddff',
  orange: '#ff8833',
  pink: '#ff66aa',
  green: '#44dd66',
  gold: '#ffd700',
};

export const useGameStore = create<GameState>((set) => ({
  userId: null,
  username: null,
  email: null,
  role: null,
  credits: 0,
  phase: 'lobby',
  countdown: 3,
  raceTime: 0,
  marbles: MARBLE_INITIALS,
  selectedMarble: null,
  raceResult: null,
  raceId: null,
  marbleActualPositions: { ...INITIAL_ACTUAL_POS },
  leaderColor: null,

  setUserId: (id, name, role = 'user') => set({ userId: id, username: name, role }),
  setCredits: (n) => set({ credits: n }),
  addCredits: (n) => set((s) => ({ credits: s.credits + n })),
  selectMarble: (color) => set({ selectedMarble: color }),
  setPhase: (phase) => set({ phase }),
  setCountdown: (n) => set({ countdown: n }),
  setRaceTime: (t) => set({ raceTime: t }),
  updateMarblePosition: (color, pos, finished) =>
    set((s) => ({
      marbles: s.marbles.map((m) =>
        m.color === color
          ? { ...m, position: pos, finished: finished ?? m.finished }
          : m
      ),
    })),
  setMarbleActualPos: (color, pos) =>
    set((s) => ({
      marbleActualPositions: { ...s.marbleActualPositions, [color]: pos },
    })),
  setLeaderColor: (color) => set({ leaderColor: color }),
  setRaceResult: (result) => set({ raceResult: result, phase: 'results' }),
  setRaceId: (id) => set({ raceId: id }),
  resetRace: () =>
    set({
      phase: 'lobby',
      countdown: 3,
      raceTime: 0,
      marbles: MARBLE_INITIALS,
      selectedMarble: null,
      raceResult: null,
      raceId: null,
      marbleActualPositions: { ...INITIAL_ACTUAL_POS },
      leaderColor: null,
    }),
  reset: () =>
    set({
      userId: null,
      username: null,
      email: null,
      role: null,
      credits: 0,
      phase: 'lobby',
      countdown: 3,
      raceTime: 0,
      marbles: MARBLE_INITIALS,
      selectedMarble: null,
      raceResult: null,
      raceId: null,
      marbleActualPositions: { ...INITIAL_ACTUAL_POS },
      leaderColor: null,
    }),
}));
