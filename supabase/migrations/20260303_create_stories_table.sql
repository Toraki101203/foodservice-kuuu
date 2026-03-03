-- ============================================================
-- ストーリーテーブル（24時間限定の投稿）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stories_shop_id ON public.stories(shop_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_shop_expires ON public.stories(shop_id, expires_at DESC);

-- RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Shop owners can insert stories"
  ON public.stories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = stories.shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can delete own stories"
  ON public.stories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = stories.shop_id AND owner_id = auth.uid()
    )
  );

-- リアルタイム
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
