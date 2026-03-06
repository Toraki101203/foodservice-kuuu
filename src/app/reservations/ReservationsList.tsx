"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
    CalendarDays,
    Clock,
    Users,
    MapPin,
    MessageSquare,
    Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import type { Reservation, ReservationStatus } from "@/types/database";

/**
 * 予約情報にリレーション先の店舗情報を含めた型
 */
type ReservationWithShop = Reservation & {
    restaurant: {
        name: string;
        address: string;
        phone: string | null;
    } | null;
};

interface ReservationsListProps {
    reservations: ReservationWithShop[];
}

/**
 * ステータスバッジの色とラベル
 */
const STATUS_CONFIG: Record<
    ReservationStatus,
    { label: string; className: string }
> = {
    confirmed: {
        label: "確定",
        className: "bg-green-100 text-green-700",
    },
    pending: {
        label: "確認中",
        className: "bg-yellow-100 text-yellow-700",
    },
    cancelled: {
        label: "キャンセル",
        className: "bg-red-100 text-red-700",
    },
    completed: {
        label: "完了",
        className: "bg-gray-100 text-gray-500",
    },
};

/**
 * 予約日時を取得する（新旧フォーマット対応）
 * - 新形式: reservation_datetime (ISO文字列)
 * - 旧形式: reservation_date + reservation_time
 */
function getReservationDateTime(reservation: ReservationWithShop): Date {
    if (reservation.reservation_datetime) {
        return new Date(reservation.reservation_datetime);
    }
    // レガシーフォーマット
    const dateStr = reservation.reservation_date || "";
    const timeStr = reservation.reservation_time || "00:00";
    return new Date(`${dateStr}T${timeStr}`);
}

/**
 * 予約日時を表示用にフォーマット
 */
function formatReservationDateTime(reservation: ReservationWithShop): {
    date: string;
    time: string;
} {
    if (reservation.reservation_datetime) {
        const dt = new Date(reservation.reservation_datetime);
        return {
            date: formatDate(reservation.reservation_datetime),
            time: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
        };
    }
    // レガシーフォーマット
    return {
        date: formatDate(reservation.reservation_date || ""),
        time: formatTime(reservation.reservation_time || ""),
    };
}

/**
 * 店舗IDの取得（新旧カラム対応）
 */
function getShopId(reservation: ReservationWithShop): string {
    return reservation.restaurant_id || reservation.shop_id || "";
}

export function ReservationsList({ reservations }: ReservationsListProps) {
    // 今後の予約と過去の予約に分類
    const { upcoming, past } = useMemo(() => {
        const now = new Date();
        const upcomingList: ReservationWithShop[] = [];
        const pastList: ReservationWithShop[] = [];

        for (const r of reservations) {
            const dt = getReservationDateTime(r);
            if (
                dt >= now &&
                r.status !== "cancelled" &&
                r.status !== "completed"
            ) {
                upcomingList.push(r);
            } else {
                pastList.push(r);
            }
        }

        return { upcoming: upcomingList, past: pastList };
    }, [reservations]);

    // 予約がゼロ件の場合の空状態
    if (reservations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-4">
                    <CalendarDays className="size-8 text-gray-400" />
                </div>
                <p className="mb-2 text-base font-bold text-gray-700">
                    予約がありません
                </p>
                <p className="mb-6 text-sm leading-relaxed text-gray-500">
                    気になるお店を見つけて
                    <br />
                    予約してみましょう
                </p>
                <Link
                    href="/"
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-8 font-bold text-white transition-colors hover:bg-orange-600"
                >
                    お店を探す
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* 今後の予約 */}
            {upcoming.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-gray-400">
                        今後の予約 {upcoming.length}件
                    </h2>
                    <div className="flex flex-col gap-3">
                        {upcoming.map((r) => (
                            <ReservationCard key={r.id} reservation={r} />
                        ))}
                    </div>
                </section>
            )}

            {/* 過去の予約 */}
            {past.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-bold text-gray-400">
                        過去の予約 {past.length}件
                    </h2>
                    <div className="flex flex-col gap-3">
                        {past.map((r) => (
                            <ReservationCard key={r.id} reservation={r} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

/**
 * 個別予約カード
 */
function ReservationCard({
    reservation,
}: {
    reservation: ReservationWithShop;
}) {
    const { date, time } = formatReservationDateTime(reservation);
    const shopId = getShopId(reservation);
    const shopName = reservation.restaurant?.name || "店舗情報なし";
    const address = reservation.restaurant?.address;
    const status = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;

    return (
        <Link
            href={shopId ? `/shop/${shopId}` : "#"}
            className="group block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
        >
            {/* ヘッダー: 店名 + ステータスバッジ */}
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Store className="size-4 shrink-0 text-orange-500" />
                    <span className="line-clamp-1 font-bold text-gray-800 group-hover:text-orange-500">
                        {shopName}
                    </span>
                </div>
                <span
                    className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                        status.className
                    )}
                >
                    {status.label}
                </span>
            </div>

            {/* 詳細情報 */}
            <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-gray-400" />
                    <span>{date}</span>
                </div>
                {time && (
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0 text-gray-400" />
                        <span>{time}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-gray-400" />
                    <span>{reservation.party_size}名</span>
                </div>
                {address && (
                    <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-gray-400" />
                        <span className="line-clamp-1">{address}</span>
                    </div>
                )}
                {reservation.note && (
                    <div className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 size-4 shrink-0 text-gray-400" />
                        <span className="line-clamp-2 text-gray-500">
                            {reservation.note}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}
