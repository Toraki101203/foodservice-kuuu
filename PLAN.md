# Phase 1: ストーリー機能 実装計画

## 概要
飲食店が24時間限定のコンテンツ（本日の限定メニュー、空席情報、タイムセール等）を発信できるストーリー機能を実装する。
ホーム画面上部にInstagram風のストーリーバーを表示し、タップで全画面ストーリービューアを開く。

---

## Step 1: データベース — `stories` テーブル作成

**ファイル**: `supabase/migrations/20260303_create_stories_table.sql`

```sql
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE, -- ※実際のテーブル名 shops
  image_url TEXT NOT NULL,
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL, -- 投稿から24時間後
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_stories_shop_id ON public.stories(shop_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);

-- RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active stories" ON public.stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Shop owners can insert stories" ON public.stories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.shops WHERE id = stories.shop_id AND owner_id = auth.uid())
);
CREATE POLICY "Shop owners can delete own stories" ON public.stories FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.shops WHERE id = stories.shop_id AND owner_id = auth.uid())
);

-- リアルタイム
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
```

**型定義追加**: `src/types/database.ts` に `Story` インターフェースを追加

```typescript
export interface Story {
  id: string;
  shop_id: string;
  image_url: string;
  caption: string | null;
  expires_at: string;
  created_at: string;
  shop?: Restaurant;
}
```

---

## Step 2: お店ダッシュボードにストーリー投稿機能を追加

**新規ファイル**: `src/app/shop-dashboard/stories/page.tsx`

### 機能:
- 画像アップロード（`post-images` バケットを再利用）
- キャプション入力（短めのテキスト）
- 投稿ボタン → `stories` テーブルに INSERT（`expires_at` = 現在時刻 + 24時間）
- 現在アクティブなストーリー一覧表示（期限切れ除く）
- ストーリーの削除機能

### UI:
- 上部: 「ストーリーを投稿」フォーム（画像 + キャプション）
- 下部: 現在のアクティブストーリー一覧（残り時間表示付き）

### ダッシュボードへのリンク追加:
`src/app/shop-dashboard/page.tsx` のクイックアクションに「ストーリー投稿」リンクを追加

---

## Step 3: ホーム画面上部にストーリーバーを実装

**新規ファイル**: `src/components/timeline/StoryBar.tsx`

### データ取得（サーバー側: `src/app/(main)/home/page.tsx`）:
1. `stories` テーブルから `expires_at > NOW()` のストーリーを取得
2. shop情報を JOIN
3. shop_id でグループ化（1店舗 = 1つの円形アイコン）
4. ログイン中ならフォロー中の店舗を優先表示

### StoryBar コンポーネント:
- 横スクロール可能なバー
- 各お店を円形アバター（店舗の雰囲気写真1枚目 or 最新ストーリー画像）で表示
- 未閲覧はオレンジのリング、閲覧済みはグレーのリング
- お店の名前を下に小さく表示
- タップでストーリービューアを開く

### 閲覧状態の管理:
- `localStorage` でストーリー閲覧状態を管理（`story_viewed_{storyId}` のキー）
- 簡易的でDB不要

---

## Step 4: ストーリー閲覧画面（全画面ビューア）

**新規ファイル**: `src/components/timeline/StoryViewer.tsx`

### 機能:
- 全画面オーバーレイ表示
- 上部にプログレスバー（複数ストーリーの進捗表示）
- 画像を全画面表示、下部にキャプションオーバーレイ
- 自動再生: 5秒ごとに次のストーリーへ（タップで一時停止/再開）
- 左右タップ / スワイプで前後のストーリーに移動
- 1店舗の全ストーリーを見終わったら次の店舗へ
- 上部に店舗名とアバター + 投稿時刻（「3時間前」等）
- 右上に閉じるボタン（X）

### 状態管理:
- 現在のshopIndex と storyIndex
- `localStorage` に閲覧済みストーリーIDを保存
- タイマー（5秒自動進行）

---

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `supabase/migrations/20260303_create_stories_table.sql` | 新規 | storiesテーブル・RLS・インデックス |
| `src/types/database.ts` | 編集 | Story型追加、Database型にstoriesテーブル追加 |
| `src/app/(main)/home/page.tsx` | 編集 | ストーリーデータ取得、StoryBarに渡す |
| `src/components/timeline/StoryBar.tsx` | 新規 | ストーリーバー（横スクロール円形アイコン） |
| `src/components/timeline/StoryViewer.tsx` | 新規 | 全画面ストーリービューア |
| `src/components/timeline/HomeFeed.tsx` | 編集 | StoryBar表示領域の確保 |
| `src/app/shop-dashboard/stories/page.tsx` | 新規 | ストーリー投稿・管理ページ |
| `src/app/shop-dashboard/page.tsx` | 編集 | ストーリー投稿へのクイックアクション追加 |

---

## 既存機能への影響

- いいね、お気に入り保存、予約、マップ機能には一切変更なし
- 既存の投稿フィード機能はそのまま維持
- ストーリーバーはフィードの上に追加されるのみ
- `post-images` ストレージバケットをストーリー画像にも流用（サブフォルダ `stories/` で管理）
