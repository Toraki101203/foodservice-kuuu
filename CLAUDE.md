# プロジェクト指示書

## プロジェクト概要
飲食店向け Instagram 連携集客サービス — 現在地周辺の飲食店を Instagram 最新投稿付きで発見、空席リアルタイム確認・予約ができるプラットフォーム。

### ユーザータイプ
- **一般ユーザー**: 飲食店検索・お気に入り・予約
- **店舗オーナー**: 空席管理・Instagram連携・集客分析（shop-dashboard）
- **営業パートナー**: 店舗紹介・報酬管理（partner ポータル）
- **管理者**: 全体管理（admin）

### 料金プラン（店舗向け）
- **無料**: 店舗掲載 + Instagram URL登録（6件）
- **スタンダード ¥9,800/月**: 空席リアルタイム更新 + 予約受付
- **プレミアム ¥29,800/月**: AI投稿最適化 + 詳細分析 + 優先表示

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4（PostCSS プラグイン、設定ファイルなし）
- **データベース/認証/Storage**: Supabase
- **決済**: Stripe（3プラン対応）
- **状態管理**: Zustand
- **地図**: React Google Maps API
- **AI**: Claude API（@anthropic-ai/sdk）— 投稿最適化提案
- **アイコン**: Lucide React
- **ユーティリティ**: clsx + tailwind-merge（`cn` 関数）、date-fns

## アーキテクチャパターン

### データフェッチ
- **Server Component** で Supabase からデータ取得 → **Client Component** に props で渡す
- 複数の独立クエリは `Promise.all` で並列実行
- Server 側: `import { createClient } from "@/lib/supabase/server"`
- Client 側: `import { createClient } from "@/lib/supabase/client"`

### DB操作（クライアント側）
- 楽観的UI更新 + エラー時ロールバック（closure パターン）
```typescript
const handleDelete = async (id: string) => {
    const previous = items;
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from("table").delete().eq("id", id);
    if (error) setItems(previous);
};
```

### 認証チェック
- Server: `const { data: { user } } = await supabase.auth.getUser()`
- Client: `useEffect` 内で `supabase.auth.getUser()`

### 分析トラッキング
- `trackEvent(restaurantId, eventType, metadata?)` — `src/lib/analytics.ts`
- イベント: view, favorite, reservation, share, instagram_click

## ディレクトリ構造
```
src/
├── app/
│   ├── (auth)/              # ログイン・サインアップ
│   ├── api/
│   │   ├── ai/suggestion/   # AI投稿最適化API（プレミアム）
│   │   ├── instagram/        # Instagram OAuth・自動同期・oEmbed
│   │   └── stripe/          # Stripe checkout/webhook/portal
│   ├── admin/               # 管理画面
│   ├── partner/             # 営業パートナーポータル
│   ├── reservations/        # ユーザー予約一覧
│   ├── shop-dashboard/      # 店舗管理画面
│   │   ├── analytics/       # 集客分析（プレミアム）
│   │   ├── billing/         # 料金プラン
│   │   ├── instagram/       # Instagram連携管理
│   │   ├── profile/         # 店舗プロフィール編集
│   │   └── reservations/    # 予約台帳
│   ├── shop/[id]/           # 店舗詳細ページ
│   └── layout.tsx           # ルートレイアウト
├── components/
│   ├── dashboard/           # AnalyticsCharts, AiSuggestion
│   ├── discover/            # DiscoverView, MapView, RestaurantCard, SeatBadge
│   ├── landing/             # LandingPage
│   ├── layout/              # AppShell, Header, BottomNav
│   ├── shop/                # InstagramGrid
│   └── ui/                  # 汎用UIコンポーネント
├── lib/
│   ├── supabase/            # Supabase クライアント設定
│   ├── stripe/              # Stripe 設定・プラン定義
│   ├── analytics.ts         # 分析イベントトラッキング
│   ├── format.ts            # 日付・時刻フォーマット
│   └── utils.ts             # cn() 等
├── types/
│   └── database.ts          # Supabase 型定義（Restaurant, InstagramPost, Partner, AnalyticsEvent）
├── store/                   # Zustand ストア
└── data/                    # 静的データ（都道府県リスト等）
```

## コマンド
- `npm run dev` — 開発サーバー起動
- `npm run build` — プロダクションビルド
- `npx tsc --noEmit` — 型チェック

## 環境変数（要設定）
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STANDARD_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID`
- `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`（Instagram自動連携用）
- `NEXT_PUBLIC_SITE_URL`（OAuth コールバックURL）
- `ANTHROPIC_API_KEY`（AI提案用、プレミアム機能）
