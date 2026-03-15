# Kuuu 完全リビルド実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kuuu（飲食店SNS）をDB含め0から再構築する。プロジェクト初期化 → 基盤構築 → 全ページ実装まで一気通貫で完成させる。

**Architecture:** Next.js 16 App Router。Server Component でデータ取得 → Client Component に props で渡す。デザインシステムコンポーネントを先に作り、全ページで再利用。Zustand で軽量状態管理。全テーブル `shops` に統一。

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Supabase, Stripe, Zustand, React Google Maps API, Lucide React, motion, date-fns

**UI仕様書:** `docs/plans/2026-03-09-kuuu-redesign-design.md` を参照。全画面の詳細仕様はここに記載されている。

**DB SQL:** `docs/sql/001_clean_schema.sql` をユーザーが Supabase SQL Editor で実行済みの前提。

---

## Phase 0: プロジェクト初期化

### Task 0-1: 既存ファイルの退避・削除

**目的:** docs/, .env.local, .claude/ 以外のすべてを削除し、クリーンな状態にする。

**Step 1: 保持するファイルを退避**

```bash
mkdir -p /tmp/kuuu-backup
cp .env.local /tmp/kuuu-backup/
cp -r docs /tmp/kuuu-backup/
cp -r .claude /tmp/kuuu-backup/
cp .gitignore /tmp/kuuu-backup/
cp .mcp.json /tmp/kuuu-backup/
```

**Step 2: src/ 以下と不要ファイルを削除**

```bash
rm -rf src/ supabase/ public/ certificates/ scripts/ node_modules/ .next/
rm -f package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs
rm -f README.md CLAUDE.md next-env.d.ts vercel.json
rm -f build_error.txt tsc.txt tsc2.txt tsc_output.txt temp_database.ts
rm -f check_accounts.ts check_subs.ts fetchTest.ts get_user.ts sync_stripe.ts
rm -f tsconfig.tsbuildinfo
```

### Task 0-2: Next.js プロジェクト初期化

**Step 1: create-next-app で初期化**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

※ 既存ディレクトリの上書きを許可する。Turbopack は Yes。

**Step 2: 退避したファイルを復元**

```bash
cp /tmp/kuuu-backup/.env.local .
cp -r /tmp/kuuu-backup/docs .
cp -r /tmp/kuuu-backup/.claude .
cp /tmp/kuuu-backup/.gitignore .
cp /tmp/kuuu-backup/.mcp.json .
```

**Step 3: 不要な初期ファイルを削除**

```bash
rm -f src/app/page.tsx src/app/globals.css src/app/layout.tsx
rm -rf src/app/fonts/
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

### Task 0-3: 依存パッケージのインストール

**Step 1: 必要パッケージをインストール**

```bash
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js @react-google-maps/api @anthropic-ai/sdk lucide-react clsx tailwind-merge date-fns zustand motion
```

**Step 2: 型定義パッケージをインストール**

```bash
npm install -D @types/google.maps
```

**Step 3: Tailwind CSS v4 PostCSS 設定を確認**

`postcss.config.mjs` が以下の内容であることを確認:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### Task 0-4: プロジェクト設定ファイルの作成

**Files:**
- Create: `next.config.ts`
- Create: `vercel.json`
- Create: `CLAUDE.md`

**Step 1: next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
```

**Step 2: vercel.json**

```json
{
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

**Step 3: CLAUDE.md（プロジェクト指示書）**

設計書 `docs/plans/2026-03-15-kuuu-full-rebuild-design.md` のセクション2〜5を反映した新しい CLAUDE.md を作成する。コマンド、環境変数、アーキテクチャパターンを含める。

**Step 4: コミット**

```bash
git add -A
git commit -m "chore: プロジェクト完全初期化 — Next.js 16 + 依存パッケージ"
```

---

## Phase 1: 基盤（型定義 + ライブラリ + ストア + ミドルウェア）

### Task 1-1: 型定義

**Files:**
- Create: `src/types/database.ts`

全テーブルに対応する TypeScript 型を定義。`docs/sql/001_clean_schema.sql` のスキーマと完全一致させる。

```typescript
// ENUM 型
export type UserType = "general" | "restaurant_owner" | "partner";
export type PlanType = "free" | "standard" | "premium";
export type SeatStatusType = "available" | "busy" | "full" | "closed";
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete";
export type NotificationType = "follow" | "new_post" | "new_instagram_post" | "reservation_confirmed" | "reservation_cancelled" | "new_reservation" | "favorite";
export type AnalyticsEventType = "view" | "click" | "reserve" | "favorite" | "share" | "instagram_click";
export type MediaType = "IMAGE" | "VIDEO";

// DayHours: 曜日ごとの営業時間
export type DayHours = {
  open: string;   // "11:00"
  close: string;  // "22:00"
  closed: boolean;
};

// BusinessHours: 全曜日
export type BusinessHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

// --- テーブル型 ---

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_type: UserType;
  created_at: string;
  updated_at: string;
};

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  business_hours: BusinessHours | null;
  genre: string | null;
  main_image: string | null;
  plan_type: PlanType;
  is_verified: boolean;
  instagram_url: string | null;
  instagram_username: string | null;
  instagram_access_token: string | null;
  instagram_token_expires_at: string | null;
  instagram_user_id: string | null;
  instagram_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SeatStatus = {
  id: string;
  shop_id: string;
  status: SeatStatusType;
  available_seats: number | null;
  wait_time_minutes: number | null;
  updated_at: string;
};

export type Follow = {
  id: string;
  user_id: string;
  shop_id: string;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  shop_id: string;
  created_at: string;
};

export type Reservation = {
  id: string;
  user_id: string;
  shop_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  note: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
};

export type InstagramPost = {
  id: string;
  shop_id: string;
  instagram_post_id: string;
  image_url: string | null;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
  fetched_at: string;
  created_at: string;
};

export type InstagramStory = {
  id: string;
  shop_id: string;
  instagram_media_id: string;
  media_url: string;
  media_type: MediaType;
  timestamp: string | null;
  expires_at: string;
  fetched_at: string;
};

export type Subscription = {
  id: string;
  shop_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan_type: PlanType;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  shop_id: string;
  event_type: AnalyticsEventType;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Partner = {
  id: string;
  user_id: string;
  referral_code: string;
  created_at: string;
};

export type PartnerReferral = {
  id: string;
  partner_id: string;
  shop_id: string;
  plan_type: PlanType | null;
  contracted_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type PartnerPayout = {
  id: string;
  partner_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
};

// --- Supabase Database 型マッピング ---
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; email: string }; Update: Partial<Profile> };
      shops: { Row: Shop; Insert: Partial<Shop> & { owner_id: string; name: string }; Update: Partial<Shop> };
      seat_status: { Row: SeatStatus; Insert: Partial<SeatStatus> & { shop_id: string }; Update: Partial<SeatStatus> };
      follows: { Row: Follow; Insert: { user_id: string; shop_id: string }; Update: Partial<Follow> };
      favorites: { Row: Favorite; Insert: { user_id: string; shop_id: string }; Update: Partial<Favorite> };
      reservations: { Row: Reservation; Insert: Partial<Reservation> & { user_id: string; shop_id: string; reservation_date: string; reservation_time: string; party_size: number }; Update: Partial<Reservation> };
      instagram_posts: { Row: InstagramPost; Insert: Partial<InstagramPost> & { shop_id: string; instagram_post_id: string }; Update: Partial<InstagramPost> };
      instagram_stories: { Row: InstagramStory; Insert: Partial<InstagramStory> & { shop_id: string; instagram_media_id: string; media_url: string; expires_at: string }; Update: Partial<InstagramStory> };
      subscriptions: { Row: Subscription; Insert: Partial<Subscription> & { shop_id: string }; Update: Partial<Subscription> };
      notifications: { Row: Notification; Insert: Partial<Notification> & { user_id: string; type: NotificationType; title: string }; Update: Partial<Notification> };
      analytics_events: { Row: AnalyticsEvent; Insert: Partial<AnalyticsEvent> & { shop_id: string; event_type: AnalyticsEventType }; Update: Partial<AnalyticsEvent> };
      partners: { Row: Partner; Insert: { user_id: string; referral_code: string }; Update: Partial<Partner> };
      partner_referrals: { Row: PartnerReferral; Insert: Partial<PartnerReferral> & { partner_id: string; shop_id: string }; Update: Partial<PartnerReferral> };
      partner_payouts: { Row: PartnerPayout; Insert: Partial<PartnerPayout> & { partner_id: string; amount: number; period_start: string; period_end: string }; Update: Partial<PartnerPayout> };
    };
  };
};
```

### Task 1-2: Supabase クライアント

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/middleware.ts`

**server.ts:**
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch { /* Server Component */ }
          });
        },
      },
    }
  );
}
```

**client.ts:**
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**middleware.ts:**
```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

### Task 1-3: ミドルウェア + ユーティリティ + ストア

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/analytics.ts`
- Create: `src/store/index.ts`

**middleware.ts:**
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**utils.ts:**
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeatStatusType } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSeatStatusLabel(status: SeatStatusType): string {
  const labels: Record<SeatStatusType, string> = {
    available: "空席あり",
    busy: "やや混雑",
    full: "満席",
    closed: "休業",
  };
  return labels[status];
}

export function getSeatStatusColor(status: SeatStatusType): string {
  const colors: Record<SeatStatusType, string> = {
    available: "bg-green-500",
    busy: "bg-yellow-500",
    full: "bg-red-500",
    closed: "bg-gray-400",
  };
  return colors[status];
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}日前`;
}
```

**format.ts:**
```typescript
import { format, isToday, isYesterday } from "date-fns";

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "今日";
  if (isYesterday(date)) return "昨日";
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "M月d日");
  }
  return format(date, "yyyy年M月d日");
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5); // "HH:MM"
}

export function formatRemainingTime(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return "期限切れ";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `残り${diffMin}分`;
  const diffHour = Math.floor(diffMin / 60);
  return `残り${diffHour}時間`;
}
```

**analytics.ts:**
```typescript
import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventType } from "@/types/database";

export async function trackEvent(
  shopId: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("analytics_events").insert({
    shop_id: shopId,
    event_type: eventType,
    user_id: user?.id,
    metadata: metadata ?? null,
  });
}
```

**store/index.ts:**
```typescript
import { create } from "zustand";
import type { Profile, Shop } from "@/types/database";

type AuthStore = {
  user: Profile | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

type LocationStore = {
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;
  setLocation: (lat: number, lng: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  isLoading: true,
  error: null,
  setLocation: (latitude, longitude) => set({ latitude, longitude, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

type UIStore = {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((s) => ({ isMenuOpen: !s.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),
}));

type FollowStore = {
  followingIds: Set<string>;
  setFollowingIds: (ids: Set<string>) => void;
  addFollow: (shopId: string) => void;
  removeFollow: (shopId: string) => void;
  isFollowing: (shopId: string) => boolean;
};

export const useFollowStore = create<FollowStore>((set, get) => ({
  followingIds: new Set(),
  setFollowingIds: (ids) => set({ followingIds: ids }),
  addFollow: (shopId) => set((s) => ({ followingIds: new Set([...s.followingIds, shopId]) })),
  removeFollow: (shopId) => set((s) => {
    const next = new Set(s.followingIds);
    next.delete(shopId);
    return { followingIds: next };
  }),
  isFollowing: (shopId) => get().followingIds.has(shopId),
}));

type ShopOwnerStore = {
  shop: Shop | null;
  setShop: (shop: Shop | null) => void;
};

export const useShopOwnerStore = create<ShopOwnerStore>((set) => ({
  shop: null,
  setShop: (shop) => set({ shop }),
}));
```

**Step: コミット**
```bash
git add -A
git commit -m "feat: 基盤構築 — 型定義・Supabase・ユーティリティ・ストア"
```

### Task 1-4: Stripe 設定

**Files:**
- Create: `src/lib/stripe/server.ts`
- Create: `src/lib/stripe/client.ts`
- Create: `src/lib/stripe/plans.ts`

**server.ts:**
```typescript
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

**client.ts:**
```typescript
import { loadStripe } from "@stripe/stripe-js";
export const getStripe = () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
```

**plans.ts:**
```typescript
import type { PlanType } from "@/types/database";

export type PlanInfo = {
  id: PlanType;
  name: string;
  price: number;
  priceId: string | null;
  features: string[];
};

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    id: "free",
    name: "無料プラン",
    price: 0,
    priceId: null,
    features: ["店舗掲載", "Instagram URL登録（6件）"],
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    price: 9800,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? "",
    features: ["無料プランの全機能", "空席リアルタイム更新", "予約受付", "基本分析"],
  },
  premium: {
    id: "premium",
    name: "プレミアム",
    price: 29800,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? "",
    features: ["スタンダードの全機能", "AI投稿最適化提案", "詳細分析", "検索結果で優先表示"],
  },
};
```

### Task 1-5: Instagram 同期ライブラリ

**Files:**
- Create: `src/lib/instagram-sync.ts`

旧コードのロジックを `shops` テーブル参照に書き換えて移植する。Graph API v21.0 を使用。shop の instagram_access_token でフィード取得、instagram_posts テーブルに upsert。

### Task 1-6: 静的データ

**Files:**
- Create: `src/data/prefectures.ts`

47都道府県 + 主要都市のデータ。旧コードからそのまま移植。

**Step: コミット**
```bash
git add -A
git commit -m "feat: Stripe・Instagram同期・静的データ追加"
```

---

## Phase 2: レイアウト + UI コンポーネント

### Task 2-1: グローバルスタイル + ルートレイアウト

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

**globals.css:**
```css
@import "tailwindcss";
```

**layout.tsx:**
- Noto Sans JP フォント設定（Google Fonts、weight: 400/500/700）
- metadata: title "Kuuu", description, theme-color #f97316
- viewport: width=device-width, initial-scale=1, viewport-fit=cover
- AuthProvider → AppShell → children → ToastProvider

### Task 2-2: UI コンポーネント（基本セット）

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/bottom-sheet.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/seat-badge.tsx`
- Create: `src/components/ui/index.ts`

各コンポーネントの設計指針:
- Tailwind CSS デフォルト値のみ使用
- `cn()` でクラスマージ
- タッチターゲット 44px 最小
- アイコンのみボタンには `aria-label` 必須
- `seat-badge.tsx`: 4色（green/yellow/red/gray）+ テキスト

### Task 2-3: レイアウトコンポーネント

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/bottom-nav.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/index.ts`

**header.tsx:**
- 固定ヘッダー（z-20）
- 左: 「Kuuu」ロゴ（text-xl font-bold text-orange-500）
- 右: 通知アイコン（Bell）+ アバター → マイページリンク
- 通知バッジ（赤丸 + 件数）

**bottom-nav.tsx:**
- 固定ボトムナビ（z-20）
- 4タブ: ホーム(Home), 検索(Search), お気に入り(Heart), マイページ(User)
- 選択中: text-orange-500 + ラベル表示
- 非選択: text-gray-400

**app-shell.tsx:**
- ダッシュボード・認証・ランディングページではヘッダー/ボトムナビ非表示
- pt-14（ヘッダー高さ）+ pb-20（ボトムナビ高さ）

### Task 2-4: プロバイダー

**Files:**
- Create: `src/components/providers/auth-provider.tsx`
- Create: `src/components/providers/toast-provider.tsx`

**auth-provider.tsx:**
- マウント時に `supabase.auth.getUser()` → useAuthStore にセット
- `onAuthStateChange` リスナーで状態追従
- 保護ルート（/favorites, /mypage, /reservations, /shop-dashboard）は未認証時 /login にリダイレクト

**Step: コミット**
```bash
git add -A
git commit -m "feat: レイアウト・UIコンポーネント・プロバイダー構築"
```

---

## Phase 3: 認証 + ランディング

### Task 3-1: 認証ページ

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`

**login/page.tsx:**
- Kuuu ロゴ
- メールアドレス + パスワード入力
- [ログイン] ボタン → `supabase.auth.signInWithPassword()`
- 成功 → `/` にリダイレクト
- 「パスワードを忘れた方」リンク
- 「アカウントをお持ちでない方」→ /signup

**signup/page.tsx:**
- アカウントタイプ選択（お店を探す方 / 店舗オーナーの方）
- メールアドレス + パスワード
- [アカウントを作成] → `supabase.auth.signUp({ options: { data: { user_type } } })`
- 確認メール案内 → /login

### Task 3-2: 認証 API Route

**Files:**
- Create: `src/app/api/auth/signup/route.ts`

サーバーサイドでのサインアップ処理。user_type メタデータを含む。

### Task 3-3: ランディングページ

**Files:**
- Create: `src/app/landing/page.tsx`

UI仕様書に基づく:
- ヒーローセクション: 「好きなお店の"今"が見える」
- 特徴3カラム: Instagram連携 / 空席表示 / 予約
- 店舗オーナー向け: 料金プラン3つ
- フッター: ログイン / 利用規約 / プライバシーポリシー

**Step: コミット**
```bash
git add -A
git commit -m "feat: 認証ページ + ランディングページ"
```

---

## Phase 4: ホーム画面（フィード + ストーリー + タブ）

### Task 4-1: フィードコンポーネント

**Files:**
- Create: `src/components/feed/feed-card.tsx`
- Create: `src/components/feed/empty-state.tsx`
- Create: `src/components/feed/index.ts`

**feed-card.tsx:**
- 上部: 店舗アイコン + 店名 + エリア・ジャンル + 投稿時刻
- 右上: 空席バッジ + 距離
- 中央: Instagram 投稿写真
- 下部: ♡お気に入り + キャプション（2行まで）
- タップ → /shop/[id]

### Task 4-2: ストーリーコンポーネント

**Files:**
- Create: `src/components/feed/story-bar.tsx`
- Create: `src/components/feed/story-viewer.tsx`

**story-bar.tsx:**
- 横スクロール、丸型アイコン 56px
- オレンジリング（未読）/ グレーリング（既読）
- 店名（最大6文字）

**story-viewer.tsx:**
- 全画面モーダル（z-50）
- プログレスバー + 自動進行
- 左タップ→前、右タップ→次
- 上スワイプ → 店舗詳細
- 下部: 空席バッジ + [店舗を見る]

### Task 4-3: ホームページ

**Files:**
- Create: `src/app/(main)/page.tsx` (Server Component)
- Create: `src/app/(main)/home-client.tsx` (Client Component)

**page.tsx (Server):**
```typescript
// 認証チェック → フォロー中の店舗ID取得 → Promise.all で並列クエリ:
// 1. フォロー中店舗の投稿
// 2. 近くの店舗（位置情報はクライアントから）
// 3. 人気投稿（直近7日のスコア順）
// 4. ストーリー（24時間以内）
// → HomeClient に props で渡す
```

**home-client.tsx:**
- ストーリーバー
- タブバー: [フォロー中] [近く] [人気]
- 各タブのフィード表示
- 無限スクロール
- フォロー0件時 → 空状態（「近くのお店を探す」ボタン）

**Step: コミット**
```bash
git add -A
git commit -m "feat: ホーム画面 — フィード・ストーリー・タブ"
```

---

## Phase 5: 検索 + お気に入り + マイページ

### Task 5-1: 検索ページ

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/app/search/search-client.tsx`
- Create: `src/components/discover/shop-grid-card.tsx`
- Create: `src/components/discover/nearby-map.tsx`

検索前: エリアボタン + ジャンルグリッド
検索中: リアルタイムサジェスト
検索結果: 2カラムカードグリッド + フィルター（空席あり / 距離順 / 人気順）
マップ表示: Google Maps + ピン + ミニカード

### Task 5-2: お気に入りページ

**Files:**
- Create: `src/app/favorites/page.tsx`
- Create: `src/app/favorites/favorites-client.tsx`

2カラムカードグリッド。長押し → 削除確認ダイアログ。0件時 → 空状態。

### Task 5-3: マイページ

**Files:**
- Create: `src/app/mypage/page.tsx`
- Create: `src/app/mypage/mypage-client.tsx`

プロフィール表示 + メニューリスト（予約一覧 / 通知設定 / 店舗ダッシュボード / ログアウト）。

### Task 5-4: 予約一覧ページ

**Files:**
- Create: `src/app/reservations/page.tsx`
- Create: `src/app/reservations/reservations-client.tsx`

タブ: [今後の予約] [過去の予約]。予約カード（店名 + 日時 + 人数 + ステータス）。キャンセル機能。

**Step: コミット**
```bash
git add -A
git commit -m "feat: 検索・お気に入り・マイページ・予約一覧"
```

---

## Phase 6: 店舗詳細 + 予約

### Task 6-1: 店舗詳細ページ

**Files:**
- Create: `src/app/shop/[id]/page.tsx`
- Create: `src/app/shop/[id]/shop-detail-client.tsx`
- Create: `src/components/shop/instagram-grid.tsx`
- Create: `src/components/shop/post-modal.tsx`
- Create: `src/components/shop/reservation-form.tsx`

**page.tsx (Server):**
```typescript
// shop + seat_status + instagram_posts + follow状態 を Promise.all で取得
// → ShopDetailClient に渡す
```

**shop-detail-client.tsx:**
- メイン写真（240px）
- 店舗情報（店名 / ジャンル / 空席バッジ / フォローボタン / 距離）
- Instagram 投稿グリッド（3カラム）→ タップでモーダル
- 基本情報（住所 / 営業時間 / 電話 / 予算 / 駐車場）
- アクセスマップ（Google Maps 200px）
- 予約セクション（スタンダード以上のみ）

**Step: コミット**
```bash
git add -A
git commit -m "feat: 店舗詳細ページ + 予約フォーム"
```

---

## Phase 7: 店舗ダッシュボード

### Task 7-1: ダッシュボードレイアウト

**Files:**
- Create: `src/app/shop-dashboard/layout.tsx`
- Create: `src/components/dashboard/sidebar.tsx`

サイドバー（PC）/ ハンバーガー（スマホ）。メニュー: 概要 / 空席 / 予約台帳 / Instagram / プロフィール / 分析 / 料金プラン。

### Task 7-2: 概要ページ

**Files:**
- Create: `src/app/shop-dashboard/page.tsx`
- Create: `src/app/shop-dashboard/dashboard-overview.tsx`

今日の数字（予約 / 閲覧 / お気に入り）+ 空席ステータス + 直近予約 + 最新投稿。

### Task 7-3: 空席ステータスページ

**Files:**
- Create: `src/app/shop-dashboard/seats/page.tsx`
- Create: `src/app/shop-dashboard/seats/seats-client.tsx`

大きな4ボタン（空席あり / やや混雑 / 満席 / 本日休業）。タップで即時反映（楽観的更新）。Supabase Realtime。

### Task 7-4: 予約台帳

**Files:**
- Create: `src/app/shop-dashboard/reservations/page.tsx`
- Create: `src/app/shop-dashboard/reservations/reservations-client.tsx`

日付選択 → 予約一覧。確定/キャンセル/完了のステータス変更。

### Task 7-5: Instagram 連携管理

**Files:**
- Create: `src/app/shop-dashboard/instagram/page.tsx`
- Create: `src/app/shop-dashboard/instagram/instagram-client.tsx`

連携ステータス + OAuth フロー + 取得済み投稿一覧 + 手動同期。

### Task 7-6: 店舗プロフィール編集

**Files:**
- Create: `src/app/shop-dashboard/profile/page.tsx`
- Create: `src/app/shop-dashboard/profile/profile-client.tsx`

メイン写真アップロード + 基本情報フォーム（店名 / ジャンル / 説明 / 住所 / 電話 / 予算 / 営業時間）。

### Task 7-7: 集客分析（プレミアム）

**Files:**
- Create: `src/app/shop-dashboard/analytics/page.tsx`
- Create: `src/app/shop-dashboard/analytics/analytics-client.tsx`

プレミアムでない場合 → アップグレード案内。プレミアムの場合 → 期間選択 + グラフ（閲覧数/お気に入り/予約/流入元）+ AI提案。

### Task 7-8: 料金プラン

**Files:**
- Create: `src/app/shop-dashboard/billing/page.tsx`
- Create: `src/app/shop-dashboard/billing/billing-client.tsx`

現在のプラン表示 + 3プランカード + Stripe Checkout 連携。

**Step: コミット**
```bash
git add -A
git commit -m "feat: 店舗ダッシュボード全ページ"
```

---

## Phase 8: API Routes

### Task 8-1: Instagram API Routes

**Files:**
- Create: `src/app/api/instagram/auth/route.ts`
- Create: `src/app/api/instagram/callback/route.ts`
- Create: `src/app/api/instagram/sync/route.ts`
- Create: `src/app/api/instagram/webhook/route.ts`
- Create: `src/app/api/instagram/oembed/route.ts`

OAuth フロー + Graph API v21.0 + Webhook 受信。

### Task 8-2: Stripe API Routes

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/webhook/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`

Checkout Session 作成 + Webhook 署名検証 + Customer Portal。
Webhook で subscriptions テーブルを更新（service_role 使用）。

### Task 8-3: その他 API Routes

**Files:**
- Create: `src/app/api/ai/suggestion/route.ts`
- Create: `src/app/api/shops/ensure/route.ts`

AI提案: Claude API でプレミアムユーザーに投稿最適化提案。
shops/ensure: オーナーの shop がなければ作成、あれば返す。

**Step: コミット**
```bash
git add -A
git commit -m "feat: API Routes — Instagram・Stripe・AI・Shops"
```

---

## Phase 9: パートナー + 管理者

### Task 9-1: パートナーポータル

**Files:**
- Create: `src/app/partner/page.tsx`
- Create: `src/app/partner/layout.tsx`
- Create: `src/app/partner/partner-dashboard.tsx`

紹介実績 + 報酬管理。

### Task 9-2: 管理画面

**Files:**
- Create: `src/app/admin/page.tsx`

店舗一覧 + サブスクリプション状況。

**Step: コミット**
```bash
git add -A
git commit -m "feat: パートナーポータル + 管理画面"
```

---

## Phase 10: 最終調整

### Task 10-1: 型チェック + ビルド

```bash
npx tsc --noEmit
npm run build
```

全エラーを修正して通るまで繰り返す。

### Task 10-2: CLAUDE.md 最終更新

プロジェクト指示書を最終的なディレクトリ構造・コマンドで更新。

**Step: 最終コミット**
```bash
git add -A
git commit -m "chore: 型チェック通過・ビルド成功・CLAUDE.md更新"
```

---

## 依存関係グラフ

```
Phase 0 (初期化)
  ↓
Phase 1 (基盤: 型・lib・ストア)
  ↓
Phase 2 (レイアウト・UI)
  ↓
Phase 3 (認証・ランディング) ←── Phase 8 (API Routes) は並行可能
  ↓
Phase 4 (ホーム)
  ↓
Phase 5 (検索・お気に入り・マイページ)
  ↓
Phase 6 (店舗詳細)
  ↓
Phase 7 (ダッシュボード)
  ↓
Phase 9 (パートナー・管理)
  ↓
Phase 10 (最終調整)
```

Phase 3 と Phase 8 は並行実装可能。Phase 4〜7 は順番通り。
