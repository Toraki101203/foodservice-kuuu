"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import {
    ArrowLeft,
    Check,
    CreditCard,
    ExternalLink,
    Sparkles,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Subscription {
    plan: PlanId;
    status: string;
    current_period_end: string | null;
}

function BillingContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);

    const isSuccess = searchParams.get("success") === "true";
    const isCancelled = searchParams.get("cancelled") === "true";

    useEffect(() => {
        const load = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: shop } = await supabase
                .from("shops")
                .select("id")
                .eq("owner_id", user.id)
                .limit(1)
                .single();

            if (shop) {
                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select("plan, status, current_period_end")
                    .eq("shop_id", shop.id)
                    .single();

                if (sub) {
                    setSubscription(sub as Subscription);
                }
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleCheckout = async (planId: PlanId) => {
        setCheckoutLoading(planId);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            setCheckoutLoading(null);
        }
    };

    const handlePortal = async () => {
        try {
            const res = await fetch("/api/stripe/portal", {
                method: "POST",
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            // エラーハンドリング
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
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

            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
                料金プラン
            </h1>
            <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
                手数料0%。月額固定で安心の料金体系です。
            </p>

            {/* 成功/キャンセルメッセージ */}
            {isSuccess && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-[var(--color-success)]">
                    <Check className="size-5" />
                    サブスクリプションの登録が完了しました！
                </div>
            )}
            {isCancelled && (
                <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-sm text-[var(--color-warning)]">
                    決済がキャンセルされました。
                </div>
            )}

            {/* 現在のプラン */}
            {subscription && subscription.status === "active" && (
                <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">現在のプラン</p>
                            <p className="text-lg font-bold text-[var(--color-text-primary)]">
                                {PLANS[subscription.plan]?.name || subscription.plan}
                            </p>
                            {subscription.current_period_end && (
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                    次回更新日: {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handlePortal}
                            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
                        >
                            <ExternalLink className="size-4" />
                            プラン管理
                        </button>
                    </div>
                </div>
            )}

            {/* プラン一覧 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][]).map(
                    ([planId, plan]) => {
                        const isCurrent =
                            subscription?.status === "active" && subscription?.plan === planId;
                        const isPremium = planId === "premium";

                        return (
                            <div
                                key={planId}
                                className={cn(
                                    "relative flex flex-col rounded-2xl border-2 p-6 transition-shadow",
                                    isPremium
                                        ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
                                        : "border-[var(--color-border)] bg-[var(--color-surface)]",
                                    isCurrent && "ring-2 ring-[var(--color-success)]"
                                )}
                            >
                                {isPremium && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white">
                                        <Sparkles className="mr-1 inline size-3" />
                                        おすすめ
                                    </div>
                                )}

                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                                        {plan.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                        ¥{plan.price.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-[var(--color-text-muted)]">
                                        /月（税込）
                                    </span>
                                </div>

                                <ul className="mb-6 flex flex-col gap-2">
                                    {plan.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]"
                                        >
                                            <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {isCurrent ? (
                                    <div className="mt-auto flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">
                                        現在のプラン
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout(planId)}
                                        disabled={checkoutLoading !== null}
                                        className={cn(
                                            "mt-auto flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-bold transition-colors disabled:opacity-50",
                                            isPremium
                                                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                                                : "border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                                        )}
                                    >
                                        {checkoutLoading === planId ? (
                                            "処理中..."
                                        ) : (
                                            <>
                                                <Zap className="size-4" />
                                                {subscription ? "プランを変更" : "このプランで始める"}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    }
                )}
            </div>

            {/* 手数料ゼロアピール */}
            <div className="mt-8 rounded-xl border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)] p-5 text-center">
                <CreditCard className="mx-auto mb-2 size-6 text-[var(--color-primary)]" />
                <p className="font-bold text-[var(--color-primary)]">
                    予約手数料 0%
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    月額固定なので、予約が増えるほどお得。ホットペッパーの送客手数料に比べて圧倒的にお得です。
                </p>
            </div>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60dvh] items-center justify-center">
                    <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
                </div>
            }
        >
            <BillingContent />
        </Suspense>
    );
}
