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
