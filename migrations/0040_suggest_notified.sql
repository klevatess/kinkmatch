-- owner, 2026-10-28: the author gets a bot message when their suggestion is accepted (added or made a synonym).
-- Existing accepted rows start at 0, so the ones accepted before this version are told too.
ALTER TABLE interest_suggestions ADD COLUMN notified INTEGER NOT NULL DEFAULT 0;
