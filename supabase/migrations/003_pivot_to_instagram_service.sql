-- ピボット: 飲食店SNS → Instagram連携集客サービス

-- A. user_type に partner を追加
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('general', 'restaurant_owner', 'partner'));

-- B. restaurants に Instagram カラム追加
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram_username TEXT;

-- C. SNS関連テーブル削除
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_images CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.shop_courses CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;

-- D. 新規テーブル: Instagram投稿キャッシュ
CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  instagram_post_id TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  permalink TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view instagram posts" ON public.instagram_posts FOR SELECT USING (true);
CREATE POLICY "Owners can manage instagram posts" ON public.instagram_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = instagram_posts.restaurant_id AND owner_id = auth.uid())
);

CREATE INDEX idx_instagram_posts_restaurant ON public.instagram_posts(restaurant_id);
CREATE INDEX idx_instagram_posts_posted_at ON public.instagram_posts(posted_at DESC);

-- E. 新規テーブル: 営業パートナー
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own data" ON public.partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners can insert own data" ON public.partners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- F. 新規テーブル: パートナー紹介実績
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  contracted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own referrals" ON public.partner_referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners WHERE id = partner_referrals.partner_id AND user_id = auth.uid())
);

CREATE INDEX idx_partner_referrals_partner ON public.partner_referrals(partner_id);

-- G. 新規テーブル: パートナー振込
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own payouts" ON public.partner_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners WHERE id = partner_payouts.partner_id AND user_id = auth.uid())
);

-- H. 新規テーブル: 集客分析イベント
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'reserve', 'favorite')),
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own analytics" ON public.analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = analytics_events.restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "System can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);

CREATE INDEX idx_analytics_events_restaurant ON public.analytics_events(restaurant_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type, created_at DESC);
