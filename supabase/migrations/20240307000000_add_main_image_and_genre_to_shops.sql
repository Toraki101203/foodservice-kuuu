-- 1. shops テーブルにメイン画像とジャンルカラムを追加
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS genre TEXT;

-- 2. 既存のレコードがある場合のために、デフォルト値などを設定する場合はここで行いますが、今回はNULL許容とします。
-- （メイン画像やジャンルは必須項目とするか要件次第ですが、後から設定可能にするためまずはNULL許容）
