-- owner, 2026-10-28: the owner renames catalog items (static or added ones); the app shows this name instead.
CREATE TABLE interest_names (
  item       INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
