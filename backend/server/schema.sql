-- Robothon quiz module schema.
-- team_id and user_id are integration keys owned by the host application;
-- this migration intentionally does not create duplicate team/user tables.

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','READY','LIVE','PAUSED','ENDED','RESULTS','FINALIZED')),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  qualification_count INTEGER NOT NULL CHECK (qualification_count > 0),
  points_per_correct INTEGER NOT NULL,
  negative_marking INTEGER NOT NULL DEFAULT 0,
  negative_points INTEGER NOT NULL DEFAULT 0,
  allow_navigation INTEGER NOT NULL DEFAULT 1,
  show_live_scores INTEGER NOT NULL DEFAULT 1,
  leaderboard_mode TEXT NOT NULL DEFAULT 'LIVE_RANK',
  auto_submit_on_timeout INTEGER NOT NULL DEFAULT 1,
  one_attempt_per_team INTEGER NOT NULL DEFAULT 1,
  team_leader_only INTEGER NOT NULL DEFAULT 1,
  tie_breaker TEXT NOT NULL DEFAULT 'TIME_TAKEN',
  created_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  finalized_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  UNIQUE (quiz_id, order_index)
);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  option_text TEXT NOT NULL,
  option_key TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  UNIQUE (question_id, option_key)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id),
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  team_name TEXT,
  session_id TEXT,
  session_invalidated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('NOT_STARTED','ACTIVE','SUBMITTED','EVALUATED')),
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  score INTEGER,
  time_taken_seconds INTEGER,
  qualification_status TEXT CHECK (qualification_status IN ('PENDING','QUALIFIED','ELIMINATED')),
  UNIQUE (quiz_id, team_id)
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  selected_option TEXT NOT NULL,
  is_correct INTEGER,
  points_awarded INTEGER,
  answered_at TEXT NOT NULL,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS quiz_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id),
  team_id TEXT,
  attempt_id TEXT,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS quiz_attempts_leaderboard_idx
  ON quiz_attempts (quiz_id, status, score, time_taken_seconds);

CREATE INDEX IF NOT EXISTS quiz_events_quiz_idx
  ON quiz_events (quiz_id, timestamp);
