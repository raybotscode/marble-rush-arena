const API_BASE = import.meta.env.VITE_API_URL || 'https://marble-rush-arena-worker.raybotsemail.workers.dev/api';

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('mra_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error ' + res.status);
  }
  return res.json();
}

// ---- Auth ----
export function signup(email: string, username: string, password: string) {
  return fetchAPI('/auth/signup', { method: 'POST', body: JSON.stringify({ email, username, password }) });
}
export function login(email: string, password: string) {
  return fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function getProfile() { return fetchAPI('/user/profile'); }

// ---- Race ----
export function getCurrentRace() { return fetchAPI('/races/current'); }
export function pickMarble(raceId: string, marbleColor: string) {
  return fetchAPI('/races/pick', { method: 'POST', body: JSON.stringify({ raceId, marbleColor }) });
}
export function getRaceResult(raceId: string) { return fetchAPI('/races/' + raceId); }
export function claimWinnings(raceId: string) {
  return fetchAPI('/races/claim', { method: 'POST', body: JSON.stringify({ raceId }) });
}

// ---- Credits ----
export function getCredits() { return fetchAPI('/credits'); }
export function redeemCoupon(code: string) {
  return fetchAPI('/coupons/redeem', { method: 'POST', body: JSON.stringify({ code }) });
}

// ---- User ----
export function getRaceHistory() { return fetchAPI('/user/race-history'); }
export function getUserStats() { return fetchAPI('/user/stats'); }

// ---- Admin ----
export function getAdminSettings() { return fetchAPI('/admin/settings'); }
export function updateAdminSettings(settings: Record<string, string>) {
  return fetchAPI('/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
}
export function adminCreateCoupon(code: string, credits: number, maxUses?: number) {
  return fetchAPI('/admin/coupons', { method: 'POST', body: JSON.stringify({ code, credits, maxUses }) });
}
export function adminAddCredits(userId: string, amount: number, reason?: string) {
  return fetchAPI('/admin/add-credits', { method: 'POST', body: JSON.stringify({ userId, amount, reason }) });
}
export function adminListUsers() { return fetchAPI('/admin/users'); }
export function adminListRaces(page = 1) { return fetchAPI('/admin/races?page=' + page + '&limit=20'); }
export function adminStartRace() {
  return fetchAPI('/admin/start-race', { method: 'POST' });
}
export function adminSetRaceResult(raceId: string, winner: string, finishOrder: string[]) {
  return fetchAPI('/admin/set-race-result', { method: 'POST', body: JSON.stringify({ raceId, winner, finishOrder }) });
}
export function adminListPicks(raceId?: string) {
  const qs = raceId ? '?raceId=' + raceId : '';
  return fetchAPI('/admin/picks' + qs);
}

// ---- Misc ----
export function getDemoNotice() { return fetchAPI('/demo-notice'); }

// Types
export interface UserData {
  id: string; username: string; email: string; credits: number; role: string; token: string;
}
export interface RaceData {
  id: string; status: string; seed: number; marble_colors: string[];
  winner: string | null; finish_order: string[]; pick_counts: Record<string, number>;
  total_picks: number; countdown_started_at: string; race_started_at: string; finished_at: string;
}
