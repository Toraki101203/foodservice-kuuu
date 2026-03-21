"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import { useAuthStore } from "@/store";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [unreadCount, setUnreadCount] = useState(0);

  // 未読通知数を取得（マウント時 + 60秒ごと）
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      } catch {
        // 取得失敗は無視
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <Link href="/" className="text-xl font-bold text-orange-500">
        Kuuu
      </Link>
      <div className="flex items-center gap-3">
        {user && (
          <Link href="/notifications" aria-label="通知" className="relative p-2">
            <Bell className="size-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white tabular-nums">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        )}
        <Link href={user ? "/mypage" : "/login"} aria-label="マイページ" className="p-2">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <User className="size-5 text-gray-600" />
          )}
        </Link>
      </div>
    </header>
  );
}
