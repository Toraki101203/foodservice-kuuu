# モグリス 完全リビルド設計書

作成日: 2026-03-15

## 1. 概要

### 目的
モグリス（飲食店SNSプラットフォーム）のデータベース・フロントエンド・バックエンドをすべて0から再構築する。

### 方針
- **完全リセット**: `npx create-next-app@latest` でプロジェクト初期化
- **DB統合**: 12マイグレーション → クリーンな1本に統合。`restaurants` テーブル廃止、`shops` に統一
- **保持するもの**: `docs/`, `.env.local`, `.claude/` のみ
- **仕様基準**: `docs/plans/2026-03-09-kuuu-redesign-design.md`（UI/UX設計書）

## 2. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイリング | Tailwind CSS v4（PostCSS プラグイン） |
| DB/認証/Storage | Supabase |
| 決済 | Stripe（3プラン: 無料/¥9,800/¥29,800） |
| 状態管理 | Zustand |
| 地図 | React Google Maps API |
| AI | Claude API（@anthropic-ai/sdk）|
| アイコン | Lucide React |
| アニメーション | motion（framer-motion ではない） |
| ユーティリティ | clsx + tailwind-merge, date-fns |

### 削除パッケージ（旧プロジェクトから除外）
- leaflet, react-leaflet, @types/leaflet（Google Maps に統一）
- mapbox-gl, @types/mapbox-gl（同上）
- framer-motion（motion と重複）
- react-easy-crop（不使用）
- pg（Supabase 経由で不要）
- babel-plugin-react-compiler（未使用）

## 3. データベーススキーマ

### テーブル一覧（全15テーブル）

#### コアテーブル
| テーブル | 用途 |
|---------|------|
| `profiles` | ユーザー（auth.users トリガー連携） |
| `shops` | 店舗情報（統一テーブル） |
| `seat_status` | 空席状況（4段階） |
| `follows` | ユーザー→店舗フォロー |
| `favorites` | お気に入り |
| `reservations` | 予約 |

#### Instagram 連携
| テーブル | 用途 |
|---------|------|
| `instagram_posts` | 投稿キャッシュ |
| `instagram_stories` | 24h ストーリー |

#### ビジネス機能
| テーブル | 用途 |
|---------|------|
| `subscriptions` | Stripe 課金状態 |
| `notifications` | 通知 |
| `analytics_events` | 集客分析 |

#### パートナー
| テーブル | 用途 |
|---------|------|
| `partners` | パートナー登録 |
| `partner_referrals` | 紹介実績 |
| `partner_payouts` | 振込管理 |

### 旧スキーマとの主要変更点
- `restaurants` → `shops` に統一（全外部キーを shops 参照に変更）
- `users` → `profiles` に名称統一
- `subscriptions` テーブル新設（旧: shops.plan_type に直接格納）
- `menus`, `post_images`, `post_likes`, `comments`, `restaurant_images`, `coupons` — 廃止
- Custom ENUM 型の導入（user_type, plan_type, seat_status_type 等）
- updated_at 自動更新トリガー

### SQL ファイル
`docs/sql/001_clean_schema.sql` — Supabase SQL Editor でコピペ実行

### ストレージバケット
- `avatars` — ユーザーアバター（公開）
- `shop-photos` — 店舗写真（公開）

### RLS ポリシー方針
- 全テーブル RLS 有効
- profiles: 全員閲覧可、本人のみ更新
- shops: 全員閲覧可、owner_id 一致で更新・削除
- seat_status: 全員閲覧可、店舗オーナーのみ更新
- follows/favorites: 本人のみ CRUD（follows は全員閲覧可）
- reservations: 本人 + 店舗オーナーが閲覧・更新
- subscriptions: 店舗オーナーのみ閲覧（更新は service_role のみ）

## 4. ディレクトリ構造

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (main)/page.tsx              # ホーム（フォロー中/近く/人気）
│   ├── api/auth/signup/route.ts
│   ├── api/instagram/auth/route.ts
│   ├── api/instagram/callback/route.ts
│   ├── api/instagram/oembed/route.ts
│   ├── api/instagram/webhook/route.ts
│   ├── api/instagram/sync/route.ts
│   ├── api/stripe/checkout/route.ts
│   ├── api/stripe/portal/route.ts
│   ├── api/stripe/webhook/route.ts
│   ├── api/ai/suggestion/route.ts
│   ├── api/shops/ensure/route.ts
│   ├── favorites/page.tsx
│   ├── landing/page.tsx
│   ├── mypage/page.tsx
│   ├── reservations/page.tsx
│   ├── search/page.tsx
│   ├── shop/[id]/page.tsx
│   ├── shop-dashboard/
│   │   ├── page.tsx                 # 概要
│   │   ├── layout.tsx
│   │   ├── seats/page.tsx
│   │   ├── reservations/page.tsx
│   │   ├── instagram/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── billing/page.tsx
│   ├── partner/page.tsx
│   ├── admin/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # Button, Card, Avatar, Dialog, Toast, Tabs, Skeleton, etc.
│   ├── layout/                      # AppShell, Header, BottomNav
│   ├── feed/                        # FeedCard, StoryBar, StoryViewer, EmptyState
│   ├── discover/                    # NearbyTab, MapView, ShopGridCard
│   ├── shop/                        # InstagramGrid, PostModal, ReservationForm
│   ├── dashboard/                   # Sidebar, AnalyticsCharts
│   └── providers/                   # AuthProvider, ToastProvider
├── lib/
│   ├── supabase/server.ts
│   ├── supabase/client.ts
│   ├── supabase/middleware.ts
│   ├── stripe/server.ts
│   ├── stripe/client.ts
│   ├── stripe/plans.ts
│   ├── analytics.ts
│   ├── instagram-sync.ts
│   ├── format.ts
│   └── utils.ts
├── types/database.ts
├── store/index.ts
├── data/prefectures.ts
└── middleware.ts
```

## 5. アーキテクチャパターン

### データフェッチ
- Server Component で Supabase からデータ取得 → Client Component に props で渡す
- 複数の独立クエリは `Promise.all` で並列実行

### DB操作（クライアント側）
- 楽観的UI更新 + エラー時ロールバック（closure パターン）

### 認証チェック
- Server: `const { data: { user } } = await supabase.auth.getUser()`
- Client: `useEffect` 内で `supabase.auth.getUser()`
- Middleware: Supabase セッション管理

### 状態管理
- Zustand ストア: Auth, Location, UI, Follow, RestaurantOwner

## 6. 設計評価

| # | カテゴリ | 点数 | 備考 |
|---|---------|------|------|
| 1 | 基本構造 | 9 | 全セクション網羅 |
| 2 | 目的・スコープの明確性 | 9 | 完全リビルドの範囲が明確 |
| 3 | API設計の完全性 | 7 | API Routes は実装計画で詳細化 |
| 4 | 競合・代替案との比較 | 8 | リデザイン設計書で定義済み |
| 5 | 内部アーキテクチャ | 8 | ディレクトリ・パターン定義済み |
| 6 | エッジケース・異常系 | 7 | RLS・トリガーで基本カバー |
| 7 | テスト戦略 | 4 | 実装計画で策定 |
| 8 | セキュリティ考慮 | 8 | RLS全テーブル、Webhook署名検証 |
| 9 | 技術選定の根拠 | 9 | 不要パッケージ削除の判断も明記 |
| 10 | 実装計画 | 5 | 次のステップで詳細化 |

**合計: 74/100**

> テスト戦略・実装計画は writing-plans スキルで 90 点以上を目指す。
