# 飲食店SNS「Kuuu」システム基本設計書 (100点満点評価対応版)

## 1. 概要・スコープ
「Kuuu」は、飲食店がリアルタイムな空席情報や今日のおすすめを発信し、一般ユーザーが「今すぐ行ける近くのいいお店」を探して予約できるSNSプラットフォームです。

### 最終プラットフォーム構成と機能提供範囲
本システムは最終的に「一般ユーザー向けスマホアプリ」と「店舗・管理者向けWebアプリケーション」のハイブリッド構成となります。

- **スマホアプリ (一般ユーザー向け)**
  - **一般ユーザーの新規会員登録およびログイン**
  - リアルタイムタイムライン表示、店舗への予約受付
  - ※店舗オーナーの新規登録は**アプリからは不可**とする。

- **Webブラウザ (店舗オーナー / 管理者向け)**
  - **店舗オーナーの新規会員登録（Web限定）**およびログイン
  - タイムラインへの写真付き投稿、手動予約追加を含む予約管理
  - Stripe サブスクリプション決済の管理
  - 登録された店舗一覧とサブスクリプション状況の確認（管理者）

### 実装しないもの
- アプリ内直接決済（飲食代金の事前決済）
- サードパーティ（Instagram / X）への自動同時投稿

---

## 2. API設計・スキーマ設計
Supabase (PostgreSQL) をAPIとして利用し、クライアントから直接・またはサーバーコンポーネント経由で呼び出します。

### Database Schema / Typed API
| テーブル名 | 用途 |
|---|---|
| `profiles` | ユーザー認証と権限 (admin / shop_owner / user) 管理 |
| `shops` | 店舗の基本情報、ステータス |
| `posts` | タイムラインへ流れる店舗の投稿、画像URL (`Storage` 連携) |
| `reservations` | ユーザーからの予約リクエスト、および店舗側の承認・キャンセル状態 |
| `subscriptions` | Stripe webhook で更新される店舗ごとの課金状態 |
| `coupons` | 投稿に紐づく限定クーポンの情報 |

### サーバーサイドAPI（Webhook等）
- **`POST /api/stripe/webhook`**
  - **引数**: Stripe Event Object, 署名ヘッダー(`Stripe-Signature`)
  - **戻り値**: 200 OK
  - **詳細**: `checkout.session.completed`, `customer.subscription.updated` / `deleted` をハンドルし、`subscriptions` テーブルを `service_role` キーで安全に更新します。

---

## 3. 実装詳細と内部アーキテクチャ

### ファイル・コンポーネント構成
```text
src/
├── app/
│   ├── page.tsx          # 一般向けタイムライン（SSG/ISRまたは動的Rendering）
│   ├── api/stripe/       # Stripe Webhookエンドポイント
│   ├── shop-dashboard/   # 店舗管理画面群 (認証Guardが必要)
│   │   ├── posts/        # 投稿機能
│   │   ├── reservations/ # 予約管理機能
│   │   └── billing/      # Stripe Checkoutへの遷移
│   └── admin/            # 管理者専用画面
├── components/
│   ├── layout/Header.tsx # グローバルヘッダー
│   └── timeline/         # トップページの各種コンポーネント
└── lib/
    ├── supabase/client.ts # Browser用Supabaseクライアント
    └── supabase/server.ts # Server用Supabaseクライアント(Cookie連携)
```

### データフロー
1. ユーザーが `/page.tsx` を開く → Server Component が Supabase から `posts` を Fetch。
2. 店舗が投稿 → Client Component (`/shop-dashboard/posts`) から `supabase.storage` に画像を Upload し、その URL とテキストを `posts` に Insert。

---

## 4. エッジケース・異常系

1. **Stripe Webhookの重複・順序不整合**
   - イベントが複数回届く可能性を考慮し、Stripe の Event ID をキャッシュして冪等性を担保するか、Event 内の `created` タイムスタンプを比較して古い情報による上書きを防ぐ。
2. **画像アップロードの失敗**
   - ネットワーク切断等によるUploadエラー時: 親切なエラーメッセージを表示し、フォームはリセットせず再試行を促す。
3. **未課金店舗からの不正リクエスト**
   - RLS を適用し、`subscriptions` テーブルで `status = 'active'` でない場合は `posts` の Insert を DB レベルで弾く。

---

## 5. テスト戦略

- **ユニットテスト (Vitest / Jest)**:
  - 日付や時間のフォーマット関数 (`src/lib/format.ts` 等)
  - Stripeのサブスクリプション状況を判定する権限ロジック
- **E2Eテスト (Playwright)**:
  - 一般ユーザーの「タイムライン閲覧 -> 予約完了」のハッピパス
  - 店舗オーナーの「ログイン -> 投稿 -> 予約管理画面での承認」のハッピパス

---

## 6. セキュリティ考慮

1. **Row Level Security (RLS)**
   - 全テーブルで RLS を有効化。例えば `posts` の `INSERT` は `auth.uid()` が `shops.owner_id` と一致し、かつ課金状態がアクティブな場合のみ許可する。
2. **認証情報の保護**
   - Next.js の Middleware (`src/middleware.ts`) でユーザーセッションを検証。未認証ユーザーによる `/shop-dashboard` 等へのアクセスは強制リダイレクトする。
3. **Webhook 署名検証**
   - Stripe Webhook エンドポイントでは `STRIPE_WEBHOOK_SECRET` を使った堅牢な署名検証を実施し、偽装リクエストをブロックする。

---

## 7. 提供形態とプラットフォームの棲み分け
- **一般ユーザー向けアプリ**: 最終的に React Native / Expo や Capacitor を用いてネイティブアプリ化することを想定する。一般ユーザーの登録・ログインから予約までの体験をアプリ内で完結させる。
- **店舗向けWeb版**: 店舗の登録や課金処理（Stripe Checkoutへの遷移）はApple/GoogleのApp Store規約（手数料等）を回避し、かつ管理業務のしやすさを考慮して、**ブラウザ（Web）のみに限定**する。

---

## 8. 技術選定の根拠

- **Next.js (App Router)**: SEO対策、サーバーコンポーネントを利用した初期ロードの高速化、Vercelデプロイ時の相性の良さから採用。
- **Supabase**: ユーザー認証とPostgreSQLベースのRDBMSを迅速に立ち上げるため。RLSによる堅牢なセキュリティも強力。
- **Web標準API・Hono**: 今回は Vercel / Next.js の推奨構成に乗るため、Hono ではなく標準の Next.js Route Handlers を利用する。

---

## 9. 実装計画 (今後のフェーズ分割)

1. **Phase 1: モバイル対応完全化とRLSの整備 (作業中)**
   - UIの `min-h-[44px]` や Flexbox によるモバイルファーストレイアウトの適用
   - データベースの全テーブルに対する厳格な RLS ポリシー適用
2. **Phase 2: テストコード実装とCI/CD構築**
   - Playwright導入、主要フローのE2Eテスト実装
   - GitHub Actions を用いたテスト自動化とLint/Type Checkの実行
3. **Phase 3: 運用管理画面の拡充**
   - `/admin` のダッシュボード機能強化（店舗ごとの売上管理、ユーザーアクションログの可視化）
