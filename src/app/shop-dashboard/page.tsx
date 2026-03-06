"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    CalendarDays,
    ClipboardList,
    CreditCard,
    Store,
    TrendingUp,
} from "lucide-react";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
    user: Database["public"]["Tables"]["profiles"]["Row"];
};

export default function ShopDashboardPage() {
    const supabase = createClient();
    const [shop, setShop] = useState<Shop | null>(null);
    const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [togglingStatus, setTogglingStatus] = useState(false);

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

            // サブスクリプション状態の確認
            const { data: subscription } = await supabase
                .from("subscriptions")
                .select("status")
                .eq("shop_id", shopData.id)
                .single();

            setHasActiveSubscription(subscription?.status === "active");

            const today = new Date().toISOString().split("T")[0];
            const monthStart = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
            )
                .toISOString()
                .split("T")[0];

            // 今日の予約
            const { data: todayRes } = await supabase
                .from("reservations")
                .select("*")
                .eq("shop_id", shopData.id)
                .eq("reservation_date", today)
                .neq("status", "cancelled")
                .order("reservation_time");

            setTodayReservations(todayRes || []);

            // 今月の予約数
            const { count } = await supabase
                .from("reservations")
                .select("*", { count: "exact", head: true })
                .eq("shop_id", shopData.id)
                .gte("reservation_date", monthStart)
                .neq("status", "cancelled");

            setMonthlyCount(count || 0);

            setLoading(false);
        };

        loadDashboard();
    }, []);

    const handleToggleOpenStatus = async () => {
        if (!shop || togglingStatus) return;
        setTogglingStatus(true);
        const newStatus = !shop.is_open;

        try {
            const { error } = await supabase
                .from("shops")
                .update({ is_open: newStatus })
                .eq("id", shop.id);

            if (!error) {
                setShop({ ...shop, is_open: newStatus });
            } else {
                console.error("Failed to toggle shop status:", error);
                alert("ステータスの更新に失敗しました。");
            }
        } catch (e) {
            console.error("Error toggling shop status:", e);
        } finally {
            setTogglingStatus(false);
        }
    };

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

                {/* 営業中ステータストグル */}
                <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
                    <span className={`text-sm font-bold ${shop.is_open ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}`}>
                        {shop.is_open ? "営業中" : "準備中"}
                    </span>
                    <button
                        onClick={handleToggleOpenStatus}
                        disabled={togglingStatus}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${shop.is_open ? "bg-[var(--color-success)]" : "bg-[var(--color-surface-tertiary)]"}`}
                        aria-pressed={shop.is_open}
                    >
                        <span className="sr-only">営業状態を切り替える</span>
                        <span
                            className={`inline-block size-5 transform rounded-full bg-white transition-transform ${shop.is_open ? "translate-x-6" : "translate-x-1"}`}
                        />
                    </button>
                    <p className="hidden text-xs text-[var(--color-text-muted)] lg:block">ワンタップでマップ上の表示を切り替え</p>
                </div>
            </div>

            {/* サマリーカード */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>

            {/* クイックアクション */}
            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
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
                    <Store className="size-6 text-[var(--color-primary)]" />
                    <div>
                        <p className="font-bold text-[var(--color-text-primary)]">
                            店舗情報設定
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
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${res.status === "confirmed"
                                            ? "bg-green-50 text-[var(--color-success)]"
                                            : "bg-yellow-50 text-[var(--color-warning)]"
                                            }`}
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
