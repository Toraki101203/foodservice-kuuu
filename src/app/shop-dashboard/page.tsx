"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    BarChart3,
    CalendarDays,
    CheckCircle,
    ClipboardList,
    Clock,
    CreditCard,
    Instagram,
    MinusCircle,
    Settings,
    Store,
    TrendingUp,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AiSuggestion from "@/components/dashboard/AiSuggestion";
import type { Database } from "@/types/database";
import type { SeatStatusType } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
    user: Database["public"]["Tables"]["profiles"]["Row"];
};

interface SeatOption {
    status: SeatStatusType;
    label: string;
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    activeColor: string;
    activeBg: string;
}

const seatOptions: SeatOption[] = [
    {
        status: "available",
        label: "空き",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        activeColor: "text-white",
        activeBg: "bg-green-500",
    },
    {
        status: "busy",
        label: "混雑",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        activeColor: "text-white",
        activeBg: "bg-yellow-500",
    },
    {
        status: "full",
        label: "満席",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        activeColor: "text-white",
        activeBg: "bg-red-500",
    },
    {
        status: "closed",
        label: "閉店",
        icon: MinusCircle,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        activeColor: "text-white",
        activeBg: "bg-gray-500",
    },
];

export default function ShopDashboardPage() {
    const supabase = createClient();
    const [shop, setShop] = useState<Shop | null>(null);
    const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [instagramPostCount, setInstagramPostCount] = useState(0);
    const [currentSeatStatus, setCurrentSeatStatus] = useState<SeatStatusType | null>(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updatingSeatStatus, setUpdatingSeatStatus] = useState(false);

    useEffect(() => {
        const loadDashboard = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // 自分の店舗を取得
            const { data: shopData } = await supabase
                .from("shops")
                .select("*")
                .eq("owner_id", user.id)
                .limit(1)
                .single();

            if (!shopData) {
                setLoading(false);
                return;
            }

            setShop(shopData);

            const today = new Date().toISOString().split("T")[0];
            const monthStart = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
            )
                .toISOString()
                .split("T")[0];

            // 並列でデータ取得
            const [
                subscriptionResult,
                todayResResult,
                monthlyResult,
                seatStatusResult,
                instagramCountResult,
            ] = await Promise.all([
                // サブスクリプション状態の確認
                supabase
                    .from("subscriptions")
                    .select("status")
                    .eq("shop_id", shopData.id)
                    .single(),
                // 今日の予約
                supabase
                    .from("reservations")
                    .select("*")
                    .eq("shop_id", shopData.id)
                    .eq("reservation_date", today)
                    .neq("status", "cancelled")
                    .order("reservation_time"),
                // 今月の予約数
                supabase
                    .from("reservations")
                    .select("*", { count: "exact", head: true })
                    .eq("shop_id", shopData.id)
                    .gte("reservation_date", monthStart)
                    .neq("status", "cancelled"),
                // 現在の席状況
                supabase
                    .from("seat_status")
                    .select("status")
                    .eq("restaurant_id", shopData.id)
                    .single(),
                // Instagram投稿数
                supabase
                    .from("instagram_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("restaurant_id", shopData.id),
            ]);

            setHasActiveSubscription(subscriptionResult.data?.status === "active");
            setTodayReservations(todayResResult.data || []);
            setMonthlyCount(monthlyResult.count || 0);
            setCurrentSeatStatus(seatStatusResult.data?.status as SeatStatusType || null);
            setInstagramPostCount(instagramCountResult.count || 0);

            setLoading(false);
        };

        loadDashboard();
    }, []);

    // 席状況更新
    const handleUpdateSeatStatus = useCallback(
        async (newStatus: SeatStatusType) => {
            if (!shop || updatingSeatStatus) return;
            setUpdatingSeatStatus(true);

            // 楽観的更新
            const previousStatus = currentSeatStatus;
            const previousIsOpen = shop.is_open;
            setCurrentSeatStatus(newStatus);

            // is_open も連動させる（available/busy = open, full/closed = closed）
            const newIsOpen = newStatus === "available" || newStatus === "busy";
            setShop((prev) => (prev ? { ...prev, is_open: newIsOpen } : prev));

            try {
                // seat_status テーブルを upsert
                const { error: seatError } = await supabase
                    .from("seat_status")
                    .upsert(
                        {
                            restaurant_id: shop.id,
                            status: newStatus,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: "restaurant_id" }
                    );

                // shops テーブルの is_open も更新
                const { error: shopError } = await supabase
                    .from("shops")
                    .update({ is_open: newIsOpen })
                    .eq("id", shop.id);

                if (seatError || shopError) {
                    // ロールバック
                    setCurrentSeatStatus(previousStatus);
                    setShop((prev) =>
                        prev ? { ...prev, is_open: previousIsOpen } : prev
                    );
                }
            } catch {
                setCurrentSeatStatus(previousStatus);
                setShop((prev) =>
                    prev ? { ...prev, is_open: previousIsOpen } : prev
                );
            }

            setUpdatingSeatStatus(false);
        },
        [shop, updatingSeatStatus, currentSeatStatus, supabase]
    );

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4">
                <Store className="mb-4 size-12 text-[var(--color-text-muted)]" />
                <h2 className="mb-2 text-lg font-bold text-[var(--color-text-primary)]">
                    店舗が登録されていません
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                    管理者にお問い合わせください。
                </p>
            </div>
        );
    }

    if (!hasActiveSubscription) {
        return (
            <div className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-center justify-center px-4 text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                    <Store className="size-10 text-[var(--color-primary)]" />
                </div>
                <h1 className="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">
                    プランの契約が必要です
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-base">
                    店舗ダッシュボードの機能を引き続き利用するには、有料プランの契約が必要です。<br />
                    料金プランページよりご希望のプランを選択して、利用を開始してください。
                </p>
                <Link
                    href="/shop-dashboard/billing"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 font-bold text-white shadow-sm transition-all hover:bg-[var(--color-primary-hover)] hover:shadow"
                >
                    <CreditCard className="size-5" />
                    料金プランを確認する
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        店舗ダッシュボード
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {shop.name}
                    </p>
                </div>
            </div>

            {/* 空席ステータス ワンタップ切替 */}
            <section id="seat-status" className="mb-8">
                <h2 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">
                    空席ステータス
                </h2>
                <div className="grid grid-cols-4 gap-2">
                    {seatOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = currentSeatStatus === option.status;

                        return (
                            <button
                                key={option.status}
                                onClick={() => handleUpdateSeatStatus(option.status)}
                                disabled={updatingSeatStatus}
                                className={cn(
                                    "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border-2 transition-colors disabled:opacity-50",
                                    isActive
                                        ? `${option.activeBg} border-transparent ${option.activeColor}`
                                        : `${option.bgColor} border-[var(--color-border)] ${option.color} hover:border-current`
                                )}
                            >
                                <Icon className="size-5" />
                                <span className="text-xs font-bold">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
                {currentSeatStatus && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                        マップ上の表示にリアルタイムで反映されます
                    </p>
                )}
            </section>

            {/* サマリーカード */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <CalendarDays className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">今日の予約</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {todayReservations.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <TrendingUp className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">今月の予約</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {monthlyCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <Instagram className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">Instagram投稿</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {instagramPostCount}
                                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                                    / 6
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* クイックアクション */}
            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    href="/shop-dashboard/instagram"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <Instagram className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            Instagram連携
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            投稿URLの登録・管理
                        </p>
                    </div>
                </Link>

                <a
                    href="#seat-status"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <CheckCircle className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            空席更新
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            リアルタイムで空席状況を更新
                        </p>
                    </div>
                </a>

                <Link
                    href="/shop-dashboard/reservations"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <ClipboardList className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            予約台帳
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            予約の確認・管理
                        </p>
                    </div>
                </Link>

                <Link
                    href="/shop-dashboard/profile"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <Settings className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            店舗設定
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            営業時間や紹介文の変更
                        </p>
                    </div>
                </Link>

                <Link
                    href="/shop-dashboard/billing"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <CreditCard className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            料金プラン
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            プラン変更・お支払い管理
                        </p>
                    </div>
                </Link>

                <Link
                    href="/shop-dashboard/analytics"
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
                >
                    <BarChart3 className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            集客分析
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            アクセス・予約データの分析
                        </p>
                    </div>
                </Link>
            </div>

            {/* AI投稿最適化提案 */}
            <div className="mb-8">
                <AiSuggestion
                    shopId={shop.id}
                    isPremium={shop.plan_type === "premium"}
                />
            </div>

            {/* 今日の予約一覧 */}
            <section>
                <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">
                    今日の予約
                </h2>
                {todayReservations.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {todayReservations.map((res) => (
                            <div
                                key={res.id}
                                className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm"
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                        {res.reservation_time}
                                    </span>
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                                            res.status === "confirmed"
                                                ? "bg-green-50 text-[var(--color-success)]"
                                                : "bg-yellow-50 text-[var(--color-warning)]"
                                        )}
                                    >
                                        {res.status === "confirmed" ? "確認済み" : "未確認"}
                                    </span>
                                </div>
                                <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                    <span className="font-bold">{res.party_size}名様</span>
                                </div>
                                {res.note && (
                                    <div className="mt-auto rounded-lg bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text-muted)]">
                                        備考: {res.note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center text-sm font-medium text-[var(--color-text-muted)]">
                        今日の予約はありません
                    </p>
                )}
            </section>
        </div>
    );
}
