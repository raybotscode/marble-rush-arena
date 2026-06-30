-- Marble Rush Arena — Expanded D1 Schema
-- Run: wrangler d1 execute marble-rush-arena --file=worker/schema.sql

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  credits INTEGER DEFAULT 100,
  role TEXT DEFAULT 'user', -- 'user' | 'admin'
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ===== ADMIN SETTINGS =====
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default admin settings
INSERT OR IGNORE INTO admin_settings (key, value) VALUES
  ('countdown_duration', '3'),
  ('race_reset_delay', '5'),
  ('win_multiplier', '1'),
  ('auto_racing_enabled', 'true'),
  ('race_duration_target', '75'),
  ('demo_mode', 'true');

-- ===== COURSES =====
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed a default course
INSERT OR IGNORE INTO courses (id, name, seed, active) VALUES
  ('course_snake_1', 'Snake Drop', 42069, 1);

-- ===== RACES =====
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  seed INTEGER NOT NULL,
  status TEXT DEFAULT 'countdown', -- 'countdown' | 'racing' | 'finished'
  countdown_started_at TEXT,
  race_started_at TEXT,
  finished_at TEXT,
  winning_marble TEXT, -- marble color
  finish_order TEXT, -- JSON array of marble colors in order
  total_picks INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_races_status ON races(status);
CREATE INDEX idx_races_created ON races(created_at DESC);

-- ===== PICKS =====
CREATE TABLE IF NOT EXISTS picks (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL REFERENCES races(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  marble_color TEXT NOT NULL, -- 'blue' | 'cyan' | 'orange' | 'pink' | 'green' | 'gold'
  stake_credits INTEGER DEFAULT 1,
  result TEXT, -- 'win' | 'lose' | 'pending'
  payout_credits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(race_id, user_id)
);

CREATE INDEX idx_picks_race ON picks(race_id);
CREATE INDEX idx_picks_user ON picks(user_id);
CREATE INDEX idx_picks_marble ON picks(marble_color);

-- ===== COUPON CODES =====
CREATE TABLE IF NOT EXISTS coupon_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed demo coupon (1000 credits for testing)
INSERT OR IGNORE INTO coupon_codes (id, code, credits, max_uses) VALUES
  ('demo_coupon', 'MARBLEDEMO1000', 1000, 1000);

-- ===== COUPON REDEMPTIONS =====
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupon_codes(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  redeemed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_user ON coupon_redemptions(user_id);

-- ===== CREDIT TRANSACTIONS =====
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'signup_bonus' | 'race_win' | 'race_lose' | 'coupon' | 'admin_adjustment'
  reference_id TEXT, -- race_id or coupon_id
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_transactions_created ON credit_transactions(created_at DESC);
