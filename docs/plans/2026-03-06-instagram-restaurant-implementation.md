# Instagram連携集客サービス 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 既存の飲食店SNS「Kuuu」を、Instagram連携 × 位置情報 × リアルタイム空席 の集客サービスにリファクタリングする

**Architecture:** 段階的リファクタリング方式。SNS機能を削除 → 地図+リスト中心UIに再構築 → Instagram手動連携 → パートナーポータル → AI機能。既存のSupabase基盤（認証・テーブル・RLS）とStripe決済はそのまま活用する。

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase, Stripe, Tailwind CSS v4, Google Maps API, Claude API

**重要な既存仕様:**
- DBテーブル名は `shops`（コード内）/ `restaurants`（スキーマ名）— コード側では `shops` を使用
- ユーザーテーブルは `users`（コード内では `profiles` としてもエイリアスあり）
- 既存の Discover ページ (`src/app/(main)/discover/page.tsx`) に Google Maps 統合済み

---

## Task 1: DB スキーマ更新 — SNS テーブル削除 & 新規テーブル追加

**Files:**
- Create: `supabase/migrations/003_pivot_to_instagram_service.sql`
- Modify: `src/types/database.ts`

**Step 1: マイグレーションSQL作成**

```sql
-- supabase/migrations/003_pivot_to_instagram_service.sql
-- ピボット: 飲食店SNS → Instagram連携集客サービス

-- ============================================================
-- A. user_type に partner を追加
-- ============================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('general', 'restaurant_owner', 'partner'));

-- ============================================================
-- B. restaurants に Instagram カラム追加
-- ============================================================
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram_username TEXT;

-- ============================================================
-- C. SNS関連テーブル削除
-- ============================================================
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_images CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.shop_courses CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;

-- ============================================================
-- D. 新規テーブル: Instagram投稿キャッシュ
-- ============================================================
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

-- ============================================================
-- E. 新規テーブル: 営業パートナー
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own data" ON public.partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners can insert own data" ON public.partners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- F. 新規テーブル: パートナー紹介実績
-- ============================================================
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

-- ============================================================
-- G. 新規テーブル: パートナー振込
-- ============================================================
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

-- ============================================================
-- H. 新規テーブル: 集客分析イベント
-- ============================================================
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

-- ============================================================
-- I. リアルタイム設定更新
-- ============================================================
-- posts は削除済みなのでリアルタイムから外す（エラー無視）
-- seat_status, notifications, reservations は維持
```

**Step 2: Supabase SQL Editor でマイグレーション実行**

Supabase Dashboard の SQL Editor でマイグレーションを実行する。
※ローカルの Supabase CLI を使用する場合は `npx supabase db push` でも可。

**Step 3: 型定義を更新 (`src/types/database.ts`)**

SNS関連の型を削除し、新しいテーブルの型を追加する。

```typescript
// 削除する型: PostType, Post, PostImage, PostLike, Comment, Follow, FollowingType, Story, Coupon, PostWithShop

// 追加する型:
export type UserType = "general" | "restaurant_owner" | "partner";

export interface InstagramPost {
  id: string;
  restaurant_id: string;
  instagram_post_id: string | null;
  image_url: string;
  caption: string | null;
  permalink: string;
  posted_at: string | null;
  fetched_at: string;
  created_at: string;
}

export interface Partner {
  id: string;
  user_id: string;
  referral_code: string;
  created_at: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  restaurant_id: string;
  plan_type: string;
  contracted_at: string;
  is_active: boolean;
  created_at: string;
  restaurant?: Restaurant;
}

export type PayoutStatus = "pending" | "paid";

export interface PartnerPayout {
  id: string;
  partner_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
}

export type AnalyticsEventType = "view" | "click" | "reserve" | "favorite";

export interface AnalyticsEvent {
  id: string;
  restaurant_id: string;
  event_type: AnalyticsEventType;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Restaurant に instagram フィールド追加
export interface Restaurant {
  // ... 既存フィールド ...
  instagram_url: string | null;
  instagram_username: string | null;
}

// Database interface 更新（削除テーブルを除去、新規テーブルを追加）
```

**Step 4: コミット**

```bash
git add supabase/migrations/003_pivot_to_instagram_service.sql src/types/database.ts
git commit -m "refactor: DBスキーマ更新 — SNSテーブル削除、Instagram・パートナー・分析テーブル追加"
```

---

## Task 2: SNS コンポーネント削除 & コード整理

**Files:**
- Delete: `src/components/timeline/HomeFeed.tsx`
- Delete: `src/components/timeline/PostCard.tsx`
- Delete: `src/components/timeline/ShopCarousel.tsx`
- Delete: `src/components/timeline/ClientTabController.tsx`
- Delete: `src/components/stories/` (ディレクトリ全体)
- Delete: `src/app/(main)/home/page.tsx`
- Delete: `src/app/(main)/post/[id]/` (ディレクトリ全体)
- Delete: `src/app/(main)/notifications/page.tsx`
- Delete: `src/app/posts/new/page.tsx`
- Delete: `src/app/shop-dashboard/posts/page.tsx`
- Delete: `src/app/shop-dashboard/stories/` (ディレクトリ全体)
- Delete: `src/app/shop-dashboard/courses/page.tsx`
- Modify: `src/app/shop-dashboard/page.tsx` (投稿数参照を削除)

**Step 1: SNS関連コンポーネント・ページを削除**

```bash
# タイムライン関連
rm -rf src/components/timeline/HomeFeed.tsx
rm -rf src/components/timeline/PostCard.tsx
rm -rf src/components/timeline/ShopCarousel.tsx
rm -rf src/components/timeline/ClientTabController.tsx

# ストーリー関連
rm -rf src/components/stories/

# SNSページ
rm -rf src/app/(main)/home/
rm -rf src/app/(main)/post/
rm -rf src/app/(main)/notifications/
rm -rf src/app/posts/

# ダッシュボードのSNS機能
rm -rf src/app/shop-dashboard/posts/
rm -rf src/app/shop-dashboard/stories/
rm -rf src/app/shop-dashboard/courses/
```

**Step 2: shop-dashboard/page.tsx から投稿数参照を削除**

`postCount` の state・クエリ・表示を削除。`posts` テーブルへの参照をすべて除去。

**Step 3: 残っている posts/stories インポートを grep で検索し修正**

```bash
npx grep -r "from.*timeline\|from.*stories\|from.*PostCard\|from.*HomeFeed\|PostWithShop\|PostType\|PostLike\|Comment\b" src/ --include="*.tsx" --include="*.ts"
```

各ファイルから不要なインポートと参照を削除する。

**Step 4: 型チェック実行**

```bash
npx tsc --noEmit
```

エラーがあれば修正。

**Step 5: コミット**

```bash
git add -A
git commit -m "refactor: SNS機能（タイムライン・ストーリー・いいね・コメント）を完全削除"
```

---

## Task 3: メイン画面リビルド — 地図+リスト切替UI

**Files:**
- Create: `src/app/(main)/page.tsx` (新しいルートページ — Server Component)
- Create: `src/components/discover/DiscoverView.tsx` (Client Component — 地図+リスト切替)
- Create: `src/components/discover/RestaurantCard.tsx` (リストビュー用カード)
- Create: `src/components/discover/MapView.tsx` (地図ビュー)
- Create: `src/components/discover/SeatBadge.tsx` (空席バッジ)
- Modify: `src/components/layout/BottomNav.tsx` (ナビ項目変更)
- Modify: `src/components/layout/AppShell.tsx` (パス設定更新)
- Delete: `src/app/(main)/discover/page.tsx` (旧Discover — 機能を新メイン画面に統合)

**Step 1: BottomNav を新しいナビ構成に更新**

```typescript
const navItems = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/favorites", icon: Heart, label: "お気に入り" },
  { href: "/reservations", icon: CalendarDays, label: "予約" },
  { href: "/mypage", icon: User, label: "マイページ" },
];
```

**Step 2: AppShell の HIDDEN_NAV_PATHS を更新**

```typescript
const HIDDEN_NAV_PATHS = ["/login", "/signup", "/shop-dashboard", "/admin", "/partner"];
```

旧 `/dashboard` を削除。`/partner` を追加。

**Step 3: SeatBadge コンポーネント作成**

`src/components/discover/SeatBadge.tsx` — 空席状況をバッジで表示するコンポーネント。
既存の `getSeatStatusLabel` / `getSeatStatusColor` を活用。

```typescript
"use client";

import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types/database";

const statusConfig: Record<SeatStatusType, { label: string; className: string }> = {
  available: { label: "空席あり", className: "bg-green-100 text-green-700" },
  busy: { label: "混雑", className: "bg-yellow-100 text-yellow-700" },
  full: { label: "満席", className: "bg-red-100 text-red-700" },
  closed: { label: "閉店中", className: "bg-gray-100 text-gray-500" },
};

export function SeatBadge({ status }: { status: SeatStatusType }) {
  const config = statusConfig[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", config.className)}>
      {config.label}
    </span>
  );
}
```

**Step 4: RestaurantCard コンポーネント作成**

`src/components/discover/RestaurantCard.tsx` — リストビュー用の店舗カード。
Instagram投稿サムネイル、空席バッジ、距離を表示。

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { SeatBadge } from "./SeatBadge";
import type { Restaurant, SeatStatus, InstagramPost } from "@/types/database";

interface Props {
  restaurant: Restaurant;
  seatStatus: SeatStatus | null;
  instagramPosts: InstagramPost[];
  distance: number | null; // km
}

export function RestaurantCard({ restaurant, seatStatus, instagramPosts, distance }: Props) {
  const thumbnail = instagramPosts[0]?.image_url
    ?? restaurant.atmosphere_photos?.[0]
    ?? null;

  return (
    <Link
      href={`/shop/${restaurant.id}`}
      className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-shadow hover:shadow-md"
    >
      {/* サムネイル */}
      <div className="relative size-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {thumbnail ? (
          <Image src={thumbnail} alt={restaurant.name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex size-full items-center justify-center text-gray-400">
            <MapPin className="size-6" />
          </div>
        )}
      </div>

      {/* 情報 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="truncate text-sm font-bold text-gray-800">{restaurant.name}</h3>
        <p className="truncate text-xs text-gray-500">{restaurant.genre}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {seatStatus && <SeatBadge status={seatStatus.status} />}
          {distance !== null && (
            <span className="text-xs text-gray-400">
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

**Step 5: MapView コンポーネント作成**

`src/components/discover/MapView.tsx` — 既存の Discover ページの地図ロジックを抽出・改良。
Google Maps + 店舗ピン + ミニカード表示。空席バッジ付き。

**Step 6: DiscoverView コンポーネント作成**

`src/components/discover/DiscoverView.tsx` — メインの Client Component。
タブで地図ビュー / リストビューを切り替え。
検索バー + フィルター（空席あり / ジャンル / 距離順）。

```typescript
"use client";

import { useState, useMemo } from "react";
import { MapView } from "./MapView";
import { RestaurantCard } from "./RestaurantCard";
// ... フィルターロジック

type ViewMode = "map" | "list";

export function DiscoverView({ restaurants, seatStatuses, instagramPosts, userLocation, initialFavoriteIds }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // フィルタリングロジック（useMemo）
  // 距離計算（Haversine）
  // 検索 + ジャンル + 空席フィルター

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* 検索バー + フィルター */}
      {/* ビュー切替タブ */}
      {/* 地図 or リスト表示 */}
    </div>
  );
}
```

**Step 7: 新しいルートページ作成 (`src/app/(main)/page.tsx`)**

Server Component。restaurants + seat_status + instagram_posts を並列取得し DiscoverView に渡す。

```typescript
import { createClient } from "@/lib/supabase/server";
import { DiscoverView } from "@/components/discover/DiscoverView";

export default async function MainPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  const [restaurantsResult, seatResult, instagramResult, favsResult] = await Promise.all([
    supabase.from("shops").select("*"),
    supabase.from("seat_status").select("*"),
    supabase.from("instagram_posts").select("*").order("posted_at", { ascending: false }),
    authData?.user
      ? supabase.from("favorites").select("restaurant_id").eq("user_id", authData.user.id)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <DiscoverView
      restaurants={restaurantsResult.data || []}
      seatStatuses={seatResult.data || []}
      instagramPosts={instagramResult.data || []}
      initialFavoriteIds={(favsResult.data || []).map((f: any) => f.restaurant_id)}
    />
  );
}
```

**Step 8: 旧 Discover ページ削除**

```bash
rm -rf src/app/(main)/discover/
```

**Step 9: 型チェック + 動作確認**

```bash
npx tsc --noEmit
npm run dev
```

ブラウザで `/` にアクセスし、地図+リスト切替が動作することを確認。

**Step 10: コミット**

```bash
git add -A
git commit -m "feat: メイン画面を地図+リスト切替UIにリビルド（Instagram投稿・空席バッジ対応）"
```

---

## Task 4: 店舗詳細ページ改修 — Instagram投稿表示 & 予約

**Files:**
- Modify: `src/app/shop/[id]/page.tsx` (Server Component — Instagram投稿取得追加)
- Modify: `src/app/shop/[id]/ShopDetailClient.tsx` (Client Component — UI刷新)
- Create: `src/components/shop/InstagramGrid.tsx` (Instagram投稿グリッド)
- Create: `src/lib/analytics.ts` (分析イベント送信ヘルパー)

**Step 1: 分析イベント送信ヘルパー作成**

```typescript
// src/lib/analytics.ts
import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventType } from "@/types/database";

export async function trackEvent(
  restaurantId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("analytics_events").insert({
    restaurant_id: restaurantId,
    event_type: eventType,
    user_id: user?.id ?? null,
    metadata: metadata ?? {},
  });
}
```

**Step 2: InstagramGrid コンポーネント作成**

```typescript
// src/components/shop/InstagramGrid.tsx
"use client";

import Image from "next/image";
import { Instagram } from "lucide-react";
import type { InstagramPost } from "@/types/database";

export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Instagram className="size-5 text-pink-500" />
        <h3 className="font-bold text-gray-800">Instagram投稿</h3>
      </div>
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
        {posts.slice(0, 6).map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden bg-gray-100"
          >
            <Image
              src={post.image_url}
              alt={post.caption || "Instagram投稿"}
              fill
              className="object-cover transition-transform hover:scale-105"
              sizes="(max-width: 640px) 33vw, 200px"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
```

**Step 3: 店舗詳細 Server Component を更新**

`instagram_posts` を並列クエリに追加。

**Step 4: ShopDetailClient を更新**

- ヘッダー画像をInstagram投稿カルーセルに変更
- InstagramGrid セクション追加
- 空席バッジ表示（リアルタイム）
- 予約ボタン（スタンダード以上のプランのみ表示）
- ページ訪問時に `trackEvent("view")` を呼ぶ

**Step 5: 型チェック + 動作確認**

```bash
npx tsc --noEmit
```

**Step 6: コミット**

```bash
git add -A
git commit -m "feat: 店舗詳細ページにInstagram投稿グリッド・空席バッジ・分析トラッキング追加"
```

---

## Task 5: 店舗ダッシュボード改修 — Instagram連携 & 空席ワンタップ

**Files:**
- Modify: `src/app/shop-dashboard/page.tsx` (ダッシュボードUI刷新)
- Create: `src/app/shop-dashboard/instagram/page.tsx` (Instagram連携設定)
- Create: `src/components/dashboard/InstagramManager.tsx` (投稿URL管理)
- Create: `src/app/api/instagram/oembed/route.ts` (oEmbed API プロキシ)
- Modify: `src/lib/stripe/plans.ts` (料金プラン更新)

**Step 1: 料金プラン更新**

```typescript
// src/lib/stripe/plans.ts
export const PLANS = {
  free: {
    name: "無料プラン",
    price: 0,
    description: "掲載とInstagram連携のみ。まずはお試しに。",
    features: [
      "店舗掲載",
      "Instagram投稿URL登録（6件）",
      "基本情報の表示",
    ],
  },
  standard: {
    name: "スタンダードプラン",
    price: 9800,
    description: "空席リアルタイム更新と予約受付で集客を強化。",
    features: [
      "無料プランの全機能",
      "空席リアルタイム更新",
      "予約受付・管理",
      "基本アナリティクス",
    ],
  },
  premium: {
    name: "プレミアムプラン",
    price: 29800,
    description: "AI最適化と詳細分析で集客を最大化。",
    features: [
      "スタンダードプランの全機能",
      "AI投稿最適化提案",
      "詳細集客分析",
      "検索結果の優先表示",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
```

**Step 2: oEmbed API プロキシ作成**

```typescript
// src/app/api/instagram/oembed/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || !url.includes("instagram.com")) {
    return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
  }

  const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.FACEBOOK_APP_TOKEN}`;

  const res = await fetch(oembedUrl);
  if (!res.ok) {
    return NextResponse.json({ error: "投稿の取得に失敗しました" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
```

**Step 3: InstagramManager コンポーネント作成**

店舗オーナーがInstagramユーザー名登録 + 投稿URLを最大6件登録できるUI。
URLを貼ると oEmbed API で画像・キャプションを取得し、instagram_posts テーブルに保存。

**Step 4: Instagram連携設定ページ作成**

`src/app/shop-dashboard/instagram/page.tsx` — InstagramManager を表示。

**Step 5: ダッシュボード page.tsx を刷新**

- 投稿数カード → Instagram投稿数カードに変更
- クイックアクション: 「ストーリー投稿」「今日の1枚」を削除
- 新しいクイックアクション: 「Instagram連携」「空席更新」「予約台帳」「店舗設定」「料金プラン」
- 空席ステータス4ボタン（空き/混雑/満席/閉店）をワンタップ切替に変更（トグルではなく4択）

**Step 6: 型チェック + 動作確認**

```bash
npx tsc --noEmit
npm run dev
```

**Step 7: コミット**

```bash
git add -A
git commit -m "feat: 店舗ダッシュボード改修 — Instagram連携設定・空席ワンタップ・料金プラン更新"
```

---

## Task 6: 営業パートナーポータル

**Files:**
- Create: `src/app/partner/page.tsx` (パートナーポータル — Server Component)
- Create: `src/app/partner/PartnerDashboard.tsx` (Client Component)
- Create: `src/app/partner/layout.tsx` (パートナー用レイアウト)
- Modify: `src/app/(auth)/signup/page.tsx` (パートナー登録フロー追加)

**Step 1: パートナー用レイアウト作成**

```typescript
// src/app/partner/layout.tsx
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">パートナーポータル</h1>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 2: パートナーポータル Server Component 作成**

```typescript
// src/app/partner/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PartnerDashboard } from "./PartnerDashboard";

export default async function PartnerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [partnerResult, referralsResult, payoutsResult] = await Promise.all([
    supabase.from("partners").select("*").eq("user_id", user.id).single(),
    supabase.from("partner_referrals").select("*, restaurant:shops(name, plan_type)").order("contracted_at", { ascending: false }),
    supabase.from("partner_payouts").select("*").order("period_end", { ascending: false }),
  ]);

  if (!partnerResult.data) redirect("/mypage");

  return (
    <PartnerDashboard
      partner={partnerResult.data}
      referrals={referralsResult.data || []}
      payouts={payoutsResult.data || []}
    />
  );
}
```

**Step 3: PartnerDashboard Client Component 作成**

- 紹介コード表示（コピーボタン付き）
- 今月の収益サマリーカード
- 紹介店舗一覧テーブル（店名・プラン・契約日・ステータス・月額報酬）
- 振込履歴一覧

レベニューシェア計算:
- スタンダード契約: ¥2,000/店/月
- プレミアム契約: ¥5,000/店/月

**Step 4: サインアップにパートナー登録導線を追加**

紹介コードをURLパラメータで受け取れるように。

**Step 5: 型チェック + 動作確認**

```bash
npx tsc --noEmit
```

**Step 6: コミット**

```bash
git add -A
git commit -m "feat: 営業パートナーポータル — 紹介コード・収益管理・振込履歴"
```

---

## Task 7: 集客分析ダッシュボード（プレミアム機能）

**Files:**
- Create: `src/app/shop-dashboard/analytics/page.tsx` (分析ページ)
- Create: `src/components/dashboard/AnalyticsCharts.tsx` (グラフ表示)

**Step 1: 分析ページ Server Component 作成**

```typescript
// src/app/shop-dashboard/analytics/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop) redirect("/shop-dashboard");
  if (shop.plan_type !== "premium") {
    // プレミアム限定ページ → アップグレード案内
    return <UpgradePrompt />;
  }

  // 過去30日のイベントを取得
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: events } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("restaurant_id", shop.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  return <AnalyticsCharts events={events || []} shopName={shop.name} />;
}
```

**Step 2: AnalyticsCharts Client Component 作成**

- 日別閲覧数の折れ線グラフ（CSS Grid + div バーチャート、外部ライブラリ不使用）
- イベント種別の内訳（view / click / reserve / favorite）
- 予約転換率（view → reserve の割合）
- 期間フィルター（7日/30日/90日）

CSSのみでシンプルなバーチャートを実装（chart.jsなどは追加しない）。

**Step 3: 型チェック + 動作確認**

```bash
npx tsc --noEmit
```

**Step 4: コミット**

```bash
git add -A
git commit -m "feat: 集客分析ダッシュボード — 閲覧数・転換率・期間フィルター（プレミアム機能）"
```

---

## Task 8: AI投稿最適化提案（プレミアム機能）

**Files:**
- Create: `src/app/api/ai/suggestion/route.ts` (AI提案 API)
- Create: `src/components/dashboard/AiSuggestion.tsx` (提案表示)
- Modify: `src/app/shop-dashboard/page.tsx` (AI提案セクション追加)

**Step 1: Claude API キー設定**

`.env.local` に `ANTHROPIC_API_KEY` を追加（ユーザーに確認）。

**Step 2: AI提案 API Route 作成**

```typescript
// src/app/api/ai/suggestion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証エラー" }, { status: 401 });

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!shop || shop.plan_type !== "premium") {
    return NextResponse.json({ error: "プレミアムプラン限定です" }, { status: 403 });
  }

  // 過去7日の分析データ
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: events } = await supabase
    .from("analytics_events")
    .select("event_type, created_at")
    .eq("restaurant_id", shop.id)
    .gte("created_at", sevenDaysAgo.toISOString());

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `あなたは飲食店のInstagramマーケティングの専門家です。
以下の店舗データと直近7日間のアクセスデータを基に、今日のInstagram投稿の提案を1つ具体的にしてください。

店舗名: ${shop.name}
ジャンル: ${shop.genre || "不明"}
エリア: ${shop.address}

直近7日間のデータ:
- 閲覧数: ${events?.filter(e => e.event_type === "view").length ?? 0}
- クリック数: ${events?.filter(e => e.event_type === "click").length ?? 0}
- 予約数: ${events?.filter(e => e.event_type === "reserve").length ?? 0}
- お気に入り数: ${events?.filter(e => e.event_type === "favorite").length ?? 0}

投稿提案には以下を含めてください:
1. 推奨投稿時間
2. 投稿テーマ・内容
3. キャプション例（ハッシュタグ付き）
4. 期待される効果

簡潔に300文字以内で回答してください。`,
    }],
  });

  const suggestion = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ suggestion });
}
```

**Step 3: AiSuggestion コンポーネント作成**

ダッシュボードに表示するAI提案カード。
- 「提案を取得」ボタン → API呼び出し → 提案テキスト表示
- プレミアム限定バッジ
- ローディング状態

**Step 4: ダッシュボードにAI提案セクション追加**

`shop-dashboard/page.tsx` にプレミアムプランの場合のみ AiSuggestion を表示。

**Step 5: 型チェック + 動作確認**

```bash
npx tsc --noEmit
```

**Step 6: コミット**

```bash
git add -A
git commit -m "feat: AI投稿最適化提案 — Claude APIによる投稿提案生成（プレミアム機能）"
```

---

## Task 9: Stripe 料金プラン調整 & 予約ページ

**Files:**
- Modify: `src/app/shop-dashboard/billing/page.tsx` (3プラン表示に対応)
- Modify: `src/app/api/stripe/checkout/route.ts` (新プランID対応)
- Modify: `src/app/api/stripe/webhook/route.ts` (プラン変更処理)
- Create: `src/app/(main)/reservations/page.tsx` (ユーザーの予約履歴ページ)

**Step 1: billing ページを3プラン対応に更新**

無料 / スタンダード / プレミアムの3カラム表示。
現在のプランをハイライト。
無料プランは「現在のプラン」表示のみ（チェックアウト不要）。

**Step 2: Stripe チェックアウト API を新プランに対応**

環境変数に `STRIPE_STANDARD_PRICE_ID` と `STRIPE_PREMIUM_PRICE_ID` を設定。

**Step 3: ユーザーの予約履歴ページ作成**

```typescript
// src/app/(main)/reservations/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, restaurant:shops(name, address)")
    .eq("user_id", user.id)
    .order("reservation_datetime", { ascending: false });

  // 予約一覧を表示
}
```

**Step 4: 型チェック + 動作確認**

```bash
npx tsc --noEmit
```

**Step 5: コミット**

```bash
git add -A
git commit -m "feat: Stripe 3プラン対応・ユーザー予約履歴ページ追加"
```

---

## Task 10: CLAUDE.md & ドキュメント更新 + 最終ビルド確認

**Files:**
- Modify: `CLAUDE.md` (プロジェクト説明・ディレクトリ構造を新サービスに更新)
- Modify: `src/components/layout/Header.tsx` (サービス名を仮名に変更)

**Step 1: CLAUDE.md をピボット後の内容に更新**

- サービス概要を「Instagram連携集客サービス」に変更
- ディレクトリ構造を最新に更新
- 削除した機能の記述を除去
- 新しいテーブル・API Route を追記

**Step 2: Header のサービス名を更新**

仮名（決まるまで「Kuuu」のままか、シンプルなプレースホルダー）。

**Step 3: ビルド確認**

```bash
npx tsc --noEmit
npm run build
```

エラーがあれば修正。

**Step 4: 最終コミット**

```bash
git add -A
git commit -m "docs: CLAUDE.md・ヘッダーを新サービスに更新、ビルド通過確認"
```

---

## 完了後のディレクトリ構造

```
src/
├── app/
│   ├── (auth)/             # ログイン・サインアップ
│   ├── (main)/
│   │   ├── page.tsx        # メイン画面（地図+リスト）
│   │   ├── favorites/      # お気に入り
│   │   ├── reservations/   # 予約履歴（新規）
│   │   └── mypage/         # マイページ
│   ├── shop/[id]/          # 店舗詳細
│   ├── shop-dashboard/     # 店舗オーナーダッシュボード
│   │   ├── page.tsx
│   │   ├── instagram/      # Instagram連携（新規）
│   │   ├── analytics/      # 集客分析（新規）
│   │   ├── reservations/
│   │   ├── profile/
│   │   └── billing/
│   ├── partner/            # パートナーポータル（新規）
│   ├── admin/
│   └── api/
│       ├── instagram/oembed/  # oEmbed プロキシ（新規）
│       ├── ai/suggestion/     # AI提案（新規）
│       ├── stripe/
│       └── check/
├── components/
│   ├── discover/           # 地図+リスト（新規）
│   │   ├── DiscoverView.tsx
│   │   ├── MapView.tsx
│   │   ├── RestaurantCard.tsx
│   │   └── SeatBadge.tsx
│   ├── shop/               # 店舗詳細（新規）
│   │   └── InstagramGrid.tsx
│   ├── dashboard/          # ダッシュボード（新規）
│   │   ├── InstagramManager.tsx
│   │   ├── AnalyticsCharts.tsx
│   │   └── AiSuggestion.tsx
│   ├── layout/
│   ├── reservation/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── stripe/
│   ├── analytics.ts        # イベントトラッキング（新規）
│   ├── format.ts
│   └── utils.ts
├── types/
│   └── database.ts         # 更新済み
├── store/
└── data/
```
