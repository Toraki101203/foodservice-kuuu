"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Bell, Crown, LogOut, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const MENU_ITEMS = [
  { href: "/reservations", icon: ClipboardList, label: "予約一覧" },
  { href: "#", icon: Bell, label: "通知設定" },
];

export function MypageClient({ profile }: { profile: Profile }) {
  const [showLogout, setShowLogout] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/landing");
  };

  return (
    <div className="px-4 pb-20">
      {/* プロフィール */}
      <div className="flex flex-col items-center py-8">
        <Avatar src={profile.avatar_url} size="lg" />
        <h2 className="mt-3 text-lg font-bold text-gray-900">
          {profile.display_name || "名前未設定"}
        </h2>
        <p className="text-sm text-gray-500">{profile.email}</p>
      </div>

      {/* メニュー */}
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {MENU_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-11 items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon className="size-5 text-gray-500" />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            <ChevronRight className="size-4 text-gray-400" />
          </Link>
        ))}
        {profile.user_type === "restaurant_owner" && (
          <Link
            href="/shop-dashboard"
            className="flex min-h-11 items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Crown className="size-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">店舗ダッシュボード</span>
            </div>
            <ChevronRight className="size-4 text-gray-400" />
          </Link>
        )}
        <button
          onClick={() => setShowLogout(true)}
          className="flex w-full min-h-11 items-center gap-3 px-4 py-3"
        >
          <LogOut className="size-5 text-red-500" />
          <span className="text-sm text-red-500">ログアウト</span>
        </button>
      </div>

      {/* アプリ情報 */}
      <div className="mt-6 space-y-2 pb-8 text-center text-xs text-gray-400">
        <p>利用規約 · プライバシーポリシー</p>
        <p>Kuuu v1.0.0</p>
      </div>

      <Dialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        title="ログアウト"
        description="ログアウトしますか？"
      >
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowLogout(false)}>
            キャンセル
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
