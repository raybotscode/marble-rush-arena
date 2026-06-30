import { useState, useEffect } from 'react';
import { useGameStore, MARBLE_COLORS, MARBLE_COLOR_MAP } from '../store/gameStore';
import * as api from '../api';
import { Dashboard } from './Dashboard';
import { AdminPanel } from './AdminPanel';
import { TermsPage } from './TermsPage';
import { playCountdownBeep, playWin, playLose, toggleMute, isMuted } from '../hooks/useAudio';

type NavPage = 'lobby' | 'dashboard' | 'admin' | 'terms';

// ===== AUTH SCREEN =====
function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setUserId = useGameStore((s) => s.setUserId);
  const setCredits = useGameStore((s) => s.setCredits);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.login(email, password)
        : await api.signup(email, username, password);
      localStorage.setItem('mra_token', data.token);
      setUserId(data.id, data.username, (data as any).role);
      setCredits(data.credits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a14] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[rgba(16,16,32,0.95)] backdrop-blur-lg border border-white/10 p-6">
        <div className="w-10 h-10 rounded-full mx-auto mb-2" style={{
          background: 'radial-gradient(circle at 35% 35%, #fff, #ffd700 60%, #ff8833)',
        }} />
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: '#ffd700' }}>
          Marble Rush Arena
        </h1>
        <p className="text-[10px] text-center text-white/30 mb-6">
          Demo credits only. No real-money betting.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#ffd700]/50"
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
          />
          {mode === 'signup' && (
            <input
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#ffd700]/50"
              placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} required
            />
          )}
          <input
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#ffd700]/50"
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={4}
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ffd700, #ff8833)', color: '#0a0a14' }}
          >
            {loading ? '...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-4">
          {mode === 'login' ? "No account? " : 'Have an account? '}
          <button className="text-[#ffd700] underline font-medium"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ===== LOBBY =====
function LobbyContent() {
  const credits = useGameStore((s) => s.credits);
  const setPhase = useGameStore((s) => s.setPhase);
  const setRaceId = useGameStore((s) => s.setRaceId);
  const username = useGameStore((s) => s.username);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});
  const [totalPicks, setTotalPicks] = useState(0);

  // Poll for current race
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const race = await api.getCurrentRace();
        if (race.id) {
          setRaceId(race.id);
          setPickCounts(race.pick_counts || {});
          setTotalPicks(race.total_picks || 0);
          if (race.status === 'countdown') setPhase('countdown');
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [setPhase, setRaceId]);

  const handleJoin = () => {
    setPhase('countdown');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-[rgba(16,16,32,0.94)] backdrop-blur-lg border border-white/10 p-6">
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-full mx-auto mb-1" style={{
            background: 'radial-gradient(circle at 35% 35%, #fff, #ffd700 60%, #ff8833)',
          }} />
          <h1 className="text-xl font-bold" style={{ color: '#ffd700' }}>Marble Rush Arena</h1>
          <p className="text-xs text-white/40">{username ? 'Welcome, ' + username : ''}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl font-bold text-[#ffd700]">{credits}</span>
          <span className="text-xs text-white/40">demo credits</span>
        </div>

        {/* Pick counts */}
        {totalPicks > 0 && (
          <div className="bg-white/5 rounded-xl p-3 mb-3">
            <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">
              {totalPicks} player{totalPicks !== 1 ? 's' : ''} waiting
            </p>
            <div className="flex justify-center gap-2">
              {MARBLE_COLORS.map((c) => (
                <div key={c} className="flex flex-col items-center gap-0.5">
                  <div className="w-3 h-3 rounded-full" style={{
                    background: `radial-gradient(circle at 35% 35%, white, ${MARBLE_COLOR_MAP[c]} 60%)`,
                  }} />
                  <span className="text-[9px] text-white/40 font-mono">{pickCounts[c] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-xl p-3 mb-4">
          <p className="text-xs text-white/40 text-center leading-relaxed">
            Pick a marble before the race starts.<br />
            Win = earn demo credits.
          </p>
          <p className="text-[10px] text-white/20 text-center mt-2">
            Demo credits only. No real-money betting.
          </p>
        </div>

        <button onClick={handleJoin}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ffd700, #ff8833)',
            color: '#0a0a14',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
          }}
        >
          {totalPicks > 0 ? 'Race is Live — Join Now' : 'Start Playing'}
        </button>
      </div>
    </div>
  );
}

// ===== MARBLE SELECTOR =====
function MarbleSelector() {
  const selectedMarble = useGameStore((s) => s.selectedMarble);
  const selectMarble = useGameStore((s) => s.selectMarble);
  const countdown = useGameStore((s) => s.countdown);
  const phase = useGameStore((s) => s.phase);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});
  const [totalPicks, setTotalPicks] = useState(0);

  // Poll pick counts
  useEffect(() => {
    if (phase !== 'countdown') return;
    const interval = setInterval(async () => {
      try {
        const race = await api.getCurrentRace();
        setPickCounts(race.pick_counts || {});
        setTotalPicks(race.total_picks || 0);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase !== 'countdown') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-6 pt-2"
      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.95))' }}
    >
      <div className="max-w-md mx-auto px-4">
        {/* Pick counts */}
        {totalPicks > 0 && (
          <div className="flex justify-center gap-2 mb-2">
            {MARBLE_COLORS.map((c) => (
              <div key={c} className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full" style={{
                  background: `radial-gradient(circle at 35% 35%, white, ${MARBLE_COLOR_MAP[c]} 60%)`,
                }} />
                <span className="text-[8px] text-white/40 font-mono mt-0.5">{pickCounts[c] || 0}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-white/50 mb-2 font-medium">
          Pick your marble! Race in {countdown}s · {totalPicks} player{totalPicks !== 1 ? 's' : ''}
        </p>
        <div className="flex justify-center gap-3">
          {MARBLE_COLORS.map((color) => {
            const selected = selectedMarble === color;
            const hex = MARBLE_COLOR_MAP[color];
            return (
              <button key={color} onClick={() => selectMarble(color)}
                className={`relative w-14 h-14 rounded-full transition-all duration-200 active:scale-90 ${
                  selected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0a0a14]' : 'scale-100 opacity-60 hover:opacity-90'
                }`}
                style={{
                  background: `radial-gradient(circle at 35% 35%, white, ${hex} 60%, ${hex}cc)`,
                  boxShadow: selected ? `0 0 20px ${hex}66, inset 0 -3px 5px rgba(0,0,0,0.3)` : `inset 0 -3px 5px rgba(0,0,0,0.3)`,
                }}
              >
                {selected && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-[9px] text-black font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== RACE HUD =====
function RaceHUD() {
  const raceTime = useGameStore((s) => s.raceTime);
  const marbles = useGameStore((s) => s.marbles);
  const selectedMarble = useGameStore((s) => s.selectedMarble);
  const phase = useGameStore((s) => s.phase);

  if (phase !== 'racing') return null;

  const sorted = [...marbles].sort((a, b) => b.position - a.position);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-3">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-150"
              style={{ width: `${Math.min(raceTime / 90 * 100, 100)}%`, background: 'linear-gradient(90deg, #ffd700, #ff4444)' }} />
          </div>
          <span className="text-xs text-white/60 font-mono w-14 text-right">{raceTime.toFixed(1)}s</span>
        </div>

        {/* Top 3 leaderboard */}
        <div className="flex gap-2 justify-center">
          {sorted.slice(0, 3).map((m, i) => (
            <div key={m.color}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                m.color === selectedMarble ? 'ring-1 ring-white' : ''
              }`}
              style={{ backgroundColor: `${MARBLE_COLOR_MAP[m.color]}33`, color: MARBLE_COLOR_MAP[m.color] }}
            >
              <span>#{i + 1}</span>
              <span className="capitalize">{m.color}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== COUNTDOWN OVERLAY =====
function CountdownOverlay() {
  const countdown = useGameStore((s) => s.countdown);
  const phase = useGameStore((s) => s.phase);
  const [prevCountdown, setPrevCountdown] = useState(30);

  useEffect(() => {
    if (countdown < prevCountdown && countdown > 0) {
      playCountdownBeep(countdown <= 5);
    } else if (countdown === 0) {
      playCountdownBeep(true);
    }
    setPrevCountdown(countdown);
  }, [countdown, prevCountdown]);

  if (phase !== 'countdown') return null;

  const isUrgent = countdown <= 5;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-2">
          {countdown > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full animate-ping opacity-20"
              style={{ border: '3px solid ' + (isUrgent ? '#ff4444' : '#ffd700') }} />
          )}
          <span className="text-7xl font-black tabular-nums"
            style={{
              color: isUrgent ? '#ff4444' : '#ffd700',
              textShadow: `0 0 40px ${isUrgent ? '#ff444466' : '#ffd70066'}`,
            }}
          >
            {countdown > 0 ? String(countdown).padStart(2, '0') : 'GO!'}
          </span>
        </div>
        <p className="text-xs text-white/30">Pick your marble below</p>
      </div>
    </div>
  );
}

// ===== RESULTS SCREEN =====
function ResultsScreen() {
  const raceResult = useGameStore((s) => s.raceResult);
  const addCredits = useGameStore((s) => s.addCredits);
  const resetRace = useGameStore((s) => s.resetRace);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (raceResult) {
      if (raceResult.userWon) { playWin(); } else { playLose(); }
    }
  }, [raceResult]);

  if (!raceResult) return null;

  const hex = MARBLE_COLOR_MAP[raceResult.winner];
  const userHex = MARBLE_COLOR_MAP[raceResult.userMarble];

  const handleClaim = () => {
    if (!claimed && raceResult.userWon) {
      addCredits(10);
      setClaimed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-[fadeIn_0.3s_ease-out]">
      <div className="w-full max-w-sm rounded-2xl bg-[rgba(16,16,32,0.96)] backdrop-blur-lg border border-white/10 p-6 text-center">
        {/* Winner */}
        <div className="mb-3">
          <div className="w-16 h-16 rounded-full mx-auto mb-2 animate-bounce"
            style={{
              background: `radial-gradient(circle at 35% 35%, white, ${hex} 60%)`,
              boxShadow: `0 0 30px ${hex}66`,
            }} />
          <h2 className="text-lg font-bold capitalize" style={{ color: hex }}>
            {raceResult.winner} Wins!
          </h2>
        </div>

        {/* Result card */}
        <div className="bg-white/5 rounded-xl p-3 mb-3">
          <p className="text-xs text-white/40 mb-2">Your pick</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full" style={{
              background: `radial-gradient(circle at 35% 35%, white, ${userHex} 60%)`,
            }} />
            <span className="text-sm font-medium capitalize" style={{ color: userHex }}>
              {raceResult.userMarble}
            </span>
            {raceResult.userWon ? (
              <span className="text-green-400 text-sm font-bold ml-1">✓ WON</span>
            ) : (
              <span className="text-red-400 text-sm ml-1">✗ LOST</span>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Finish Order</p>
            {raceResult.finishOrder.map((c, i) => (
              <div key={c} className="flex items-center gap-2 justify-center text-xs">
                <span className="text-white/40 w-4">#{i + 1}</span>
                <div className="w-3 h-3 rounded-full" style={{
                  background: `radial-gradient(circle at 35% 35%, white, ${MARBLE_COLOR_MAP[c]} 60%)`,
                }} />
                <span className="capitalize" style={{ color: MARBLE_COLOR_MAP[c] }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credits */}
        <div className="mb-3">
          {raceResult.userWon ? (
            <p className="text-green-400 text-sm font-bold">
              {claimed ? '✓ Claimed! +10 credits' : 'You win +10 demo credits!'}
            </p>
          ) : (
            <p className="text-white/40 text-xs">Try again next race!</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {raceResult.userWon && !claimed && (
            <button onClick={handleClaim}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #44dd66, #22aa44)', color: 'white' }}>
              Claim Credits
            </button>
          )}
          <button onClick={resetRace}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 bg-white/10 text-white hover:bg-white/20">
            Next Race
          </button>
        </div>

        <p className="text-[10px] text-white/20 text-center mt-3">
          Demo credits only. No real-money betting.
        </p>
      </div>
    </div>
  );
}

// ===== BOTTOM NAV =====
function BottomNav({ currentPage, onNavigate, onLogout }:
  { currentPage: NavPage; onNavigate: (p: NavPage) => void; onLogout: () => void }) {
  const userRole = useGameStore((s) => (s as any).role);
  const [muted, setMuted] = useState(isMuted());

  const handleMute = () => {
    const m = toggleMute();
    setMuted(m);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-lg"
      style={{ background: 'rgba(10,10,20,0.95)' }}>
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button onClick={() => onNavigate('lobby')}
          className={'flex flex-col items-center py-2 px-3 text-[10px] ' + (currentPage === 'lobby' ? 'text-[#ffd700]' : 'text-white/40')}>
          <span className="text-base">🏁</span>
          <span>Race</span>
        </button>
        <button onClick={() => onNavigate('dashboard')}
          className={'flex flex-col items-center py-2 px-3 text-[10px] ' + (currentPage === 'dashboard' ? 'text-[#ffd700]' : 'text-white/40')}>
          <span className="text-base">📊</span>
          <span>Stats</span>
        </button>
        {userRole === 'admin' && (
          <button onClick={() => onNavigate('admin')}
            className={'flex flex-col items-center py-2 px-3 text-[10px] ' + (currentPage === 'admin' ? 'text-[#ffd700]' : 'text-white/40')}>
            <span className="text-base">⚙️</span>
            <span>Admin</span>
          </button>
        )}
        <button onClick={() => onNavigate('terms')}
          className={'flex flex-col items-center py-2 px-3 text-[10px] ' + (currentPage === 'terms' ? 'text-[#ffd700]' : 'text-white/40')}>
          <span className="text-base">📜</span>
          <span>Info</span>
        </button>
        <button onClick={handleMute}
          className="flex flex-col items-center py-2 px-3 text-[10px] text-white/40">
          <span className="text-base">{muted ? '🔇' : '🔊'}</span>
          <span>{muted ? 'Muted' : 'Sound'}</span>
        </button>
        <button onClick={onLogout}
          className="flex flex-col items-center py-2 px-3 text-[10px] text-white/40">
          <span className="text-base">🚪</span>
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}

// ===== MAIN UI ENTRY =====
export function GameUI() {
  const userId = useGameStore((s) => s.userId);
  const phase = useGameStore((s) => s.phase);
  const reset = useGameStore((s) => s.reset);
  const [page, setPage] = useState<NavPage>('lobby');

  if (!userId) return <AuthScreen />;

  // Only show navigation when in lobby phase (not during race)
  const showNav = phase === 'lobby';

  const handleLogout = () => {
    localStorage.removeItem('mra_token');
    reset();
  };

  return (
    <>
      {/* 3D scene is rendered by Scene.tsx behind this */}
      
      {/* Page content */}
      {page === 'lobby' && phase === 'lobby' && <LobbyContent />}
      {page === 'dashboard' && <Dashboard />}
      {page === 'admin' && <AdminPanel />}
      {page === 'terms' && <TermsPage />}

      {/* Race overlays (these show regardless of nav page) */}
      <CountdownOverlay />
      <MarbleSelector />
      <RaceHUD />
      <ResultsScreen />

      {/* Bottom Nav */}
      {showNav && (
        <BottomNav currentPage={page} onNavigate={setPage} onLogout={handleLogout} />
      )}
    </>
  );
}
