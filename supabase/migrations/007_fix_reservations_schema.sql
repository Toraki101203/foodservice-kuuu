-- 予約テーブルスキーマ統一: shop_id + reservation_date + reservation_time に移行
-- course_id 削除、通知タイプ拡張

-- A. 予約テーブルに新カラム追加
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reservation_date TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reservation_time TEXT;

-- B. restaurant_id が存在する場合のみマイグレーション
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'restaurant_id'
  ) THEN
    UPDATE public.reservations SET shop_id = restaurant_id WHERE shop_id IS NULL AND restaurant_id IS NOT NULL;
    ALTER TABLE public.reservations ALTER COLUMN restaurant_id DROP NOT NULL;
  END IF;
END $$;

-- D. course_id 削除
ALTER TABLE public.reservations DROP COLUMN IF EXISTS course_id;

-- E. 通知タイプに new_reservation を追加
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'reservation_confirmed', 'reservation_cancelled', 'new_post', 'new_instagram_post', 'new_reservation'));

-- F. shop_id でのインデックス追加
CREATE INDEX IF NOT EXISTS idx_reservations_shop_id ON public.reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(reservation_date);

-- G. RLS ポリシー更新（shop_id を使用）
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.shops WHERE id = reservations.shop_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Owners can update reservations" ON public.reservations;
CREATE POLICY "Owners can update reservations" ON public.reservations FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.shops WHERE id = reservations.shop_id AND owner_id = auth.uid())
);

-- H. seat_status の RLS ポリシー修正（restaurants → shops）
DROP POLICY IF EXISTS "Restaurant owners can update seat status" ON public.seat_status;
CREATE POLICY "Restaurant owners can update seat status" ON public.seat_status FOR ALL USING (
  EXISTS (SELECT 1 FROM public.shops WHERE id = seat_status.restaurant_id AND owner_id = auth.uid())
);

-- I. seat_status の外部キー制約を restaurants → shops に修正
ALTER TABLE public.seat_status DROP CONSTRAINT IF EXISTS seat_status_restaurant_id_fkey;
ALTER TABLE public.seat_status
  ADD CONSTRAINT seat_status_restaurant_id_fkey
  FOREIGN KEY (restaurant_id) REFERENCES public.shops(id) ON DELETE CASCADE;
