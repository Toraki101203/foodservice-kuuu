"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, Armchair, Calendar, Instagram, UserCircle,
    BarChart3, CreditCard, Menu, X, ArrowLeft,
} from "lucide-react";

const navItems = [
    { href: "/shop-dashboard", icon: LayoutDashboard, label: "概要" },
    { href: "/shop-dashboard/seats", icon: Armchair, label: "空席管理" },
    { href: "/shop-dashboard/reservations", icon: Calendar, label: "予約台帳" },
    { href: "/shop-dashboard/instagram", icon: Instagram, label: "Instagram" },
    { href: "/shop-dashboard/profile", icon: UserCircle, label: "プロフィール" },
    { href: "/shop-dashboard/analytics", icon: BarChart3, label: "分析" },
    { href: "/shop-dashboard/billing", icon: CreditCard, label: "料金プラン" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const nav = (
        <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
                <Link href="/" className="text-lg font-bold text-orange-500">Kuuu</Link>
                <button onClick={() => setOpen(false)} className="md:hidden" aria-label="メニューを閉じる">
                    <X className="size-5 text-gray-500" />
                </button>
            </div>
            <nav className="flex-1 space-y-1 p-2">
                {navItems.map((item) => {
                    const active = item.href === "/shop-dashboard"
                        ? pathname === "/shop-dashboard"
                        : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                active ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50",
                            )}
                        >
                            <item.icon className="size-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-gray-200 p-4">
                <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="size-4" />
                    ユーザー画面に戻る
                </Link>
            </div>
        </div>
    );

    return (
        <>
            {/* モバイルハンバーガー */}
            <button
                onClick={() => setOpen(true)}
                className="fixed left-4 top-4 z-30 flex size-10 items-center justify-center rounded-xl bg-white shadow md:hidden"
                aria-label="メニューを開く"
            >
                <Menu className="size-5 text-gray-700" />
            </button>

            {/* モバイルオーバーレイ */}
            {open && (
                <div className="fixed inset-0 z-30 md:hidden" onClick={() => setOpen(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute left-0 top-0 h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
                        {nav}
                    </div>
                </div>
            )}

            {/* PC サイドバー */}
            <aside className="hidden h-dvh w-60 shrink-0 border-r border-gray-200 bg-white md:block">
                {nav}
            </aside>
        </>
    );
}
