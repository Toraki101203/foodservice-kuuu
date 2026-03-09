-- follows テーブル（ユーザー → 店舗のフォロー関係）
CREATE TABLE IF NOT EXISTS follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_follows_user_id ON follows(user_id);
CREATE INDEX idx_follows_shop_id ON follows(shop_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
    ON follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows"
    ON follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows"
    ON follows FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can count follows per shop"
    ON follows FOR SELECT USING (true);

-- instagram_stories テーブル（24時間限定コンテンツ）
CREATE TABLE IF NOT EXISTS instagram_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    instagram_media_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    timestamp TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, instagram_media_id)
);

CREATE INDEX idx_instagram_stories_shop_id ON instagram_stories(shop_id);
CREATE INDEX idx_instagram_stories_expires_at ON instagram_stories(expires_at);

ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired stories"
    ON instagram_stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Service role can manage stories"
    ON instagram_stories FOR ALL USING (true);
