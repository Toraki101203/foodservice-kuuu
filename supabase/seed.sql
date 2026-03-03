
-- =====================
-- 0. RLSポリシーを修正（オーナーが自分の店舗を常に見られるようにする）
-- =====================
DROP POLICY IF EXISTS "shops_select" ON public.shops;
CREATE POLICY "shops_select" ON public.shops FOR SELECT USING (
  status = 'active' OR auth.uid() = owner_id
);

DROP POLICY IF EXISTS "shops_update" ON public.shops;
CREATE POLICY "shops_update" ON public.shops FOR UPDATE USING (
  auth.uid() = owner_id
);

-- =====================
-- 1. プロフィールを作成/更新
-- =====================
INSERT INTO public.profiles (id, display_name, role)
SELECT id, '管理者', 'admin' FROM auth.users WHERE email = 'admin@now-test.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = '管理者';

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'テスト店舗オーナー', 'shop_owner' FROM auth.users WHERE email = 'shop@now-test.com'
ON CONFLICT (id) DO UPDATE SET role = 'shop_owner', display_name = 'テスト店舗オーナー';

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'テストユーザー', 'user' FROM auth.users WHERE email = 'user@now-test.com'
ON CONFLICT (id) DO UPDATE SET role = 'user', display_name = 'テストユーザー';

-- =====================
-- 2. 既存テストデータをクリア（重複防止）
-- =====================
DELETE FROM public.reservations WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'user@now-test.com');
DELETE FROM public.posts WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'shop@now-test.com'));
DELETE FROM public.coupons WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'shop@now-test.com'));
DELETE FROM public.shops WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'shop@now-test.com');

-- =====================
-- 3. テスト店舗を作成
-- =====================
INSERT INTO public.shops (owner_id, name, genre, price_range, description, address, seat_count, has_private_room, business_hours, closed_days, phone, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'shop@now-test.com'),
  '博多もつ鍋 炎（ほのお）',
  '居酒屋・もつ鍋',
  '¥3,000〜¥5,000',
  '天神エリアで人気のもつ鍋専門店。国産牛もつを使った自慢のスープは3種類。〆のちゃんぽん麺が絶品です。',
  '福岡県福岡市中央区天神2-1-1',
  35,
  true,
  '17:00〜24:00（L.O. 23:00）',
  '日曜日',
  '092-123-4567',
  'active'
);

INSERT INTO public.shops (owner_id, name, genre, price_range, description, address, seat_count, has_private_room, business_hours, closed_days, phone, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'shop@now-test.com'),
  '天神やきとり しろ',
  '焼鳥・居酒屋',
  '¥2,000〜¥4,000',
  '備長炭で一本一本丁寧に焼き上げる本格焼鳥。名物の「白レバー」は必食。',
  '福岡県福岡市中央区天神3-5-10',
  20,
  false,
  '18:00〜翌1:00（L.O. 0:30）',
  '月曜日',
  '092-234-5678',
  'active'
);

-- =====================
-- 4. テストクーポン
-- =====================
INSERT INTO public.coupons (shop_id, title, description, valid_from, valid_until, is_active)
VALUES (
  (SELECT id FROM public.shops WHERE name = '博多もつ鍋 炎（ほのお）'),
  'NOWを見たで生ビール1杯無料！',
  '初回来店の方限定。お一人様1杯まで。',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  true
);

INSERT INTO public.coupons (shop_id, title, description, valid_from, valid_until, is_active)
VALUES (
  (SELECT id FROM public.shops WHERE name = '天神やきとり しろ'),
  'NOW限定！焼鳥5本盛り半額',
  'ご予約の方限定。他クーポンとの併用不可。',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days',
  true
);

-- =====================
-- 5. テスト投稿（今日の日付）
-- =====================
INSERT INTO public.posts (shop_id, image_url, caption, coupon_id, post_date)
VALUES (
  (SELECT id FROM public.shops WHERE name = '博多もつ鍋 炎（ほのお）'),
  'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
  '今夜は特製味噌もつ鍋が大好評！まだお席に余裕あります🔥 ご予約なしでもOKですが、お早めにどうぞ！',
  (SELECT id FROM public.coupons WHERE title = 'NOWを見たで生ビール1杯無料！'),
  CURRENT_DATE
);

INSERT INTO public.posts (shop_id, image_url, caption, post_date)
VALUES (
  (SELECT id FROM public.shops WHERE name = '天神やきとり しろ'),
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80',
  '本日入荷の朝引き鶏🐔 白レバー、ハツ、せせり…今夜も最高の状態でご提供します。',
  CURRENT_DATE
);

INSERT INTO public.posts (shop_id, image_url, caption, coupon_id, post_date)
VALUES (
  (SELECT id FROM public.shops WHERE name = '天神やきとり しろ'),
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  '週末限定メニュー「地鶏の炭火たたき」始めました🔥 NOW限定クーポンもお忘れなく！',
  (SELECT id FROM public.coupons WHERE title = 'NOW限定！焼鳥5本盛り半額'),
  CURRENT_DATE
);

-- =====================
-- 6. テスト予約
-- =====================
INSERT INTO public.reservations (user_id, shop_id, reservation_date, reservation_time, party_size, status, note)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'user@now-test.com'),
  (SELECT id FROM public.shops WHERE name = '博多もつ鍋 炎（ほのお）'),
  CURRENT_DATE,
  '19:00',
  4,
  'pending',
  'アレルギー：甲殻類'
);

INSERT INTO public.reservations (user_id, shop_id, reservation_date, reservation_time, party_size, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'user@now-test.com'),
  (SELECT id FROM public.shops WHERE name = '天神やきとり しろ'),
  CURRENT_DATE + INTERVAL '1 day',
  '20:00',
  2,
  'confirmed'
);

-- =====================
-- 確認用クエリ（実行結果で確認）
-- =====================
SELECT p.email, pr.display_name, pr.role
FROM auth.users p
JOIN public.profiles pr ON p.id = pr.id
WHERE p.email IN ('admin@now-test.com', 'shop@now-test.com', 'user@now-test.com');

SELECT s.name, s.status, s.owner_id, u.email AS owner_email
FROM public.shops s
JOIN auth.users u ON s.owner_id = u.id;
