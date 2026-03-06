"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, X, Plus, Store, CreditCard } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
    user: Database["public"]["Tables"]["profiles"]["Row"];
};

export default function ShopReservationsPage() {
    const supabase = createClient();
    const [shop, setShop] = useState<Shop | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [loading, setLoading] = useState(true);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

    // 手動予約追加用
    const [showAddForm, setShowAddForm] = useState(false);
    const [manualTime, setManualTime] = useState("");
    const [manualPartySize, setManualPartySize] = useState(2);
    const [manualNote, setManualNote] = useState("");

    useEffect(() => {
        const load = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: shopData } = await supabase
                .from("shops")
                .select("*")
                .eq("owner_id", user.id)
                .limit(1)
                .single();

            if (shopData) {
                setShop(shopData);

                const { data: subscription } = await supabase
                    .from("subscriptions")
                    .select("status")
                    .eq("shop_id", shopData.id)
                    .single();

                setHasActiveSubscription(subscription?.status === "active");
            }
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (!shop) return;
        loadReservations();
    }, [shop, selectedDate]);

    const loadReservations = async () => {
        if (!shop) return;

        const { data } = await supabase
            .from("reservations")
            .select("*, user:profiles(display_name)")
            .eq("shop_id", shop.id)
            .eq("reservation_date", selectedDate)
            .order("reservation_time");

        setReservations(data || []);
    };

    const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
        await supabase.from("reservations").update({ status }).eq("id", id);
        loadReservations();
    };

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shop) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("reservations").insert({
            user_id: user.id,
            shop_id: shop.id,
            reservation_date: selectedDate,
            reservation_time: manualTime,
            party_size: manualPartySize,
            note: manualNote || null,
            status: "confirmed",
        });

        setShowAddForm(false);
        setManualTime("");
        setManualPartySize(2);
        setManualNote("");
        loadReservations();
    };

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (shop && !hasActiveSubscription) {
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
        <div className="mx-auto max-w-3xl px-4 py-6">
            <Link
                href="/shop-dashboard"
                className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
                <ArrowLeft className="size-4" />
                ダッシュボードに戻る
            </Link>

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    予約台帳
                </h1>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex min-h-[44px] items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                        <Plus className="size-4" />
                        手動追加
                    </button>
                </div>
            </div>

            {/* 手動追加フォーム */}
            {showAddForm && (
                <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <h3 className="mb-3 font-bold text-[var(--color-text-primary)]">
                        手動予約追加（電話予約など）
                    </h3>
                    <form onSubmit={handleManualAdd} className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="time"
                                value={manualTime}
                                onChange={(e) => setManualTime(e.target.value)}
                                required
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <select
                                value={manualPartySize}
                                onChange={(e) => setManualPartySize(Number(e.target.value))}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            >
                                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                        {n}名
                                    </option>
                                ))}
                            </select>
                        </div>
                        <input
                            type="text"
                            value={manualNote}
                            onChange={(e) => setManualNote(e.target.value)}
                            placeholder="備考（名前、電話番号など）"
                            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                            >
                                追加
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                            >
                                キャンセル
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {reservations.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {reservations.map((res) => (
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
                                        : res.status === "cancelled"
                                            ? "bg-red-50 text-[var(--color-danger)]"
                                            : "bg-yellow-50 text-[var(--color-warning)]"
                                        }`}
                                >
                                    {res.status === "confirmed"
                                        ? "確認済み"
                                        : res.status === "cancelled"
                                            ? "キャンセル"
                                            : "未確認"}
                                </span>
                            </div>

                            <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                <span className="font-bold">{res.party_size}名様</span>
                                {res.user && (
                                    <span className="truncate">・{(res.user as any).display_name || "名無し"}</span>
                                )}
                            </div>

                            {res.note && (
                                <div className="mb-3 rounded-lg bg-[var(--color-surface-secondary)] p-2.5 text-xs text-[var(--color-text-muted)]">
                                    備考: {res.note}
                                </div>
                            )}

                            {res.status === "pending" && (
                                <div className="mt-auto flex gap-2 border-t border-[var(--color-border)] pt-3">
                                    <button
                                        onClick={() => updateStatus(res.id, "confirmed")}
                                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-success)] px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                                        aria-label="予約を確認・承認する"
                                    >
                                        <Check className="size-5" />
                                        承認
                                    </button>
                                    <button
                                        onClick={() => updateStatus(res.id, "cancelled")}
                                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-danger)] px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                                        aria-label="予約をキャンセルする"
                                    >
                                        <X className="size-5" />
                                        キャンセル
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="rounded-xl bg-[var(--color-surface-secondary)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                    {selectedDate} の予約はありません
                </p>
            )}
        </div>
    );
}
