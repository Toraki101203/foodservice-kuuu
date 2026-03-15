"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Armchair,
  ClipboardList,
  Instagram,
  Store,
  BarChart3,
  CreditCard,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shop } from "@/types/database";

const NAV_ITEMS = [
  { href: "/shop-dashboard", icon: LayoutDashboard, label: "概要", exact: true },
  { href: "/shop-dashboard/seats", icon: Armchair, label: "空席ステータス" },
  { href: "/shop-dashboard/reservations", icon: ClipboardList, label: "予約台帳" },
  { href: "/shop-dashboard/instagram", icon: Instagram, label: "Instagram連携" },
  { href: "/shop-dashboard/profile", icon: Store, label: "店舗プロフィール" },
  { href: "/shop-dashboard/analytics", icon: BarChart3, label: "集客分析" },
  { href: "/shop-dashboard/billing", icon: CreditCard, label: "料金プラン" },
];

export function Sidebar({ shop }: { shop: Shop }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href) && href !== "/shop-dashboard";
  };

  const navContent = (
    <div className="flex h-full flex-col">
      {/* 店舗情報ヘッダー */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
            {shop.main_image ? (
              <img src={shop.main_image} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Store className="size-5 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{shop.name}</p>
            <p className="text-xs text-gray-500">{shop.plan_type}プラン</p>
          </div>
        </div>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
          const active = isItemActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-orange-50 font-medium text-orange-600"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ユーザー画面に戻る */}
      <div className="border-t border-gray-200 p-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" />
          ユーザー画面に戻る
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-30 rounded-lg bg-white p-2 shadow-md md:hidden"
        aria-label="メニュー"
      >
        <Menu className="size-5" />
      </button>

      {/* モバイル: オーバーレイ + サイドバー */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed top-0 left-0 z-50 h-dvh w-64 bg-white shadow-xl md:hidden">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1"
              aria-label="閉じる"
            >
              <X className="size-5 text-gray-400" />
            </button>
            {navContent}
          </aside>
        </>
      )}

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:block md:h-dvh md:w-64 md:border-r md:border-gray-200 md:bg-white">
        {navContent}
      </aside>
    </>
  );
}
