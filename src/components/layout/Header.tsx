"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";
import { useAuthStore } from "@/store";

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <Link href="/" className="text-xl font-bold text-orange-500">
        Kuuu
      </Link>
      <div className="flex items-center gap-3">
        {user && (
          <button aria-label="通知" className="relative p-2">
            <Bell className="size-5 text-gray-600" />
          </button>
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
