"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Map, Search, Heart, User } from "lucide-react";

const navItems = [
    { href: "/home", icon: Home, label: "ホーム" },
    { href: "/discover", icon: Map, label: "見つける" },
    { href: "/search", icon: Search, label: "検索" },
    { href: "/favorites", icon: Heart, label: "お気に入り" },
    { href: "/mypage", icon: User, label: "マイページ" },
];

/**
 * ボトムナビゲーションコンポーネント
 * モバイルファーストで常に画面下部に固定表示
 */
export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
            <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || pathname.startsWith(`${href}/`);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 transition-colors",
                                isActive
                                    ? "text-orange-500"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                            aria-label={label}
                        >
                            <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-xs">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
