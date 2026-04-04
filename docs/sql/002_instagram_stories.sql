-- Instagram ストーリー機能のマイグレーション
-- 実行: Supabase Dashboard → SQL Editor

-- 1. instagram_stories テーブル作成
CREATE TABLE IF NOT EXISTS public.instagram_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO')),
  timestamp TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 複合ユニーク制約（重複同期防止）
  UNIQUE (shop_id, instagram_media_id)
);

-- 2. インデックス
CREATE INDEX IF NOT EXISTS idx_instagram_stories_shop_expires
  ON public.instagram_stories (shop_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_stories_expires
  ON public.instagram_stories (expires_at);

-- 3. RLS 有効化
ALTER TABLE public.instagram_stories ENABLE ROW LEVEL SECURITY;

-- 4. RLS ポリシー: アクティブなストーリーは全ユーザーが閲覧可能
CREATE POLICY "アクティブなストーリーは誰でも閲覧可能"
  ON public.instagram_stories
  FOR SELECT
  USING (expires_at > NOW());

-- 5. shops テーブルに stories_synced_at カラム追加
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS stories_synced_at TIMESTAMPTZ;

-- 6. Storage バケットの確認（shop-photos バケットが既に存在する前提）
-- stories/ フォルダは自動的に作成される
