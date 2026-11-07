-- owner, 2026-11-07: «Отправить всем» may carry a photo (Telegram file_id, uploaded once from the owner panel)
ALTER TABLE outbox ADD COLUMN photo TEXT;
ALTER TABLE broadcasts ADD COLUMN photo TEXT;
