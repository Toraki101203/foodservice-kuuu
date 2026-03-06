-- Instagram 自動連携: アクセストークン保存用カラム追加

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS instagram_user_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_synced_at TIMESTAMPTZ;
