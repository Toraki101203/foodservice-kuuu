# 飲食店向けInstagram連携集客サービス — 設計書

## 1. 概要

### サービスコンセプト
飲食店がInstagramで発信しているのに集客に繋げられない問題を解決するアプリ。
近くの飲食店をInstagramの最新投稿付きで発見できる。
「知らない店に偶然出会える」体験を提供する。

### 競合との差別化
| 項目 | ホットペッパー・食べログ | このサービス |
|---|---|---|
| 掲載コスト | 月数万円〜 | 無料〜 |
| 情報の鮮度 | 静的 | Instagram連携でリアルタイム |
| 発見のされ方 | 検索中心 | 位置情報・現在地から自動表示 |
| 空席情報 | 予約用のみ | リアルタイム表示 |

### スコープ
**実装する:**
- 現在地周辺の飲食店表示（Instagram投稿付き、地図+リスト切替）
- 空席リアルタイム表示（店舗がボタン一つで更新）
- 予約機能（スタンダード以上）
- Instagram投稿の自動最適化提案（AI、プレミアム）
- 集客分析ダッシュボード（プレミアム）
- 営業パートナー管理ポータル（紹介コード・収益確認・振込履歴）

**実装しない:**
- SNSタイムライン/フィード機能（旧モグリス機能、削除）
- ストーリー機能（削除）
- いいね/コメント機能（削除）
- フォロー機能（お気に入りに統一）
- キャバクラ・スナック向け横展開（Phase3以降）

---

## 2. アーキテクチャ

### 技術スタック（既存を維持）
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4
- **データベース/認証/Storage**: Supabase
- **決済**: Stripe
- **状態管理**: Zustand
- **地図**: React Google Maps API / Leaflet
- **アイコン**: Lucide React
- **AI**: Claude API（投稿最適化提案）

### ユーザー種別

| 種別 | 説明 | user_type |
|------|------|-----------|
| 一般ユーザー | 飲食店を探す消費者 | `general` |
| 店舗オーナー | 飲食店を運営 | `restaurant_owner` |
| 営業パートナー | 店舗を紹介、収益を受け取る | `partner` |

### 画面構成

```
一般ユーザー向け:
  /                → 地図+リスト（メイン画面）
  /shop/[id]       → 店舗詳細（Instagram投稿・空席・予約）
  /favorites       → お気に入り店舗
  /mypage          → プロフィール・予約履歴

店舗オーナー向け:
  /shop-dashboard           → ダッシュボード（空席更新・予約管理）
  /shop-dashboard/instagram → Instagram連携設定
  /shop-dashboard/analytics → 集客分析（プレミアム）
  /shop-dashboard/billing   → 料金プラン管理

営業パートナー向け:
  /partner         → パートナーポータル

管理者向け:
  /admin           → 全体管理

認証:
  /login           → ログイン
  /signup          → サインアップ
```

### 料金プラン

| プラン | 月額 | 機能 |
|--------|------|------|
| 無料 | ¥0 | 掲載 + Instagram URL登録のみ |
| スタンダード | ¥9,800 | 空席リアルタイム + 予約受付 |
| プレミアム | ¥29,800 | AI最適化 + 集客分析 + 優先表示 |

※金額は後日、維持費を考慮して再検討

---

## 3. データベース設計

### 既存テーブル（活用）

| テーブル | 変更 |
|---------|------|
| `users` | `user_type` に `partner` を追加 |
| `restaurants` | `instagram_url`, `instagram_username` カラム追加 |
| `seat_status` | そのまま |
| `reservations` | そのまま |
| `favorites` | そのまま |
| `menus` | そのまま |
| `notifications` | そのまま |
| `restaurant_images` | そのまま |

### 削除テーブル

| テーブル | 理由 |
|---------|------|
| `posts` | SNS機能 → Instagram連携に置換 |
| `post_images` | 同上 |
| `post_likes` | いいね機能不要 |
| `comments` | コメント機能不要 |
| `follows` | お気に入りに統一 |
| `shop_courses` | 優先度低 |

### 新規テーブル

```sql
-- Instagram投稿キャッシュ
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  instagram_post_id TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  permalink TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 営業パートナー
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- パートナー紹介実績
CREATE TABLE partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  contracted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- パートナー振込
CREATE TABLE partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/paid
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 集客分析イベント
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- view/click/reserve/favorite
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### インデックス
```sql
CREATE INDEX idx_instagram_posts_restaurant ON instagram_posts(restaurant_id);
CREATE INDEX idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);
CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_restaurant ON partner_referrals(restaurant_id);
CREATE INDEX idx_analytics_events_restaurant ON analytics_events(restaurant_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
```

---

## 4. 主要コンポーネント設計

### 一般ユーザー側

**メイン画面（`/`）**
- ヘッダー: 検索バー（エリア/ジャンル）+ フィルター（空席あり/ジャンル/距離）
- 地図ビュー: 現在地中心に店舗ピン表示。ピンタップ → ミニカード
- リストビュー: カードリスト（Instagram投稿サムネイル・空席バッジ・距離）
- タブで地図/リスト切替
- ボトムナビ: ホーム | お気に入り | 予約履歴 | マイページ

**店舗詳細（`/shop/[id]`）**
- Instagram投稿カルーセル（ヘッダー画像として）
- 空席状況バッジ（リアルタイム）
- 基本情報（住所・営業時間・電話）
- Instagram投稿グリッド
- メニュー一覧
- 予約ボタン（スタンダード以上）
- お気に入りボタン

### 店舗オーナー側

**ダッシュボード（`/shop-dashboard`）**
- 空席ステータス切替（ワンタップ: 空き/混雑/満席/閉店）
- 本日の予約一覧
- Instagram連携設定（URL登録）
- 集客分析グラフ（プレミアム）
- AI投稿最適化提案（プレミアム）

### パートナーポータル（`/partner`）

- 紹介コード表示・コピー
- 紹介店舗一覧（プラン・契約日・ステータス）
- 月次収益サマリー
- 振込履歴

---

## 5. Instagram連携設計

### ベータ版: 手動連携方式

1. 店舗オーナーがダッシュボードでInstagramユーザー名を登録
2. オーナーが手動で投稿URLを追加（最大6件）
3. oEmbed API（`https://graph.facebook.com/v18.0/instagram_oembed`）で投稿メタデータを取得
4. `instagram_posts` テーブルにキャッシュ
5. ユーザー側でグリッド表示 + タップでInstagramへ遷移

### 将来: Graph API連携
- Metaアプリ審査通過後、自動取得に移行
- 店舗がInstagramビジネスアカウントをOAuth連携
- 定期Cronで最新投稿を自動キャッシュ

---

## 6. AI投稿最適化（プレミアム機能）

### 仕組み
- 集客分析データ（閲覧数・予約数・時間帯別アクセス）を基に
- Claude APIで投稿提案を生成
- 具体的な提案例: 「今日17時に "本日限定ハッピーアワー" の投稿が効果的です」

### 実装
- API Route: `/api/ai/suggestion`
- ダッシュボードに「AI提案」セクション
- 1日1回自動生成 or オーナーがボタンで手動生成

---

## 7. 営業パートナー制度

### レベニューシェア
- スタンダード契約: ¥2,000/店/月
- プレミアム契約: ¥5,000/店/月
- 契約が続く限り毎月還元
- マルチ商法ではない: 自分が契約した店のみ還元、階層なし

### パートナーポータル機能
- 紹介コード発行・管理
- 紹介実績の確認
- 月次収益レポート
- 振込履歴の確認

---

## 8. 開発アプローチ

**段階的リファクタリング方式:**
1. SNS機能（タイムライン/ストーリー/いいね/コメント）を削除
2. 地図+リスト中心UIに再構築
3. Instagram手動連携追加
4. パートナーポータル追加
5. AI機能・分析ダッシュボード追加
6. Stripe料金プラン調整

既存のSupabaseテーブル（restaurants, seat_status, reservations）と
認証・Stripe基盤はそのまま活用する。
