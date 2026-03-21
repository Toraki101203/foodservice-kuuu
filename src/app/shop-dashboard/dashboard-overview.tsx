"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  Eye,
  Heart,
  ChevronRight,
  Armchair,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeatBadge } from "@/components/ui/seat-badge";
import type {
  Shop,
  SeatStatus,
  SeatStatusType,
  Reservation,
  InstagramPost,
} from "@/types/database";

type ShopWithSeat = Shop & {
  seat_status: SeatStatus[];
};

type ReservationWithProfile = Reservation & {
  profiles: { display_name: string | null } | null;
};

type DashboardStats = {
  reservations: number;
  views: number;
  favorites: number;
};

type Props = {
  shop: ShopWithSeat;
  stats: DashboardStats;
  recentReservations: ReservationWithProfile[];
  recentPosts: InstagramPost[];
};

const STAT_CARDS = [
  { key: "reservations" as const, label: "本日の来店", icon: Navigation, color: "text-orange-500" },
  { key: "views" as const, label: "本日の閲覧数", icon: Eye, color: "text-blue-500" },
  { key: "favorites" as const, label: "フォロワー数", icon: Heart, color: "text-pink-500" },
];

const STATUS_OPTIONS: { value: SeatStatusType; label: string }[] = [
  { value: "available", label: "空席あり" },
  { value: "busy", label: "やや混雑" },
  { value: "full", label: "満席" },
  { value: "closed", label: "本日休業" },
];

export function DashboardOverview({
  shop,
  stats,
  recentReservations,
  recentPosts,
}: Props) {
  const seatStatus = shop.seat_status?.[0];
  const [currentStatus, setCurrentStatus] = useState<SeatStatusType>(
    seatStatus?.status ?? "closed"
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: SeatStatusType) => {
    if (newStatus === currentStatus || isUpdating) return;

    const previous = currentStatus;
    setCurrentStatus(newStatus);
    setIsUpdating(true);

    try {
      const res = await fetch("/api/shops/seat-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, status: newStatus }),
      });
      if (!res.ok) setCurrentStatus(previous);
    } catch {
      setCurrentStatus(previous);
    }
    setIsUpdating(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          {shop.name} の管理画面へようこそ
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="p-3 text-center md:p-4">
              <Icon className={cn("mx-auto size-5 md:size-6", color)} />
              <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 md:text-2xl">
                {stats[key]}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空席ステータス */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Armchair className="size-5 text-gray-600" />
              <h2 className="font-bold text-gray-900">空席ステータス</h2>
            </div>
            <SeatBadge status={currentStatus} />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                disabled={isUpdating}
                className={cn(
                  "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  currentStatus === value
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {seatStatus && (
            <p className="text-xs text-gray-400">
              最終更新: {formatRelativeTime(seatStatus.updated_at)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 本日の来店通知 */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">本日の来店通知</h2>
            <Link
              href="/shop-dashboard/reservations"
              className="flex items-center text-sm text-orange-500 hover:text-orange-600"
            >
              すべて見る
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {recentReservations.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              本日の来店通知はありません
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(reservation.reservation_time)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reservation.profiles?.display_name ?? "ゲスト"} ・{" "}
                      {reservation.party_size}名
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      reservation.status === "on_the_way"
                        ? "bg-orange-50 text-orange-600"
                        : reservation.status === "arrived"
                          ? "bg-green-50 text-green-600"
                          : reservation.status === "no_show"
                            ? "bg-red-50 text-red-500"
                            : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {reservation.status === "on_the_way"
                      ? "向かっています"
                      : reservation.status === "arrived"
                        ? "到着済み"
                        : reservation.status === "no_show"
                          ? "未来店"
                          : "キャンセル"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近のInstagram投稿 */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">最近の投稿</h2>
            <Link
              href="/shop-dashboard/instagram"
              className="flex items-center text-sm text-orange-500 hover:text-orange-600"
            >
              Instagram連携
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400">投稿がありません</p>
              <Link href="/shop-dashboard/instagram">
                <Button variant="outline" size="sm" className="mt-2">
                  Instagramを連携する
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.caption ?? ""}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-gray-400">
                      No Image
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
