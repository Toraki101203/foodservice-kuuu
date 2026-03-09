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
                Kuuu
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
