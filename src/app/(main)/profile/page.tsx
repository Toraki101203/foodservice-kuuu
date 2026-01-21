"use client";

import Link from "next/link";
import { Settings, Grid3X3, Heart, Calendar, LogOut, ChevronRight } from "lucide-react";
import { Button, Avatar, Card } from "@/components/ui";
import { useAuthStore } from "@/store";

/**
 * マイページ（プロフィール）
 */
export default function ProfilePage() {
    const { user } = useAuthStore();

    // サンプルデータ
    const profile = {
        display_name: user?.display_name || "ゲストユーザー",
        bio: user?.bio || "Kuuuで美味しいお店を探しています 🍜",
        avatar_url: user?.avatar_url,
        stats: {
            posts: 12,
            following: 45,
            followers: 23,
        },
    };

    const menuItems = [
        {
            icon: Heart,
            label: "お気に入り店舗",
            href: "/profile/favorites",
            count: 8,
        },
        {
            icon: Calendar,
            label: "予約履歴",
            href: "/reservations",
            count: 3,
        },
        {
            icon: Settings,
            label: "設定",
            href: "/profile/settings",
        },
    ];

    return (
        <div className="px-4 py-4">
            {/* プロフィールヘッダー */}
            <div className="mb-6 text-center">
                <Avatar
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    size="xl"
                    className="mx-auto mb-3"
                />
                <h1 className="text-xl font-bold text-gray-900">
                    {profile.display_name}
                </h1>
                <p className="mt-1 text-gray-600">{profile.bio}</p>

                {/* 統計 */}
                <div className="mt-4 flex justify-center gap-8">
                    <div className="text-center">
                        <p className="text-xl font-bold text-gray-900 tabular-nums">
                            {profile.stats.posts}
                        </p>
                        <p className="text-xs text-gray-500">投稿</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-gray-900 tabular-nums">
                            {profile.stats.following}
                        </p>
                        <p className="text-xs text-gray-500">フォロー中</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-gray-900 tabular-nums">
                            {profile.stats.followers}
                        </p>
                        <p className="text-xs text-gray-500">フォロワー</p>
                    </div>
                </div>

                {/* 編集ボタン */}
                <Button variant="outline" className="mt-4" size="sm">
                    プロフィールを編集
                </Button>
            </div>

            {/* メニュー */}
            <Card padding="none" className="mb-6 overflow-hidden">
                {menuItems.map((item, index) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 ${index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="size-5 text-gray-500" />
                            <span className="text-gray-900">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {item.count !== undefined && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm text-gray-600 tabular-nums">
                                    {item.count}
                                </span>
                            )}
                            <ChevronRight className="size-5 text-gray-400" />
                        </div>
                    </Link>
                ))}
            </Card>

            {/* 投稿グリッド */}
            <div className="mb-4 flex items-center gap-2">
                <Grid3X3 className="size-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">投稿</h2>
            </div>
            <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                        key={i}
                        className="aspect-square rounded-lg bg-gray-200"
                    />
                ))}
            </div>

            {/* ログアウト */}
            {user && (
                <div className="mt-8 text-center">
                    <button className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-500">
                        <LogOut className="size-4" />
                        ログアウト
                    </button>
                </div>
            )}

            {/* 未ログイン時 */}
            {!user && (
                <Card className="mt-6 text-center">
                    <p className="mb-4 text-gray-600">
                        ログインすると、投稿やお気に入りの保存ができます
                    </p>
                    <div className="flex justify-center gap-3">
                        <Link href="/login">
                            <Button variant="outline">ログイン</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>新規登録</Button>
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}
