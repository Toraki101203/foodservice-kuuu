-- ==============================================
-- 002_add_shop_courses.sql
-- 店舗のコース予約機能追加のためのテーブル作成とカラム変更
-- ==============================================

-- 店舗ごとのコーステーブル
create table if not exists public.shop_courses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- reservationsテーブルにcourse_idを追加 (null許容 = 席のみ予約)
alter table public.reservations
add column if not exists course_id uuid references public.shop_courses(id) on delete set null;

-- インデックス
create index if not exists idx_shop_courses_shop_id on public.shop_courses(shop_id);

-- ==============================================
-- RLS（Row Level Security）
-- ==============================================
alter table public.shop_courses enable row level security;

-- shop_courses: 全員が閲覧可能、オーナーが自店舗のコースのみ操作可能
create policy "shop_courses_select" on public.shop_courses for select using (true);

create policy "shop_courses_insert" on public.shop_courses for insert with check (
  exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
);

create policy "shop_courses_update" on public.shop_courses for update using (
  exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
);

create policy "shop_courses_delete" on public.shop_courses for delete using (
  exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
);
