import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { useGameStore } from '../store/gameStore';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const credits = useGameStore((s) => s.credits);
  const setCredits = useGameStore((s) => s.setCredits);

  useEffect(() => {
    Promise.all([api.getUserStats(), api.getRaceHistory()])
      .then(([s, h]) => { setStats(s); setHistory(h.races || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCoupon = useCallback(async () => {
    if (!coupon.trim()) return;
    try {
      const data = await api.redeemCoupon(coupon.trim().toUpperCase());
      setCredits(data.credits);
      setCouponMsg('+' + data.added + ' credits!');
      setCoupon('');
    } catch (e: any) {
      setCouponMsg(e.message);
    }
  }, [coupon, setCredits]);

  if (loading) {
    return <div className="p-4 text-center text-white/40">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#ffd700]">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Credits</p>
          <p className="text-2xl font-bold text-[#ffd700]">{credits}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Races</p>
          <p className="text-2xl font-bold text-white">{stats?.total_races || 0}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Wins</p>
          <p className="text-2xl font-bold text-green-400">{stats?.wins || 0}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Losses</p>
          <p className="text-2xl font-bold text-red-400">{stats?.losses || 0}</p>
        </div>
      </div>

      {/* Coupon */}
      <div className="bg-white/5 rounded-xl p-3">
        <p className="text-xs text-white/40 mb-2">Redeem Coupon Code</p>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#ffd700]/50 uppercase"
            placeholder="CODE"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            maxLength={20}
          />
          <button onClick={handleCoupon} className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#ffd700] text-black">
            Redeem
          </button>
        </div>
        {couponMsg && <p className={`text-xs mt-1 ${couponMsg.includes('!') ? 'text-green-400' : 'text-red-400'}`}>{couponMsg}</p>}
      </div>

      {/* Race history */}
      <div className="bg-white/5 rounded-xl p-3">
        <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Race History</p>
        {history.length === 0 ? (
          <p className="text-xs text-white/20">No races yet</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <span className="capitalize text-white/60">{r.marble_color}</span>
                <span className={r.result === 'win' ? 'text-green-400' : r.result === 'lose' ? 'text-red-400' : 'text-white/30'}>
                  {r.result === 'win' ? 'WON +' + r.payout_credits : r.result === 'lose' ? 'LOST' : r.result}
                </span>
                <span className="text-white/20 text-[10px]">{r.winning_marble && 'Winner: ' + r.winning_marble}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-white/20 text-center">
        Demo credits only. No real-money betting.
      </p>
    </div>
  );
}
