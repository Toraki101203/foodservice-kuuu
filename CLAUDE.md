# プロジェクト指示書

## プロジェクト概要
飲食店向け Instagram 連携集客サービス「モグリス（Moguris）」— 飲食店の「今この瞬間」を近くにいる人に届けるSNSプラットフォーム。

### ユーザータイプ
- **一般ユーザー**: 飲食店検索・お気に入り・フォロー・予約
- **店舗オーナー**: 空席管理・Instagram連携・集客分析（shop-dashboard）
- **営業パートナー**: 店舗紹介・報酬管理（partner ポータル）
- **管理者**: 全体管理（admin）

### 料金プラン（店舗向け）
- **無料**: 店舗掲載 + Instagram URL登録（6件）
- **スタンダード ¥9,800/月**: 空席リアルタイム更新 + 予約受付
- **プレミアム ¥29,800/月**: AI投稿最適化 + 詳細分析 + 優先表示

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4（PostCSS プラグイン）
- **データベース/認証/Storage**: Supabase
- **決済**: Stripe（3プラン対応）
- **状態管理**: Zustand
- **地図**: React Google Maps API
- **AI**: Claude API（@anthropic-ai/sdk）— 投稿最適化提案
- **アイコン**: Lucide React
- **アニメーション**: motion
- **ユーティリティ**: clsx + tailwind-merge（`cn` 関数）、date-fns

## アーキテクチャパターン

### データフェッチ
- **Server Component** で Supabase からデータ取得 → **Client Component** に props で渡す
- 複数の独立クエリは `Promise.all` で並列実行
- Server 側: `import { createClient } from "@/lib/supabase/server"`
- Client 側: `import { createClient } from "@/lib/supabase/client"`

### DB操作（クライアント側）
- 楽観的UI更新 + エラー時ロールバック（closure パターン）

### 認証チェック
- Server: `const { data: { user } } = await supabase.auth.getUser()`
- Client: `useEffect` 内で `supabase.auth.getUser()`

### DBテーブル（shops 統一スキーマ）
- profiles, shops, seat_status, follows, favorites, reservations
- instagram_posts, instagram_stories
- subscriptions, notifications, analytics_events
- partners, partner_referrals, partner_payouts

### 分析トラッキング
- `trackEvent(shopId, eventType, metadata?)` — `src/lib/analytics.ts`

## ディレクトリ構造
```
src/
├── app/
│   ├── (auth)/              # ログイン・サインアップ
│   ├── (main)/              # ホーム
│   ├── api/
│   │   ├── ai/suggestion/   # AI投稿最適化API（プレミアム）
│   │   ├── instagram/       # Instagram OAuth・自動同期
│   │   ├── stripe/          # Stripe checkout/webhook/portal
│   │   └── shops/ensure/    # 店舗作成/取得
│   ├── admin/               # 管理画面
│   ├── favorites/           # お気に入り一覧
│   ├── landing/             # ランディングページ
│   ├── mypage/              # マイページ
│   ├── partner/             # 営業パートナーポータル
│   ├── reservations/        # ユーザー予約一覧
│   ├── search/              # 検索
│   ├── shop/[id]/           # 店舗詳細ページ
│   ├── shop-dashboard/      # 店舗管理画面
│   │   ├── analytics/       # 集客分析（プレミアム）
│   │   ├── billing/         # 料金プラン
│   │   ├── instagram/       # Instagram連携管理
│   │   ├── profile/         # 店舗プロフィール編集
│   │   ├── reservations/    # 予約台帳
│   │   └── seats/           # 空席ステータス
│   └── layout.tsx           # ルートレイアウト
├── components/
│   ├── dashboard/           # Sidebar, AnalyticsCharts
│   ├── discover/            # NearbyTab, MapView, ShopGridCard
│   ├── feed/                # FeedCard, StoryBar, StoryViewer
│   ├── layout/              # AppShell, Header, BottomNav
│   ├── providers/           # AuthProvider, ToastProvider
│   ├── shop/                # InstagramGrid, PostModal, ReservationForm
│   └── ui/                  # 汎用UIコンポーネント
├── lib/
│   ├── supabase/            # Supabase クライアント設定
│   ├── stripe/              # Stripe 設定・プラン定義
│   ├── analytics.ts         # 分析イベントトラッキング
│   ├── format.ts            # 日付・時刻フォーマット
│   ├── instagram-sync.ts    # Instagram Graph API 同期
│   └── utils.ts             # cn() 等
├── types/database.ts        # Supabase 型定義
├── store/index.ts           # Zustand ストア
├── data/prefectures.ts      # 都道府県リスト
└── middleware.ts             # Supabase セッション管理
```

## コマンド
- `npm run dev` — 開発サーバー起動
- `npm run build` — プロダクションビルド
- `npx tsc --noEmit` — 型チェック

## 環境変数（要設定）
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` / `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`
- `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `ANTHROPIC_API_KEY`（AI提案用、プレミアム機能）

## gstack（開発スプリントツール）

Web ブラウジングには /browse を使用すること。mcp__claude-in-chrome__* ツールは使用禁止。

### スプリントプロセス（自動適用）
以下のキーワードを検知したら、対応する gstack スキルを**自動的に起動**すること。
ユーザーがスラッシュコマンドを入力しなくても、文脈から適切なスキルを判断して実行する。

| フェーズ | トリガーキーワード | スキル |
|----------|-------------------|--------|
| 1. 構想 | 「アイデア」「何を作る」「相談」「ブレスト」 | /office-hours |
| 2. CEO レビュー | 「CEOレビュー」「プロダクト判断」 | /plan-ceo-review |
| 3. 設計レビュー | 「デザインレビュー」「UI評価」 | /plan-design-review |
| 4. 技術レビュー | 「技術レビュー」「アーキテクチャ確認」 | /plan-eng-review |
| 5. 自動レビュー | 「全レビュー」「autoplan」 | /autoplan |
| 6. コードレビュー | 「レビューして」「PRレビュー」 | /review |
| 7. QA テスト | 「QAして」「テストして」「バグ確認」 | /qa |
| 8. セキュリティ | 「セキュリティチェック」「脆弱性」 | /cso |
| 9. シップ | 「シップ」「PRを作って」「プッシュ」 | /ship |
| 10. デプロイ | 「マージ」「デプロイ」「本番反映」 | /land-and-deploy |
| 11. 振り返り | 「振り返り」「今週のまとめ」 | /retro |
| デバッグ | 「バグ」「なぜ動かない」「調査して」 | /investigate |
| ドキュメント | 「ドキュメント更新」「READMEを直して」 | /document-release |

### 利用可能なスキル一覧
/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship,
/land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa,
/qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful,
/freeze, /guard, /unfreeze, /gstack-upgrade, /learn, /checkpoint, /health
