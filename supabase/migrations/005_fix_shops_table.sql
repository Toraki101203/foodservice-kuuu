-- shops テーブルに不足カラムを追加
-- Instagram連携用
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_username TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_access_token TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMPTZ;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_synced_at TIMESTAMPTZ;

-- プラン・ステータス用
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- RLS: INSERT ポリシー追加（オーナーが自分の店舗を作成可能）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shops' AND policyname = 'shops_insert'
  ) THEN
    CREATE POLICY "shops_insert" ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- テストアカウントをプレミアムプランに更新
UPDATE public.shops
SET plan_type = 'premium'
WHERE owner_id = '1a698a55-eeca-4237-a12a-a105c31383ed';
