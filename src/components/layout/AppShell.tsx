"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * ナビゲーション非表示のパス
 * これらのパスではヘッダーとボトムナビを表示しない
 */
const HIDDEN_NAV_PATHS = ["/login", "/signup", "/shop-dashboard", "/admin", "/partner"];

function shouldHideNav(pathname: string): boolean {
    return HIDDEN_NAV_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

/**
 * アプリケーション全体のシェル
 * ヘッダーとボトムナビを全ユーザー向けページに表示する
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideNav = shouldHideNav(pathname);

    if (hideNav) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-dvh bg-gray-50">
            <Header />
            <main className="mx-auto max-w-lg pb-20 pt-16">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
