-- instagram_posts の外部キーを restaurants → shops に変更
-- 旧テーブル restaurants は使用されなくなったため、shops テーブルを参照するように修正

ALTER TABLE instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_restaurant_id_fkey;
ALTER TABLE instagram_posts
  ADD CONSTRAINT instagram_posts_restaurant_id_fkey
  FOREIGN KEY (restaurant_id) REFERENCES shops(id) ON DELETE CASCADE;
