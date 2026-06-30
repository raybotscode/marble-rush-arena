import { useState, useEffect } from 'react';
import * as api from '../api';

export function AdminPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [tab, setTab] = useState<'settings' | 'coupons' | 'users' | 'races' | 'picks'>('settings');
  const [msg, setMsg] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponCredits, setCouponCredits] = useState('100');
  const [addUserId, setAddUserId] = useState('');
  const [addAmount, setAddAmount] = useState('50');
  const [picks, setPicks] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    try {
      if (tab === 'settings') {
        const s = await api.getAdminSettings();
        setSettings(s);
      } else if (tab === 'users') {
        const u = await api.adminListUsers();
        setUsers(u.users || []);
      } else if (tab === 'races') {
        const r = await api.adminListRaces();
        setRaces(r.races || []);
      } else if (tab === 'picks') {
        const p = await api.adminListPicks();
        setPicks(p.picks || []);
      }
    } catch (e: any) { setMsg(e.message); }
  }

  async function saveSettings() {
    try {
      await api.updateAdminSettings(settings);
      setMsg('Settings saved!');
    } catch (e: any) { setMsg(e.message); }
  }

  async function createCoupon() {
    if (!couponCode.trim()) return;
    try {
      await api.adminCreateCoupon(couponCode.trim().toUpperCase(), parseInt(couponCredits) || 100);
      setMsg('Coupon ' + couponCode.toUpperCase() + ' created!');
      setCouponCode('');
    } catch (e: any) { setMsg(e.message); }
  }

  async function doAddCredits() {
    if (!addUserId || !addAmount) return;
    try {
      await api.adminAddCredits(addUserId, parseInt(addAmount));
      setMsg('Added ' + addAmount + ' credits to user');
    } catch (e: any) { setMsg(e.message); }
  }

  async function doStartRace() {
    try {
      await api.adminStartRace();
      setMsg('New race started!');
    } catch (e: any) { setMsg(e.message); }
  }

  const tabs = [
    { id: 'settings' as const, label: 'Settings' },
    { id: 'coupons' as const, label: 'Coupons' },
    { id: 'users' as const, label: 'Users' },
    { id: 'races' as const, label: 'Races' },
    { id: 'picks' as const, label: 'Picks' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3">
      <h1 className="text-xl font-bold text-[#ffd700]">Admin Panel</h1>
      {msg && <p className="text-xs text-green-400 bg-green-400/10 rounded-lg p-2">{msg}</p>}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ' +
              (tab === t.id ? 'bg-[#ffd700] text-black' : 'bg-white/10 text-white/60')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-3">
          {Object.entries(settings).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <label className="text-xs text-white/60 w-40 capitalize">{k.replace(/_/g, ' ')}</label>
              <input
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs"
                value={v}
                onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
              />
            </div>
          ))}
          <button onClick={saveSettings} className="w-full py-2 rounded-xl text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            Save Settings
          </button>
          <button onClick={doStartRace} className="w-full py-2 rounded-xl text-xs font-semibold bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30">
            Start New Race Now
          </button>
        </div>
      )}

      {/* Coupons */}
      {tab === 'coupons' && (
        <div className="space-y-3">
          <p className="text-xs text-white/40">Create a new coupon code</p>
          <input placeholder="Code (e.g. FREERACE50)" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-xs uppercase" />
          <input type="number" placeholder="Credits" value={couponCredits} onChange={(e) => setCouponCredits(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-xs" />
          <button onClick={createCoupon} className="w-full py-2 rounded-xl text-xs font-semibold bg-[#ffd700] text-black">
            Create Coupon
          </button>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="User ID" value={addUserId} onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/30 text-xs" />
            <input type="number" placeholder="Amt" value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
              className="w-16 px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs" />
            <button onClick={doAddCredits} className="px-3 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-400">Add</button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {users.map((u: any) => (
              <div key={u.id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
                <span className="text-white/70">{u.username}</span>
                <span className="text-white/40">{u.email}</span>
                <span className="text-[#ffd700]">{u.credits}</span>
                <span className="text-white/30 text-[10px]">{u.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Races */}
      {tab === 'races' && (
        <div className="max-h-80 overflow-y-auto space-y-1">
          {races.map((r: any) => (
            <div key={r.id} className="text-xs py-1.5 border-b border-white/5">
              <div className="flex justify-between">
                <span className={'capitalize ' + (r.status === 'finished' ? 'text-white/40' : r.status === 'racing' ? 'text-green-400' : 'text-[#ffd700]')}>
                  {r.status}
                </span>
                <span className="text-white/30">#{r.seed}</span>
                <span className="text-white/20 text-[10px]">{r.created_at?.slice(0, 19)}</span>
              </div>
              {r.winning_marble && <p className="text-white/40 mt-1">Winner: {r.winning_marble} | Picks: {r.total_picks}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Picks */}
      {tab === 'picks' && (
        <div className="max-h-80 overflow-y-auto space-y-1">
          {picks.map((p: any) => (
            <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-white/5">
              <span className="text-white/60">{p.username}</span>
              <span className="capitalize text-white/80">{p.marble_color}</span>
              <span className={p.result === 'win' ? 'text-green-400' : p.result === 'lose' ? 'text-red-400' : 'text-white/30'}>
                {p.result || 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-white/20 text-center">Admin only. Be careful with settings.</p>
    </div>
  );
}
