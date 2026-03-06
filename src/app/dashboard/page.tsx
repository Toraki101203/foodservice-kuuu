import Link from "next/link";
import {
    Store,
    Users,
    Calendar,
    BarChart3,
    ChevronRight,
    TrendingUp,
    Eye,
} from "lucide-react";
import { Card, SeatStatusBadge } from "@/components/ui";

/**
 * 店舗ダッシュボードトップページ
 */
export default function DashboardPage() {
    // サンプルデータ
    const stats = {
        todayViews: 156,
        weeklyViews: 1234,
        followers: 89,
        reservationsToday: 5,
    };

    const menuItems = [
        {
            icon: Store,
            label: "席状況を更新",
            href: "/dashboard/seats",
            description: "リアルタイムの席状況を変更",
            highlight: true,
        },
        {
            icon: Calendar,
            label: "予約管理",
            href: "/dashboard/reservations",
            description: "本日の予約を確認・管理",
            badge: stats.reservationsToday,
        },
        {
            icon: Store,
            label: "店舗情報",
            href: "/dashboard/profile",
            description: "店舗プロフィールを編集",
        },
        {
            icon: BarChart3,
            label: "アナリティクス",
            href: "/dashboard/analytics",
            description: "閲覧数・フォロワー推移",
        },
    ];

    return (
        <div className="space-y-6">
            {/* ウェルカムカード */}
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-white/20 text-2xl">
                        🍜
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">麺屋 Kuuu</h2>
                        <p className="text-orange-100">スタンダードプラン</p>
                    </div>
                </div>
            </Card>

            {/* 現在の席状況 */}
            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">現在の席状況</h3>
                    <Link
                        href="/dashboard/seats"
                        className="text-sm text-orange-500 hover:underline"
                    >
                        変更する
                    </Link>
                </div>
                <div className="flex items-center justify-between">
                    <SeatStatusBadge
                        status="available"
                        availableSeats={5}
                        showDetails
                    />
                    <span className="text-sm text-gray-500">最終更新: 5分前</span>
                </div>
            </Card>

            {/* 統計サマリー */}
            <div className="grid grid-cols-2 gap-3">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                            <Eye className="size-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">
                                {stats.todayViews}
                            </p>
                            <p className="text-xs text-gray-500">本日の閲覧</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                            <TrendingUp className="size-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">
                                {stats.weeklyViews}
                            </p>
                            <p className="text-xs text-gray-500">週間閲覧</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100">
                            <Users className="size-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">
                                {stats.followers}
                            </p>
                            <p className="text-xs text-gray-500">フォロワー</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100">
                            <Calendar className="size-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">
                                {stats.reservationsToday}
                            </p>
                            <p className="text-xs text-gray-500">本日の予約</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* メニュー */}
            <div className="space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-4 rounded-xl p-4 transition-colors ${item.highlight
                                ? "bg-orange-50 border border-orange-200"
                                : "bg-white border border-gray-200"
                            }`}
                    >
                        <div
                            className={`flex size-12 items-center justify-center rounded-xl ${item.highlight ? "bg-orange-500 text-white" : "bg-gray-100"
                                }`}
                        >
                            <item.icon className="size-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">{item.label}</h3>
                                {item.badge !== undefined && (
                                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white tabular-nums">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <ChevronRight className="size-5 text-gray-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
