"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Map, PlusCircle, Bell, User } from "lucide-react";

const navItems = [
    { href: "/home", icon: Home, label: "ホーム" },
    { href: "/discover", icon: Map, label: "発見" },
    { href: "/posts/new", icon: PlusCircle, label: "投稿" },
    { href: "/notifications", icon: Bell, label: "通知" },
    { href: "/profile", icon: User, label: "マイページ" },
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
                    const isCreatePost = href === "/posts/new";

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
                            {isCreatePost ? (
                                <div className="flex size-10 items-center justify-center rounded-full bg-orange-500 text-white">
                                    <Icon className="size-5" />
                                </div>
                            ) : (
                                <>
                                    <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-xs">{label}</span>
                                </>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
