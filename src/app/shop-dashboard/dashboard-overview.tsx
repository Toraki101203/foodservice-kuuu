"use client";
import { Eye, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, SeatBadge } from "@/components/ui";
import type { Restaurant, Reservation } from "@/types/database";

interface DashboardOverviewProps {
    shop: Restaurant & { seat_status?: { status: string } };
    pendingReservations: Reservation[];
    analyticsCount: number;
}

export function DashboardOverview({ shop, pendingReservations, analyticsCount }: DashboardOverviewProps) {
    const stats = [
        { label: "閲覧数", value: analyticsCount, icon: Eye },
        { label: "未確定予約", value: pendingReservations.length, icon: Calendar },
        { label: "フォロワー", value: "-", icon: TrendingUp },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
                <p className="text-sm text-gray-500">ダッシュボード</p>
            </div>

            {/* 統計カード */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-4">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-orange-100">
                                <stat.icon className="size-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 空席ステータス */}
            <Card>
                <CardContent>
                    <h2 className="text-sm font-bold text-gray-900">現在の空席ステータス</h2>
                    <div className="mt-2">
                        {shop.seat_status ? (
                            <SeatBadge status={shop.seat_status.status as "available" | "busy" | "full" | "closed"} />
                        ) : (
                            <p className="text-sm text-gray-500">未設定</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 直近の予約 */}
            <Card>
                <CardContent>
                    <h2 className="mb-3 text-sm font-bold text-gray-900">確認待ちの予約</h2>
                    {pendingReservations.length === 0 ? (
                        <p className="text-sm text-gray-500">確認待ちの予約はありません</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingReservations.map((res) => (
                                <div key={res.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                                    <span className="font-medium text-gray-700">
                                        {res.reservation_date} {res.reservation_time}
                                    </span>
                                    <span className="text-gray-500">{res.party_size}名</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
