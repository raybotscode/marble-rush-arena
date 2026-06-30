export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
}

// ---- Helpers ----
function generateId(): string {
  return crypto.randomUUID();
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + 'mra-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(userId: string, username: string, role: string, secret: string): string {
  const payload = { userId, username, role, iat: Date.now() };
  return btoa(JSON.stringify(payload)) + '.' + btoa(secret);
}

function verifyToken(token: string, secret: string): { userId: string; username: string; role: string } | null {
  try {
    const [payloadB64, sigB64] = token.split('.');
    const decoded = JSON.parse(atob(payloadB64));
    if (sigB64 !== btoa(secret)) return null;
    return decoded;
  } catch { return null; }
}

// ---- Validation ----
function json(resp: unknown, status = 200) {
  return new Response(JSON.stringify(resp), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

function error(msg: string, status = 400) { return json({ error: msg }, status); }

const MARBLE_COLORS = ['blue', 'cyan', 'orange', 'pink', 'green', 'gold'];

// ---- Auth ----
async function requireAuth(request: Request, env: Env): Promise<{ userId: string; username: string; role: string } | Response> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return error('Unauthorized', 401) as Response;
  const user = verifyToken(auth.slice(7), env.JWT_SECRET);
  if (!user) return error('Invalid token', 401) as Response;
  return user;
}

async function requireAdmin(request: Request, env: Env): Promise<{ userId: string; username: string } | Response> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return error('Unauthorized', 401) as Response;
  const user = verifyToken(auth.slice(7), env.JWT_SECRET);
  if (!user || user.role !== 'admin') return error('Forbidden', 403) as Response;
  return user;
}

// ---- Race state machine helpers ----
async function ensureCurrentRace(db: D1Database): Promise<any> {
  // Find active race or create one
  let race = await db.prepare(
    "SELECT * FROM races WHERE status IN ('countdown','racing') ORDER BY created_at DESC LIMIT 1"
  ).first() as any;

  if (!race) {
    const course = await db.prepare("SELECT * FROM courses WHERE active = 1 LIMIT 1").first() as any;
    const id = generateId();
    const seed = Math.floor(Math.random() * 100000);
    await db.prepare(
      "INSERT INTO races (id, course_id, seed, status, countdown_started_at) VALUES (?, ?, ?, 'countdown', datetime('now'))"
    ).bind(id, course?.id || 'course_snake_1', seed).run();
    race = await db.prepare("SELECT * FROM races WHERE id = ?").bind(id).first() as any;
  }

  return race;
}

// ---- Router ----
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }

    try {
      // ==================== AUTH ====================
      if (url.pathname === '/api/auth/signup' && request.method === 'POST') {
        const { email, username, password } = await request.json() as any;
        if (!email || !username || !password || password.length < 4) {
          return error('Email, username, and password (4+ chars) required');
        }

        const existing = await env.DB.prepare(
          'SELECT id FROM users WHERE email = ? OR username = ?'
        ).bind(email, username).first();
        if (existing) return error('Email or username already taken', 409);

        const id = generateId();
        const hash = await hashPassword(password);
        await env.DB.prepare(
          'INSERT INTO users (id, email, username, password_hash, credits, role) VALUES (?, ?, ?, ?, 100, ?)'
        ).bind(id, email, username, hash, email === env.ADMIN_EMAIL ? 'admin' : 'user').run();

        // Signup bonus transaction
        await env.DB.prepare(
          "INSERT INTO credit_transactions (id, user_id, amount, type, description) VALUES (?, ?, 100, 'signup_bonus', 'Welcome credits')"
        ).bind(generateId(), id).run();

        const token = generateToken(id, username, email === env.ADMIN_EMAIL ? 'admin' : 'user', env.JWT_SECRET);
        return json({ id, username, email, credits: 100, role: email === env.ADMIN_EMAIL ? 'admin' : 'user', token });
      }

      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        const { email, password } = await request.json() as any;
        if (!email || !password) return error('Email and password required');

        const user = await env.DB.prepare(
          'SELECT id, username, email, password_hash, credits, role FROM users WHERE email = ?'
        ).bind(email).first() as any;
        if (!user) return error('Invalid credentials', 401);

        const hash = await hashPassword(password);
        if (hash !== user.password_hash) return error('Invalid credentials', 401);

        await env.DB.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').bind(user.id).run();
        const token = generateToken(user.id, user.username, user.role, env.JWT_SECRET);
        return json({ id: user.id, username: user.username, email: user.email, credits: user.credits, role: user.role, token });
      }

      // ==================== USER DATA ====================
      if (url.pathname === '/api/user/profile' && request.method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const user = await env.DB.prepare(
          'SELECT id, username, email, credits, role, created_at, last_login_at FROM users WHERE id = ?'
        ).bind(auth.userId).first() as any;
        if (!user) return error('User not found', 404);

        return json(user);
      }

      // ==================== CREDITS ====================
      if (url.pathname === '/api/credits' && request.method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;
        const user = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(auth.userId).first() as any;
        return json({ credits: user?.credits || 0 });
      }

      // ==================== RACE HISTORY ====================
      if (url.pathname === '/api/user/race-history' && request.method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const { results } = await env.DB.prepare(`
          SELECT p.marble_color, p.result, p.payout_credits, p.stake_credits,
                 r.id as race_id, r.winning_marble, r.status, r.created_at as race_date
          FROM picks p JOIN races r ON p.race_id = r.id
          WHERE p.user_id = ?
          ORDER BY r.created_at DESC LIMIT 50
        `).bind(auth.userId).all();

        return json({ races: results });
      }

      // ==================== USER STATS ====================
      if (url.pathname === '/api/user/stats' && request.method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const stats = await env.DB.prepare(`
          SELECT
            COUNT(*) as total_races,
            SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses,
            COALESCE(SUM(payout_credits), 0) as total_winnings
          FROM picks WHERE user_id = ?
        `).bind(auth.userId).first() as any;

        const credits = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(auth.userId).first() as any;

        return json({ ...stats, credits: credits?.credits || 0 });
      }

      // ==================== CURRENT RACE ====================
      if (url.pathname === '/api/races/current' && request.method === 'GET') {
        const race = await ensureCurrentRace(env.DB);

        // Get pick counts per marble for this race
        const { results: pickCounts } = await env.DB.prepare(`
          SELECT marble_color, COUNT(*) as count FROM picks WHERE race_id = ? GROUP BY marble_color
        `).bind(race.id).all();

        const pickMap: Record<string, number> = {};
        for (const pc of pickCounts as any[]) {
          pickMap[pc.marble_color] = pc.count;
        }

        return json({
          id: race.id,
          status: race.status,
          countdown_started_at: race.countdown_started_at,
          race_started_at: race.race_started_at,
          finished_at: race.finished_at,
          seed: race.seed,
          course_id: race.course_id,
          marble_colors: MARBLE_COLORS,
          winner: race.winning_marble,
          finish_order: race.finish_order ? JSON.parse(race.finish_order) : [],
          pick_counts: pickMap,
          total_picks: race.total_picks || 0,
        });
      }

      // ==================== PICK MARBLE ====================
      if (url.pathname === '/api/races/pick' && request.method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const { raceId, marbleColor } = await request.json() as any;
        if (!raceId || !marbleColor || !MARBLE_COLORS.includes(marbleColor)) {
          return error('Invalid pick');
        }

        const race = await env.DB.prepare('SELECT * FROM races WHERE id = ?').bind(raceId).first() as any;
        if (!race) return error('Race not found', 404);
        if (race.status !== 'countdown') return error('Race is not in pick phase');

        const existing = await env.DB.prepare(
          'SELECT id FROM picks WHERE race_id = ? AND user_id = ?'
        ).bind(raceId, auth.userId).first();

        if (existing) {
          // Update existing pick
          await env.DB.prepare(
            'UPDATE picks SET marble_color = ? WHERE race_id = ? AND user_id = ?'
          ).bind(marbleColor, raceId, auth.userId).run();
        } else {
          const pickId = generateId();
          await env.DB.prepare(
            'INSERT INTO picks (id, race_id, user_id, marble_color, stake_credits, result) VALUES (?, ?, ?, ?, 1, ?)'
          ).bind(pickId, raceId, auth.userId, marbleColor, 'pending').run();

          await env.DB.prepare(
            'UPDATE races SET total_picks = total_picks + 1 WHERE id = ?'
          ).bind(raceId).run();

          // Deduct 1 credit stake
          await env.DB.prepare(
            'UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1'
          ).bind(auth.userId).run();
        }

        return json({ success: true });
      }

      // ==================== RACE DETAIL ====================
      if (url.pathname.match(/^\/api\/races\/(.+)$/) && request.method === 'GET') {
        const raceId = url.pathname.match(/^\/api\/races\/(.+)$/)![1];
        const race = await env.DB.prepare('SELECT * FROM races WHERE id = ?').bind(raceId).first() as any;
        if (!race) return error('Race not found', 404);

        const { results: pickCounts } = await env.DB.prepare(
          'SELECT marble_color, COUNT(*) as count FROM picks WHERE race_id = ? GROUP BY marble_color'
        ).bind(raceId).all();

        const pickMap: Record<string, number> = {};
        for (const pc of pickCounts as any[]) {
          pickMap[pc.marble_color] = pc.count;
        }

        return json({
          id: race.id,
          status: race.status,
          seed: race.seed,
          winner: race.winning_marble,
          finish_order: race.finish_order ? JSON.parse(race.finish_order) : [],
          marble_colors: MARBLE_COLORS,
          pick_counts: pickMap,
          total_picks: race.total_picks,
          race_started_at: race.race_started_at,
          finished_at: race.finished_at,
        });
      }

      // ==================== CLAIM WINNINGS ====================
      if (url.pathname === '/api/races/claim' && request.method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const { raceId } = await request.json() as any;
        const race = await env.DB.prepare('SELECT * FROM races WHERE id = ?').bind(raceId).first() as any;
        if (!race || race.status !== 'finished') return error('Race not finished');

        const pick = await env.DB.prepare(
          'SELECT * FROM picks WHERE race_id = ? AND user_id = ?'
        ).bind(raceId, auth.userId).first() as any;
        if (!pick) return error('No pick for this race');
        if (pick.result !== 'pending') return json({ credits: 0, won: 0, already_claimed: true });

        const settings = await getSettings(env.DB);
        const multiplier = parseInt(settings.win_multiplier || '1');
        const won = pick.marble_color === race.winning_marble;
        const payout = won ? pick.stake_credits * multiplier : 0;

        await env.DB.prepare(
          'UPDATE picks SET result = ?, payout_credits = ? WHERE id = ?'
        ).bind(won ? 'win' : 'lose', payout, pick.id).run();

        if (won && payout > 0) {
          await env.DB.prepare(
            'UPDATE users SET credits = credits + ? WHERE id = ?'
          ).bind(payout, auth.userId).run();

          await env.DB.prepare(
            "INSERT INTO credit_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'race_win', ?, 'Race win payout')"
          ).bind(generateId(), auth.userId, payout, raceId).run();
        }

        const user = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(auth.userId).first() as any;
        return json({ credits: user.credits, won: won ? payout : 0 });
      }

      // ==================== COUPONS ====================
      if (url.pathname === '/api/coupons/redeem' && request.method === 'POST') {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;

        const { code } = await request.json() as any;
        if (!code) return error('Missing coupon code');

        const coupon = await env.DB.prepare(
          'SELECT * FROM coupon_codes WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > datetime(\'now\')) AND used_count < max_uses'
        ).bind(code.toUpperCase()).first() as any;

        if (!coupon) return error('Invalid or expired coupon', 400);

        // Check if already redeemed by this user
        const alreadyUsed = await env.DB.prepare(
          'SELECT id FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?'
        ).bind(coupon.id, auth.userId).first();

        if (alreadyUsed) return error('Coupon already redeemed');

        await env.DB.prepare('UPDATE coupon_codes SET used_count = used_count + 1 WHERE id = ?').bind(coupon.id).run();
        await env.DB.prepare(
          'INSERT INTO coupon_redemptions (id, coupon_id, user_id) VALUES (?, ?, ?)'
        ).bind(generateId(), coupon.id, auth.userId).run();

        await env.DB.prepare(
          'UPDATE users SET credits = credits + ? WHERE id = ?'
        ).bind(coupon.credits, auth.userId).run();

        await env.DB.prepare(
          "INSERT INTO credit_transactions (id, user_id, amount, type, reference_id, description) VALUES (?, ?, ?, 'coupon', ?, 'Coupon redemption')"
        ).bind(generateId(), auth.userId, coupon.credits, coupon.id).run();

        const user = await env.DB.prepare('SELECT credits FROM users WHERE id = ?').bind(auth.userId).first() as any;
        return json({ credits: user.credits, added: coupon.credits });
      }

      // ==================== ADMIN: GET SETTINGS ====================
      if (url.pathname === '/api/admin/settings' && request.method === 'GET') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;
        return json(await getSettings(env.DB));
      }

      // ==================== ADMIN: UPDATE SETTINGS ====================
      if (url.pathname === '/api/admin/settings' && request.method === 'POST') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;
        const body = await request.json() as any;
        for (const [k, v] of Object.entries(body)) {
          await env.DB.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').bind(k, String(v)).run();
        }
        return json(await getSettings(env.DB));
      }

      // ==================== ADMIN: CREATE COUPON ====================
      if (url.pathname === '/api/admin/coupons' && request.method === 'POST') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;
        const { code, credits, maxUses, expiresAt } = await request.json() as any;
        if (!code || !credits) return error('Code and credits required');
        await env.DB.prepare(
          'INSERT INTO coupon_codes (id, code, credits, max_uses, expires_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(generateId(), code.toUpperCase(), credits, maxUses || 1, expiresAt || null).run();
        return json({ success: true, code: code.toUpperCase() });
      }

      // ==================== ADMIN: ADD CREDITS ====================
      if (url.pathname === '/api/admin/add-credits' && request.method === 'POST') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;
        const { userId, amount, reason } = await request.json() as any;
        if (!userId || !amount) return error('userId and amount required');
        await env.DB.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(amount, userId).run();
        await env.DB.prepare(
          "INSERT INTO credit_transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, 'admin_adjustment', ?)"
        ).bind(generateId(), userId, amount, reason || 'Admin adjustment').run();
        return json({ success: true });
      }

      // ==================== ADMIN: LIST USERS ====================
      if (url.pathname === '/api/admin/users' && request.method === 'GET') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;
        const { results } = await env.DB.prepare(
          'SELECT id, username, email, credits, role, created_at, last_login_at FROM users ORDER BY created_at DESC'
        ).all();
        return json({ users: results });
      }

      // ==================== ADMIN: LIST RACES ====================
      if (url.pathname === '/api/admin/races' && request.method === 'GET') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;

        const urlParams = new URL(request.url).searchParams;
        const page = parseInt(urlParams.get('page') || '1');
        const limit = parseInt(urlParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const { results } = await env.DB.prepare(
          'SELECT * FROM races ORDER BY created_at DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();

        const { results: total } = await env.DB.prepare('SELECT COUNT(*) as count FROM races').all() as any;

        return json({ races: results, total: total[0]?.count || 0, page, limit });
      }

      // ==================== ADMIN: MANUAL RACE START ====================
      if (url.pathname === '/api/admin/start-race' && request.method === 'POST') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;

        // Finish any running race
        await env.DB.prepare(
          "UPDATE races SET status = 'finished', finished_at = datetime('now') WHERE status IN ('countdown','racing')"
        ).run();

        const course = await env.DB.prepare("SELECT * FROM courses WHERE active = 1 LIMIT 1").first() as any;
        const id = generateId();
        const seed = Math.floor(Math.random() * 100000);
        await env.DB.prepare(
          "INSERT INTO races (id, course_id, seed, status, countdown_started_at) VALUES (?, ?, ?, 'countdown', datetime('now'))"
        ).bind(id, course?.id || 'course_snake_1', seed).run();

        return json({ success: true, raceId: id });
      }

      // ==================== ADMIN: RACE RESULT (set winner) ====================
      if (url.pathname === '/api/admin/set-race-result' && request.method === 'POST') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;

        const { raceId, winner, finishOrder } = await request.json() as any;
        if (!raceId || !winner) return error('raceId and winner required');

        await env.DB.prepare(
          "UPDATE races SET status = 'finished', winning_marble = ?, finish_order = ?, finished_at = datetime('now') WHERE id = ?"
        ).bind(winner, JSON.stringify(finishOrder || []), raceId).run();

        return json({ success: true });
      }

      // ==================== ADMIN: GET PICKS ====================
      if (url.pathname === '/api/admin/picks' && request.method === 'GET') {
        const auth = await requireAdmin(request, env);
        if (auth instanceof Response) return auth;

        const raceId = url.searchParams.get('raceId');
        let query = 'SELECT p.*, u.username FROM picks p JOIN users u ON p.user_id = u.id';
        const params: string[] = [];

        if (raceId) {
          query += ' WHERE p.race_id = ?';
          params.push(raceId);
        }
        query += ' ORDER BY p.created_at DESC LIMIT 100';

        const { results } = await env.DB.prepare(query).bind(...params).all();
        return json({ picks: results });
      }

      // ==================== DEMO MODE NOTICE ====================
      if (url.pathname === '/api/demo-notice' && request.method === 'GET') {
        return json({
          demo_mode: true,
          message: 'Demo credits only. No real-money betting, deposits, withdrawals, or prizes. Results are for entertainment purposes only.',
        });
      }

      return error('Not found', 404);
    } catch (err: any) {
      return error(err.message || 'Internal error', 500);
    }
  },
};

async function getSettings(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT key, value FROM admin_settings').all() as any;
  const settings: Record<string, string> = {};
  for (const r of results) settings[r.key] = r.value;
  return settings;
}
