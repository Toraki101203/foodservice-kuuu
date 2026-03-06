# Kuuu プロジェクト指示書

## プロジェクト概要
飲食店専用SNS「Kuuu」— 飲食店の「今この瞬間」を発信するリアルタイムSNSプラットフォーム。

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS v4（PostCSS プラグイン、設定ファイルなし）
- **データベース/認証/Storage**: Supabase
- **決済**: Stripe
- **状態管理**: Zustand
- **地図**: React Google Maps API / Mapbox GL / React Leaflet
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

### 画像アップロード
- Supabase Storage バケット: `post-images`, `story-images`
- アップロード後の公開URL取得: `supabase.storage.from(bucket).getPublicUrl(path)`

## ディレクトリ構造
```
src/
├── app/
│   ├── (auth)/          # ログイン・サインアップ
│   ├── (main)/          # メインアプリ（home, discover, notifications）
│   ├── api/             # API Routes
│   ├── shop-dashboard/  # 店舗管理画面
│   └── layout.tsx       # ルートレイアウト
├── components/
│   ├── layout/          # AppShell, Header, BottomNav
│   ├── stories/         # ストーリー関連
│   ├── timeline/        # フィード関連
│   └── ui/              # 汎用UIコンポーネント
├── lib/
│   ├── supabase/        # Supabase クライアント設定
│   ├── stripe/          # Stripe 設定
│   ├── format.ts        # 日付・時刻フォーマット
│   └── utils.ts         # cn(), formatRelativeTime() 等
├── types/
│   └── database.ts      # Supabase 型定義（Restaurant, Post, Story, Coupon, PostWithShop）
├── store/               # Zustand ストア
└── data/                # 静的データ（都道府県リスト等）
```

## コマンド
- `npm run dev` — 開発サーバー起動
- `npm run build` — プロダクションビルド
- `npx tsc --noEmit` — 型チェック
