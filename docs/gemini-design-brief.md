# デザイン依頼: 店舗ダッシュボード & プロフィール編集ページ

## プロジェクト概要
飲食店向け Instagram 連携集客サービス。店舗オーナーが空席管理・Instagram連携・予約管理・集客分析を行うダッシュボード。

## 技術スタック
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4（CSS変数ベース）
- Lucide React（アイコン）
- モバイルファースト

## デザインで使用している CSS 変数
```css
--color-primary         /* メインカラー（オレンジ系） */
--color-primary-hover
--color-primary-light
--color-text-primary    /* テキスト濃 */
--color-text-secondary  /* テキスト中 */
--color-text-muted      /* テキスト薄 */
--color-surface         /* カード背景 */
--color-surface-secondary
--color-border          /* ボーダー */
--color-success / --color-warning / --color-danger
```

---

## 1. 店舗ダッシュボード (`/shop-dashboard`)

### 現在の構成
1. **ヘッダー**: 「店舗ダッシュボード」タイトル + 店舗名
2. **空席ステータス**: 4つのワンタップボタン（空き/混雑/満席/閉店）
3. **サマリーカード**: 今日の予約数 / 今月の予約数 / Instagram投稿数（3カラム）
4. **クイックアクション**: 6つのリンクカード（Instagram連携 / 空席更新 / 予約台帳 / 店舗設定 / 料金プラン / 集客分析）
5. **AI投稿最適化提案**: プレミアム機能
6. **今日の予約一覧**: カード形式

### データ
```typescript
type Shop = {
  id: string;
  name: string;
  genre: string;
  plan_type: "free" | "standard" | "premium";
  is_open: boolean;
  // ... 他のフィールド
};

type SeatStatusType = "available" | "busy" | "full" | "closed";

// サマリー数値
todayReservations: Reservation[]  // 今日の予約
monthlyCount: number              // 今月の予約数
instagramPostCount: number        // Instagram投稿数
currentSeatStatus: SeatStatusType // 現在の空席状態
```

### 機能要件
- 空席ステータスはワンタップで即時更新（楽観的UI）
- 空席=緑 / 混雑=黄 / 満席=赤 / 閉店=グレー
- クイックアクションから各管理画面に遷移
- 予約カードには時間・人数・ステータス・備考を表示

### 現在のコード
ファイル: `src/app/shop-dashboard/page.tsx`（514行）

---

## 2. 店舗プロフィール編集 (`/shop-dashboard/profile`)

### 現在の構成
1. **戻るボタン + タイトル**
2. **基本情報（読み取り専用）**: 店舗名 / ジャンル
3. **写真アップロード**: 最大3枚、グリッド表示、ホバーで削除ボタン
4. **編集フォーム**: 住所 / 営業時間 / 定休日 / 予算目安 / 電話番号 / 紹介文
5. **保存ボタン**

### データ
```typescript
// フォームフィールド
description: string      // 紹介文
businessHours: string    // 営業時間
closedDays: string       // 定休日
phone: string            // 電話番号
priceRange: string       // 予算目安
address: string          // 住所（変更時に自動ジオコーディング）
atmospherePhotos: string[] // 写真URL（最大3枚）
```

### 機能要件
- 写真はアップロード時に即座にDB保存
- 住所変更時に Google Maps API でジオコーディング → マップピン更新
- 保存成功/エラーのフィードバック表示
- 写真は Supabase Storage にアップロード（5MB制限）

### 現在のコード
ファイル: `src/app/shop-dashboard/profile/page.tsx`（430行）

---

## デザイン方針の希望
- **モバイルファースト**（スマホ画面での操作性を最優先）
- **タッチターゲット最小44px**
- **日本語テキストの可読性**（`leading-relaxed`, `text-pretty`）
- 現在のオレンジ系カラースキーム（CSS変数）を活かす
- シンプルで直感的な操作（飲食店オーナーはITリテラシーが高くない前提）

## 料金プラン（参考）
| プラン | 月額 | 機能 |
|--------|------|------|
| 無料 | ¥0 | 店舗掲載 + Instagram URL登録（6件） |
| スタンダード | ¥9,800 | 空席リアルタイム更新 + 予約受付 |
| プレミアム | ¥29,800 | AI投稿最適化 + 詳細分析 + 優先表示 |
