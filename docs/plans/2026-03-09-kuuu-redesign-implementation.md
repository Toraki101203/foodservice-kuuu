# モグリス リデザイン実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** モグリス のフロントエンドを SNS ファースト設計で再構築する。バックエンド（API Routes, DB, Stripe, Instagram 連携）は維持。

**Architecture:** Server Component でデータ取得 → Client Component に props で渡す。デザインシステムコンポーネントを先に作り、全ページで再利用。フォロー機能と Instagram ストーリー連携を新規追加。

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Zustand, React Google Maps API, Lucide React

---

## 維持するファイル（変更しない）

```
src/app/api/          — 全 API Routes（13ファイル）
src/lib/supabase/     — server.ts, client.ts, middleware.ts
src/lib/stripe/       — server.ts, client.ts, plans.ts
src/lib/              — instagram-sync.ts, analytics.ts, utils.ts, format.ts
src/types/database.ts — 型定義（Task 1 で拡張）
src/store/index.ts    — Zustand ストア（Task 2 で拡張）
supabase/migrations/  — 既存マイグレーション
middleware.ts         — Supabase セッション管理
```

## 削除するファイル（フロントエンド層）

```
src/app/(auth)/       — 再作成
src/app/shop/         — 再作成
src/app/reservations/ — 再作成
src/app/shop-dashboard/ — 再作成
src/app/page.tsx      — 再作成
src/app/layout.tsx    — 再作成（フォント設定は維持）
src/components/       — 全削除して再作成
```

---

## Phase 1: 基盤（DB + 型 + ストア + デザインシステム）

### Task 1: follows テーブル + instagram_stories テーブル追加

**Files:**
- Create: `supabase/migrations/008_add_follows_and_stories.sql`
- Modify: `src/types/database.ts`

**Step 1: マイグレーション SQL を作成**

```sql
-- follows テーブル（ユーザー → 店舗のフォロー関係）
CREATE TABLE IF NOT EXISTS follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_follows_user_id ON follows(user_id);
CREATE INDEX idx_follows_shop_id ON follows(shop_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
    ON follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows"
    ON follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows"
    ON follows FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can count follows per shop"
    ON follows FOR SELECT USING (true);

-- instagram_stories テーブル（24時間限定コンテンツ）
CREATE TABLE IF NOT EXISTS instagram_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    instagram_media_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    timestamp TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, instagram_media_id)
);

CREATE INDEX idx_instagram_stories_shop_id ON instagram_stories(shop_id);
CREATE INDEX idx_instagram_stories_expires_at ON instagram_stories(expires_at);

ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired stories"
    ON instagram_stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Service role can manage stories"
    ON instagram_stories FOR ALL USING (true);
```

**Step 2: 型定義を拡張（`src/types/database.ts` に追加）**

```typescript
// Follow
export interface Follow {
    id: string;
    user_id: string;
    shop_id: string;
    created_at: string;
}

// Instagram Story
export interface InstagramStory {
    id: string;
    shop_id: string;
    instagram_media_id: string;
    media_url: string;
    media_type: "IMAGE" | "VIDEO";
    timestamp: string;
    expires_at: string;
    fetched_at: string;
    shop?: Restaurant;
}
```

**Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: マイグレーション適用**

Run: `npx supabase db push` (ローカル) or Supabase Dashboard で SQL 実行

**Step 5: コミット**

```bash
git add supabase/migrations/008_add_follows_and_stories.sql src/types/database.ts
git commit -m "feat: follows テーブル + instagram_stories テーブル追加"
```

---

### Task 2: Zustand ストア拡張（follows ストア追加）

**Files:**
- Modify: `src/store/index.ts`

**Step 1: followsStore を追加**

既存の4ストアに追加:

```typescript
// Follow Store
interface FollowState {
    followingIds: Set<string>;
    setFollowingIds: (ids: string[]) => void;
    addFollow: (shopId: string) => void;
    removeFollow: (shopId: string) => void;
    isFollowing: (shopId: string) => boolean;
}

export const useFollowStore = create<FollowState>()((set, get) => ({
    followingIds: new Set<string>(),
    setFollowingIds: (ids) => set({ followingIds: new Set(ids) }),
    addFollow: (shopId) =>
        set((state) => {
            const next = new Set(state.followingIds);
            next.add(shopId);
            return { followingIds: next };
        }),
    removeFollow: (shopId) =>
        set((state) => {
            const next = new Set(state.followingIds);
            next.delete(shopId);
            return { followingIds: next };
        }),
    isFollowing: (shopId) => get().followingIds.has(shopId),
}));
```

**Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: コミット**

```bash
git add src/store/index.ts
git commit -m "feat: useFollowStore 追加"
```

---

### Task 3: デザインシステム — Button コンポーネント

**Files:**
- Create: `src/components/ui/button.tsx`

**Step 1: Button を実装**

```typescript
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base",
    lg: "h-12 px-6 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variantStyles[variant],
                sizeStyles[size],
                className,
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {children}
        </button>
    ),
);
Button.displayName = "Button";
```

**Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: コミット**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: Button コンポーネント（4バリアント × 3サイズ）"
```

---

### Task 4: デザインシステム — Card コンポーネント

**Files:**
- Create: `src/components/ui/card.tsx`

**Step 1: Card を実装**

```typescript
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noBorder?: boolean;
}

export function Card({ className, noBorder, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl bg-white",
                !noBorder && "border border-gray-100 shadow-sm",
                className,
            )}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-4", className)} {...props} />;
}
```

**Step 2: 型チェック → コミット**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: Card コンポーネント"
```

---

### Task 5: デザインシステム — SeatBadge コンポーネント

**Files:**
- Create: `src/components/ui/seat-badge.tsx`

**Step 1: SeatBadge を実装**

```typescript
import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types/database";

const config: Record<SeatStatusType, { label: string; className: string }> = {
    available: { label: "空席あり", className: "bg-green-100 text-green-700" },
    busy: { label: "やや混雑", className: "bg-yellow-100 text-yellow-700" },
    full: { label: "満席", className: "bg-red-100 text-red-700" },
    closed: { label: "休業", className: "bg-gray-100 text-gray-500" },
};

interface SeatBadgeProps {
    status: SeatStatusType;
    className?: string;
}

export function SeatBadge({ status, className }: SeatBadgeProps) {
    const { label, className: badgeClass } = config[status] ?? config.closed;
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", badgeClass, className)}>
            {label}
        </span>
    );
}
```

**Step 2: 型チェック → コミット**

```bash
git add src/components/ui/seat-badge.tsx
git commit -m "feat: SeatBadge コンポーネント"
```

---

### Task 6: デザインシステム — Avatar, Input, Dialog, Toast, BottomSheet

**Files:**
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/bottom-sheet.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/index.ts` (バレルエクスポート)

**Step 1: 各コンポーネントを実装**

`avatar.tsx`:
```typescript
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
    src: string | null | undefined;
    alt: string;
    size?: number;
    className?: string;
}

export function Avatar({ src, alt, size = 40, className }: AvatarProps) {
    return (
        <div className={cn("relative overflow-hidden rounded-full bg-gray-200", className)} style={{ width: size, height: size }}>
            {src ? (
                <Image src={src} alt={alt} fill className="object-cover" sizes={`${size}px`} />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                    {alt.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
}
```

`input.tsx`:
```typescript
import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => (
        <div className="space-y-1">
            {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
            <input
                ref={ref}
                id={id}
                className={cn(
                    "h-11 w-full rounded-xl border border-gray-200 px-4 text-base transition-shadow",
                    "placeholder:text-gray-400",
                    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500",
                    error && "border-transparent ring-2 ring-red-500",
                    className,
                )}
                {...props}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    ),
);
Input.displayName = "Input";
```

`dialog.tsx`:
```typescript
"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        else if (!open && el.open) el.close();
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className={cn(
                "m-auto max-w-sm rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/50",
                "open:animate-in open:fade-in open:zoom-in-95",
            )}
        >
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-gray-600">{description}</p>}
            <div className="mt-4 flex justify-end gap-2">{children}</div>
        </dialog>
    );
}
```

`toast.tsx`:
```typescript
"use client";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

type ToastType = "success" | "error";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let addToast: (message: string, type: ToastType) => void;

export function useToast() {
    return { toast: (message: string, type: ToastType = "success") => addToast?.(message, type) };
}

export function ToastProvider() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    let counter = 0;

    addToast = useCallback((message: string, type: ToastType) => {
        const id = ++counter;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    }, []);

    return (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg",
                        "animate-in fade-in slide-in-from-top-2",
                    )}
                >
                    {t.type === "success" ? (
                        <CheckCircle className="size-5 text-green-600" />
                    ) : (
                        <XCircle className="size-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{t.message}</span>
                </div>
            ))}
        </div>
    );
}
```

`bottom-sheet.tsx`:
```typescript
"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-30" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
                {children}
            </div>
        </div>
    );
}
```

`skeleton.tsx`:
```typescript
import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn("animate-pulse rounded-lg bg-gray-200", className)} />;
}
```

`tabs.tsx`:
```typescript
"use client";
import { cn } from "@/lib/utils";

interface Tab {
    key: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeKey: string;
    onChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
    return (
        <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        "flex-1 py-3 text-center text-sm font-medium transition-colors",
                        activeKey === tab.key
                            ? "border-b-2 border-orange-500 font-bold text-orange-500"
                            : "text-gray-500",
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
```

`index.ts` (バレルエクスポート):
```typescript
export { Button } from "./button";
export { Card, CardContent } from "./card";
export { SeatBadge } from "./seat-badge";
export { Avatar } from "./avatar";
export { Input } from "./input";
export { Dialog } from "./dialog";
export { ToastProvider, useToast } from "./toast";
export { BottomSheet } from "./bottom-sheet";
export { Skeleton } from "./skeleton";
export { Tabs } from "./tabs";
```

**Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: コミット**

```bash
git add src/components/ui/
git commit -m "feat: デザインシステム — Avatar, Input, Dialog, Toast, BottomSheet, Skeleton, Tabs"
```

---

### Task 7: レイアウト — Header + BottomNav + AppShell

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/bottom-nav.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/index.ts`

**Step 1: Header を実装**

```typescript
"use client";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui";
import Link from "next/link";
import { useAuthStore } from "@/store";

export function Header() {
    const user = useAuthStore((s) => s.user);

    return (
        <header className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
            <Link href="/" className="text-xl font-bold text-orange-500">
                モグリス
            </Link>
            <div className="flex items-center gap-3">
                <Link href="/notifications" className="relative" aria-label="通知">
                    <Bell className="size-6 text-gray-600" />
                </Link>
                <Link href="/mypage">
                    <Avatar src={user?.avatar_url} alt={user?.display_name ?? "User"} size={32} />
                </Link>
            </div>
        </header>
    );
}
```

**Step 2: BottomNav を実装**

```typescript
"use client";
import { Home, Search, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
    { href: "/", icon: Home, label: "ホーム" },
    { href: "/search", icon: Search, label: "検索" },
    { href: "/favorites", icon: Heart, label: "お気に入り" },
    { href: "/mypage", icon: User, label: "マイページ" },
] as const;

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center border-t border-gray-200 bg-white pb-safe">
            {items.map(({ href, icon: Icon, label }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex flex-1 flex-col items-center gap-1 text-xs",
                            active ? "text-orange-500" : "text-gray-400",
                        )}
                    >
                        <Icon className="size-6" />
                        {active && <span className="font-medium">{label}</span>}
                    </Link>
                );
            })}
        </nav>
    );
}
```

**Step 3: AppShell を実装**

```typescript
"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

const DASHBOARD_PREFIX = "/shop-dashboard";
const AUTH_PATHS = ["/login", "/signup"];
const NO_SHELL_PATHS = ["/landing"];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
    const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
    const noShell = NO_SHELL_PATHS.includes(pathname);

    if (isAuth || noShell) return <>{children}</>;
    if (isDashboard) return <>{children}</>;

    return (
        <>
            <Header />
            <main className="pt-14 pb-20">{children}</main>
            <BottomNav />
        </>
    );
}
```

**Step 4: index.ts**

```typescript
export { Header } from "./header";
export { BottomNav } from "./bottom-nav";
export { AppShell } from "./app-shell";
```

**Step 5: 型チェック → コミット**

```bash
git add src/components/layout/
git commit -m "feat: Header + BottomNav + AppShell レイアウト"
```

---

### Task 8: AuthProvider + ルートレイアウト

**Files:**
- Create: `src/components/providers/auth-provider.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: AuthProvider を実装**

```typescript
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((s) => s.setUser);
    const setLoading = useAuthStore((s) => s.setLoading);

    useEffect(() => {
        const supabase = createClient();

        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", authUser.id)
                    .single();
                setUser(profile as User | null);
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        loadUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();
                setUser(profile as User | null);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser, setLoading]);

    return <>{children}</>;
}
```

**Step 2: layout.tsx を再作成**

```typescript
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout";
import { ToastProvider } from "@/components/ui";

const notoSansJP = Noto_Sans_JP({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    display: "swap",
    variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
    title: "モグリス — 好きなお店の\"今\"が見える",
    description: "近くの飲食店のリアルタイム情報をInstagramから。空席確認・予約もできる。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja" className={notoSansJP.variable}>
            <body className="font-sans text-gray-700 antialiased">
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                    <ToastProvider />
                </AuthProvider>
            </body>
        </html>
    );
}
```

**Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: コミット**

```bash
git add src/components/providers/auth-provider.tsx src/app/layout.tsx
git commit -m "feat: AuthProvider + ルートレイアウト再構築"
```

---

## Phase 2: 認証（ログイン・サインアップ）

### Task 9: ログインページ

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

**Step 1: 認証レイアウト**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
            {children}
        </div>
    );
}
```

**Step 2: ログインページ（Client Component）**

```typescript
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            setError("メールアドレスまたはパスワードが正しくありません");
            setIsLoading(false);
            return;
        }
        router.push("/");
        router.refresh();
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-orange-500">モグリス</h1>
                <p className="mt-2 text-sm text-gray-500">アカウントにログイン</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="email"
                    label="メールアドレス"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                />
                <Input
                    id="password"
                    label="パスワード"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上"
                    required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" isLoading={isLoading}>
                    ログイン
                </Button>
            </form>
            <p className="text-center text-sm text-gray-500">
                アカウントをお持ちでない方{" "}
                <Link href="/signup" className="font-medium text-orange-500">
                    新規登録
                </Link>
            </p>
        </div>
    );
}
```

**Step 3: 型チェック → コミット**

```bash
git add src/app/\(auth\)/
git commit -m "feat: ログインページ"
```

---

### Task 10: サインアップページ

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`

**Step 1: サインアップページ**

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Link from "next/link";

type UserType = "general" | "restaurant_owner";

export default function SignupPage() {
    const [userType, setUserType] = useState<UserType>("general");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, displayName, userType }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "登録に失敗しました");
            setIsLoading(false);
            return;
        }
        router.push("/login?registered=true");
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-orange-500">モグリス</h1>
                <p className="mt-2 text-sm text-gray-500">新しいアカウントを作成</p>
            </div>
            <div className="flex gap-2">
                {(["general", "restaurant_owner"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setUserType(type)}
                        className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                            userType === type
                                ? "border-orange-500 bg-orange-50 text-orange-600"
                                : "border-gray-200 text-gray-500"
                        }`}
                    >
                        {type === "general" ? "お店を探す方" : "店舗オーナーの方"}
                    </button>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="displayName" label="表示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                <Input id="email" label="メールアドレス" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input id="password" label="パスワード" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" required />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" isLoading={isLoading}>アカウントを作成</Button>
            </form>
            <p className="text-center text-sm text-gray-500">
                すでにアカウントをお持ちの方{" "}
                <Link href="/login" className="font-medium text-orange-500">ログイン</Link>
            </p>
        </div>
    );
}
```

**Step 2: 型チェック → コミット**

```bash
git add src/app/\(auth\)/signup/page.tsx
git commit -m "feat: サインアップページ（一般/オーナー切り替え）"
```

---

## Phase 3: ホーム画面（コア体験）

### Task 11: ホームページ — Server Component + タブ構成

**Files:**
- Create: `src/app/(main)/page.tsx` (Server Component)
- Create: `src/app/(main)/layout.tsx`
- Create: `src/app/(main)/home-client.tsx` (Client Component)

**Step 1: メインレイアウト**

```typescript
export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
```

**Step 2: Server Component でデータ取得**

```typescript
import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "./home-client";

export default async function HomePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // 未ログインはランディングページへ（Task 25 で実装）
        const { redirect } = await import("next/navigation");
        redirect("/landing");
    }

    // 並列でデータ取得
    const [followingRes, nearbyRes, popularRes, storiesRes] = await Promise.all([
        // フォロー中の店舗の最新投稿
        supabase
            .from("instagram_posts")
            .select("*, restaurant:shops!inner(id, name, genre, address, main_image, latitude, longitude, seat_status(status))")
            .in("restaurant_id",
                supabase.from("follows").select("shop_id").eq("user_id", user.id)
            )
            .order("posted_at", { ascending: false })
            .limit(20),
        // 近くの店舗（位置情報はクライアント側で取得、ここでは全件）
        supabase
            .from("shops")
            .select("*, seat_status(status)")
            .eq("status", "active")
            .limit(20),
        // 人気（直近7日の analytics_events でスコアリング）
        supabase
            .from("instagram_posts")
            .select("*, restaurant:shops!inner(id, name, genre, address, main_image, seat_status(status))")
            .order("posted_at", { ascending: false })
            .limit(20),
        // ストーリー（24時間以内）
        supabase
            .from("instagram_stories")
            .select("*, shop:shops(id, name, main_image)")
            .gt("expires_at", new Date().toISOString())
            .order("timestamp", { ascending: false }),
    ]);

    // フォロー中 ID リスト
    const { data: followIds } = await supabase
        .from("follows")
        .select("shop_id")
        .eq("user_id", user.id);

    return (
        <HomeClient
            followingPosts={followingRes.data ?? []}
            nearbyShops={nearbyRes.data ?? []}
            popularPosts={popularRes.data ?? []}
            stories={storiesRes.data ?? []}
            followingIds={(followIds ?? []).map((f) => f.shop_id)}
            userId={user.id}
        />
    );
}
```

**Step 3: 型チェック → コミット**

```bash
git add src/app/\(main\)/
git commit -m "feat: ホーム Server Component — 並列データ取得"
```

---

### Task 12: ホーム Client Component — タブ切り替え + フォロー中フィード

**Files:**
- Create: `src/app/(main)/home-client.tsx`
- Create: `src/components/feed/feed-card.tsx`
- Create: `src/components/feed/empty-state.tsx`

**Step 1: HomeClient（タブ + フィード統合）**

各タブのコンテンツ切り替え、ストーリーバー、フィードカード表示を実装。
FeedCard は写真 + 店名 + 空席バッジ + 距離 + キャプション。
EmptyState は「まだフォローしていません」の空状態。

**Step 2: FeedCard コンポーネント**

Instagram 投稿カード。店舗アイコン、店名、空席バッジ、距離、投稿写真、♡、キャプション表示。

**Step 3: 型チェック → コミット**

```bash
git add src/app/\(main\)/home-client.tsx src/components/feed/
git commit -m "feat: ホーム Client Component — タブ + フィードカード"
```

---

### Task 13: ストーリーバー + ストーリービューアー

**Files:**
- Create: `src/components/story/story-bar.tsx`
- Create: `src/components/story/story-viewer.tsx`

**Step 1:** ストーリーバー（横スクロール、オレンジリング付きアイコン）
**Step 2:** ストーリービューアー（全画面、プログレスバー、左右タップ遷移、空席バッジ）
**Step 3:** 型チェック → コミット

---

### Task 14: 「近く」タブ — カードグリッド + マップ切り替え

**Files:**
- Create: `src/components/discover/nearby-tab.tsx`
- Create: `src/components/discover/shop-grid-card.tsx`
- Create: `src/components/discover/nearby-map.tsx`
- Create: `src/components/discover/distance-filter.tsx`

**Step 1:** NearbyTab（リスト/マップ切り替え + 距離フィルター）
**Step 2:** ShopGridCard（2カラム、写真 + 空席バッジ + 店名 + 距離）
**Step 3:** NearbyMap（Google Maps + ストーリーリングピン + ミニカード）
**Step 4:** DistanceFilter（BottomSheet で距離選択）
**Step 5:** 型チェック → コミット

---

### Task 15: 「人気」タブ

**Files:**
- Create: `src/components/feed/popular-tab.tsx`

**Step 1:** PopularTab（フィード型、♡数を目立たせる、トレンド見出し）
**Step 2:** 型チェック → コミット

---

## Phase 4: 店舗詳細

### Task 16: 店舗詳細 — Server Component

**Files:**
- Create: `src/app/shop/[id]/page.tsx` (Server Component)
- Create: `src/app/shop/[id]/shop-detail-client.tsx` (Client Component)

**Step 1:** Server Component で shop + instagram_posts + seat_status + follow 状態を並列取得
**Step 2:** ShopDetailClient（ヘッダー写真、店名、空席バッジ、フォローボタン、Instagram グリッド、基本情報、アクセスマップ、予約フォーム）
**Step 3:** 型チェック → コミット

---

### Task 17: Instagram グリッド + 投稿モーダル

**Files:**
- Create: `src/components/shop/instagram-grid.tsx`
- Create: `src/components/shop/post-modal.tsx`

**Step 1:** InstagramGrid（3カラム正方形サムネイル）
**Step 2:** PostModal（フルサイズ写真 + キャプション + 「Instagramで見る」リンク）
**Step 3:** 型チェック → コミット

---

### Task 18: 予約フォーム

**Files:**
- Create: `src/components/reservation/reservation-form.tsx`

**Step 1:** ReservationForm（日付・時間・人数・備考 → 確認ダイアログ → 送信 → 完了表示）
**Step 2:** 型チェック → コミット

---

## Phase 5: 検索

### Task 19: 検索ページ — 初期表示（エリア + ジャンル）

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/app/search/search-client.tsx`
- Create: `src/components/search/area-section.tsx`
- Create: `src/components/search/genre-section.tsx`

**Step 1:** SearchClient（検索バー + エリアセクション + ジャンルセクション）
**Step 2:** AreaSection（現在地ボタン + 主要エリアボタン + 「都道府県から探す」）
**Step 3:** GenreSection（2列グリッド、アイコン + ジャンル名）
**Step 4:** 型チェック → コミット

---

### Task 20: 都道府県 → 市区町村選択

**Files:**
- Create: `src/app/search/area/page.tsx`
- Create: `src/data/prefectures.ts`

**Step 1:** 地方ブロック別都道府県一覧 → タップで市区町村選択 → 検索結果へ
**Step 2:** 型チェック → コミット

---

### Task 21: 検索結果ページ

**Files:**
- Create: `src/app/search/results/page.tsx`
- Create: `src/components/search/search-results.tsx`
- Create: `src/components/search/filter-bar.tsx`

**Step 1:** 検索結果（2カラム カードグリッド + フィルターバー）
**Step 2:** FilterBar（空席あり / 距離順 / 人気順 / ジャンル絞り込み）
**Step 3:** 型チェック → コミット

---

## Phase 6: お気に入り・マイページ・予約

### Task 22: お気に入りページ

**Files:**
- Create: `src/app/favorites/page.tsx`

**Step 1:** 2カラム カードグリッド（空席バッジリアルタイム更新、長押し削除）
**Step 2:** 型チェック → コミット

---

### Task 23: マイページ

**Files:**
- Create: `src/app/mypage/page.tsx`
- Create: `src/app/mypage/mypage-client.tsx`

**Step 1:** プロフィールセクション + メニューリスト（予約一覧 / 通知設定 / ダッシュボード / ログアウト）
**Step 2:** 型チェック → コミット

---

### Task 24: 予約一覧

**Files:**
- Create: `src/app/reservations/page.tsx`
- Create: `src/app/reservations/reservations-client.tsx`

**Step 1:** タブ（今後 / 過去）+ 予約カード + 詳細 + キャンセル
**Step 2:** 型チェック → コミット

---

## Phase 7: ランディングページ

### Task 25: ランディングページ

**Files:**
- Create: `src/app/landing/page.tsx`

**Step 1:** ヒーロー + 特徴3カラム + 店舗オーナー向け + フッター
**Step 2:** 型チェック → コミット

---

## Phase 8: 店舗ダッシュボード

### Task 26: ダッシュボードレイアウト

**Files:**
- Create: `src/app/shop-dashboard/layout.tsx`
- Create: `src/components/dashboard/sidebar.tsx`

**Step 1:** サイドバー（PC）/ ハンバーガーメニュー（スマホ）
**Step 2:** 型チェック → コミット

---

### Task 27: ダッシュボード概要

**Files:**
- Create: `src/app/shop-dashboard/page.tsx`

**Step 1:** 今日の数字3カード + 空席ステータス + 直近予約 + 最新投稿
**Step 2:** 型チェック → コミット

---

### Task 28: 空席ステータス管理

**Files:**
- Create: `src/app/shop-dashboard/seats/page.tsx`

**Step 1:** 4つの大きなボタン（空席/混雑/満席/休業）+ 楽観的更新 + Realtime
**Step 2:** 型チェック → コミット

---

### Task 29: 予約台帳

**Files:**
- Create: `src/app/shop-dashboard/reservations/page.tsx`

**Step 1:** 日付選択 + 予約一覧 + 確定/キャンセル/完了アクション
**Step 2:** 型チェック → コミット

---

### Task 30: Instagram連携管理

**Files:**
- Create: `src/app/shop-dashboard/instagram/page.tsx`

**Step 1:** 連携ステータス + OAuth フロー + 手動同期 + 投稿グリッド
**Step 2:** 型チェック → コミット

---

### Task 31: 店舗プロフィール編集

**Files:**
- Create: `src/app/shop-dashboard/profile/page.tsx`

**Step 1:** メイン写真アップロード + 基本情報フォーム + 営業時間（曜日別）
**Step 2:** 型チェック → コミット

---

### Task 32: 集客分析（プレミアム）

**Files:**
- Create: `src/app/shop-dashboard/analytics/page.tsx`

**Step 1:** プレミアムゲート + 期間選択 + グラフ + AI提案
**Step 2:** 型チェック → コミット

---

### Task 33: 料金プラン管理

**Files:**
- Create: `src/app/shop-dashboard/billing/page.tsx`

**Step 1:** 現在のプラン + 3プラン比較カード + Stripe Checkout + Portal リンク
**Step 2:** 型チェック → コミット

---

## Phase 9: Instagram ストーリー同期

### Task 34: ストーリー同期ロジック

**Files:**
- Modify: `src/lib/instagram-sync.ts` — `syncShopStories()` 関数を追加
- Modify: `src/app/api/instagram/sync/route.ts` — ストーリー同期を追加

**Step 1:** `syncShopStories()` — Graph API `GET /{ig-user-id}/stories` でストーリー取得、`instagram_stories` テーブルに upsert、`expires_at = timestamp + 24h`
**Step 2:** sync route の POST/GET にストーリー同期を追加
**Step 3:** 型チェック → コミット

---

## Phase 10: 最終確認

### Task 35: ビルド確認 + 型チェック

**Step 1:** `npx tsc --noEmit` — 全体型チェック
**Step 2:** `npm run build` — プロダクションビルド
**Step 3:** エラーがあれば修正
**Step 4:** コミット

---

## タスク依存関係

```
Task 1 (DB) ──→ Task 2 (Store) ──→ Task 3-6 (UI Components) ──→ Task 7 (Layout)
                                                                      │
Task 7 ──→ Task 8 (Auth+Layout) ──→ Task 9-10 (Login/Signup)         │
                                          │                           │
Task 8 ──→ Task 11-15 (Home) ──→ Task 16-18 (Shop Detail)           │
                                          │                           │
Task 11 ──→ Task 19-21 (Search) ──→ Task 22-24 (Favorites/MyPage)   │
                                          │                           │
Task 8 ──→ Task 25 (Landing) ────────────│                           │
                                          │                           │
Task 8 ──→ Task 26-33 (Dashboard) ───────│                           │
                                          │                           │
Task 1 ──→ Task 34 (Story Sync) ─────────│                           │
                                          │                           │
                              Task 35 (Final Build Check) ←───────────┘
```

## 並列実行可能なグループ

- **グループ A（独立）**: Task 19-21（検索）と Task 26-33（ダッシュボード）は Phase 3 完了後に並列実行可能
- **グループ B（独立）**: Task 25（ランディング）は Task 8 完了後に他と並列実行可能
- **グループ C（独立）**: Task 34（ストーリー同期）は Task 1 完了後にいつでも実行可能
