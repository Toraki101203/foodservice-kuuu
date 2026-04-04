"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/search", icon: Search, label: "検索" },
  { href: "/favorites", icon: Users, label: "フォロー" },
  { href: "/mypage", icon: User, label: "マイページ" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5",
                isActive ? "text-orange-500" : "text-gray-400"
              )}
            >
              <Icon className="size-5" />
              {isActive && (
                <span className="text-[10px] font-medium">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
