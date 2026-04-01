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

### スプリントプロセス（9フェーズ: 0〜8）

**重要:** ユーザーは開発未経験者。各フェーズの完了時に次のフェーズを案内し、順番にガイドすること。
スラッシュコマンドの入力は不要。文脈から自動的にスキルを起動する。

新規事業・新機能の開発は、必ず以下の順序で進める:

| Phase | フェーズ名 | やること | gstack スキル | トリガーキーワード |
|-------|-----------|---------|--------------|-------------------|
| 0 | アイデア検証 | 課題の深掘り、ユーザー像、競合分析、MVP定義 | /office-hours | 「アイデア」「相談」「何を作る」「ブレスト」「新しい事業」 |
| 1 | 計画レビュー | CEO視点でスコープ判断 → 技術設計 → テスト計画 | /plan-ceo-review → /plan-eng-review | 「計画」「レビュー」「スコープ」「設計確認」 |
| 2 | デザイン | UI/UXデザインシステム構築、モックアップ作成 | /design-consultation → /design-shotgun | 「デザイン」「UI」「画面設計」「モックアップ」 |
| 3 | 実装 | コードを書く。TDD（テスト先行）で進める | （通常の開発作業） | 「実装して」「作って」「機能追加」「コード書いて」 |
| 4 | コードレビュー | バグ・設計問題・セキュリティの検査 | /review → /cso | 「レビューして」「チェックして」「確認して」 |
| 5 | QA テスト | 実際のブラウザで動作確認、バグ修正 | /qa | 「QA」「テスト」「動作確認」「バグ確認」 |
| 6 | 出荷 | テスト実行 → PR 作成 → プッシュ | /ship | 「シップ」「出荷」「PR作って」「プッシュ」 |
| 7 | デプロイ | PR マージ → 本番反映 → ヘルスチェック | /land-and-deploy → /canary | 「デプロイ」「マージ」「本番反映」「リリース」 |
| 8 | リリース後 | 振り返り → ドキュメント更新 → 学び記録 | /retro → /document-release → /learn | 「振り返り」「まとめ」「ドキュメント更新」 |

### フェーズ進行ルール
1. **各フェーズ完了時**: 「Phase N 完了。次は Phase N+1: ○○ です。進めますか？」と案内する
2. **フェーズ飛ばし禁止**: Phase 0 → 1 → 2 → ... → 8 の順序を守る（ただしバグ修正等の小タスクは例外）
3. **バグ修正・緊急対応**: /investigate を使用（フェーズ順序の例外）
4. **途中参加**: 既存プロジェクトの改善は、該当フェーズから開始してよい

### 利用可能なスキル一覧
/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-shotgun, /design-html, /review, /ship,
/land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa,
/qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful,
/freeze, /guard, /unfreeze, /gstack-upgrade, /learn, /checkpoint, /health
