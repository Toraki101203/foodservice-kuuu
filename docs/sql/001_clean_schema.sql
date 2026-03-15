-- ============================================================
-- Kuuu 統合スキーマ v2.0
-- 全テーブル・RLS・ストレージ・トリガーを1本で定義
--
-- 使い方:
--   1. Supabase SQL Editor で既存テーブルをすべて削除
--   2. このファイルの内容をコピペして Run
-- ============================================================

-- =========================
-- 1. Extensions
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- 2. Custom Types
-- =========================
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('general', 'restaurant_owner', 'partner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free', 'standard', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE seat_status_type AS ENUM ('available', 'busy', 'full', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'follow',
    'new_post',
    'new_instagram_post',
    'reservation_confirmed',
    'reservation_cancelled',
    'new_reservation',
    'favorite'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE analytics_event_type AS ENUM ('view', 'click', 'reserve', 'favorite', 'share', 'instagram_click');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =========================
-- 3. Tables
-- =========================

-- ----- profiles -----
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  user_type   user_type NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- shops -----
CREATE TABLE shops (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  address                 TEXT,
  latitude                DOUBLE PRECISION,
  longitude               DOUBLE PRECISION,
  phone                   TEXT,
  business_hours          JSONB,          -- { "mon": { "open": "11:00", "close": "22:00", "closed": false }, ... }
  genre                   TEXT,
  main_image              TEXT,
  plan_type               plan_type NOT NULL DEFAULT 'free',
  is_verified             BOOLEAN NOT NULL DEFAULT false,
  instagram_url           TEXT,
  instagram_username      TEXT,
  instagram_access_token  TEXT,
  instagram_token_expires_at TIMESTAMPTZ,
  instagram_user_id       TEXT,
  instagram_synced_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shops_owner    ON shops(owner_id);
CREATE INDEX idx_shops_location ON shops(latitude, longitude);
CREATE INDEX idx_shops_genre    ON shops(genre);

-- ----- seat_status -----
CREATE TABLE seat_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  status        seat_status_type NOT NULL DEFAULT 'closed',
  available_seats  INTEGER,
  wait_time_minutes INTEGER,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- follows -----
CREATE TABLE follows (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_follows_user ON follows(user_id);
CREATE INDEX idx_follows_shop ON follows(shop_id);

-- ----- favorites -----
CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_shop ON favorites(shop_id);

-- ----- reservations -----
CREATE TABLE reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  reservation_date TEXT NOT NULL,         -- 'YYYY-MM-DD'
  reservation_time TEXT NOT NULL,         -- 'HH:MM'
  party_size       INTEGER NOT NULL CHECK (party_size > 0),
  note             TEXT,
  status           reservation_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_shop ON reservations(shop_id);
CREATE INDEX idx_reservations_date ON reservations(shop_id, reservation_date);

-- ----- instagram_posts -----
CREATE TABLE instagram_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  instagram_post_id TEXT NOT NULL,
  image_url         TEXT,
  caption           TEXT,
  permalink         TEXT,
  posted_at         TIMESTAMPTZ,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, instagram_post_id)
);

CREATE INDEX idx_instagram_posts_shop ON instagram_posts(shop_id, posted_at DESC);

-- ----- instagram_stories -----
CREATE TABLE instagram_stories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  instagram_media_id  TEXT NOT NULL,
  media_url           TEXT NOT NULL,
  media_type          media_type NOT NULL DEFAULT 'IMAGE',
  timestamp           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, instagram_media_id)
);

CREATE INDEX idx_instagram_stories_shop    ON instagram_stories(shop_id);
CREATE INDEX idx_instagram_stories_expires ON instagram_stories(expires_at);

-- ----- subscriptions -----
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  status                  subscription_status NOT NULL DEFAULT 'incomplete',
  plan_type               plan_type NOT NULL DEFAULT 'free',
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ----- notifications -----
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ----- analytics_events -----
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type  analytics_event_type NOT NULL,
  user_id     UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_shop  ON analytics_events(shop_id, created_at DESC);
CREATE INDEX idx_analytics_type  ON analytics_events(event_type, created_at DESC);

-- ----- partners -----
CREATE TABLE partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- partner_referrals -----
CREATE TABLE partner_referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_type     plan_type,
  contracted_at TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);

-- ----- partner_payouts -----
CREATE TABLE partner_payouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       payout_status NOT NULL DEFAULT 'pending',
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================
-- 4. Trigger: 新規ユーザー → profiles 自動作成
-- =========================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'general')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =========================
-- 5. Trigger: updated_at 自動更新
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shops          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reservations   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON seat_status    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =========================
-- 6. Row Level Security
-- =========================

-- ----- profiles -----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ----- shops -----
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shops_select_all"    ON shops FOR SELECT USING (true);
CREATE POLICY "shops_insert_owner"  ON shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "shops_update_owner"  ON shops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "shops_delete_owner"  ON shops FOR DELETE USING (auth.uid() = owner_id);

-- ----- seat_status -----
ALTER TABLE seat_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat_status_select_all" ON seat_status FOR SELECT USING (true);
CREATE POLICY "seat_status_insert_owner" ON seat_status FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "seat_status_update_owner" ON seat_status FOR UPDATE
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()));

-- ----- follows -----
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_all"   ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own"   ON follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follows_delete_own"   ON follows FOR DELETE USING (auth.uid() = user_id);

-- ----- favorites -----
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select_own"  ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own"  ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own"  ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ----- reservations -----
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_select" ON reservations FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid())
  );
CREATE POLICY "reservations_insert_user" ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid())
  );

-- ----- instagram_posts -----
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instagram_posts_select_all" ON instagram_posts FOR SELECT USING (true);
CREATE POLICY "instagram_posts_manage_owner" ON instagram_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()));

-- ----- instagram_stories -----
ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instagram_stories_select_active" ON instagram_stories FOR SELECT
  USING (expires_at > now());

-- ----- subscriptions -----
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_owner" ON subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()));

-- ----- notifications -----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ----- analytics_events -----
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_select_owner" ON analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "analytics_insert_all" ON analytics_events FOR INSERT WITH CHECK (true);

-- ----- partners -----
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_select_own" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "partners_insert_own" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----- partner_referrals -----
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_referrals_select_own" ON partner_referrals FOR SELECT
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_id AND partners.user_id = auth.uid()));

-- ----- partner_payouts -----
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_payouts_select_own" ON partner_payouts FOR SELECT
  USING (EXISTS (SELECT 1 FROM partners WHERE partners.id = partner_id AND partners.user_id = auth.uid()));


-- =========================
-- 7. Realtime
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE seat_status;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE shops;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_posts;


-- =========================
-- 8. Storage Buckets
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-photos', 'shop-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- avatars policies（所有者制限: フォルダ名 = ユーザーID）
CREATE POLICY "avatars_select_all" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- shop-photos policies（所有者制限: フォルダ名 = ユーザーID）
CREATE POLICY "shop_photos_select_all" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-photos');
CREATE POLICY "shop_photos_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "shop_photos_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'shop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "shop_photos_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'shop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
