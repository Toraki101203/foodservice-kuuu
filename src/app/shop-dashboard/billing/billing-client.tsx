"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import type { PlanType } from "@/types/database";

interface Props {
    currentPlan: PlanType;
    shopId: string;
}

const plans = [
    {
        key: "free" as const,
        name: "無料",
        price: "¥0",
        features: ["店舗掲載", "Instagram URL登録（6件）", "基本プロフィール"],
    },
    {
        key: "standard" as const,
        name: "スタンダード",
        price: "¥9,800/月",
        features: ["空席リアルタイム更新", "予約受付", "Instagram自動同期", "基本分析"],
        recommended: true,
    },
    {
        key: "premium" as const,
        name: "プレミアム",
        price: "¥29,800/月",
        features: ["AI投稿最適化提案", "詳細集客分析", "優先表示", "全スタンダード機能"],
    },
];

export function BillingClient({ currentPlan, shopId }: Props) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const { toast } = useToast();

    const handleUpgrade = async (planKey: PlanType) => {
        if (planKey === "free") return;
        setIsLoading(planKey);

        const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planType: planKey, shopId }),
        });

        if (res.ok) {
            const { url } = await res.json();
            window.location.href = url;
        } else {
            toast("決済ページの作成に失敗しました", "error");
        }
        setIsLoading(null);
    };

    const handleManage = async () => {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        if (res.ok) {
            const { url } = await res.json();
            window.location.href = url;
        } else {
            toast("ポータルの表示に失敗しました", "error");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">料金プラン</h1>
                <p className="text-sm text-gray-500">現在のプラン: {plans.find((p) => p.key === currentPlan)?.name}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = plan.key === currentPlan;
                    return (
                        <Card
                            key={plan.key}
                            className={cn(
                                plan.recommended && "ring-2 ring-orange-500",
                            )}
                        >
                            <CardContent className="flex flex-col gap-4">
                                {plan.recommended && (
                                    <span className="self-start rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                                        おすすめ
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                    <p className="text-2xl font-bold text-orange-500">{plan.price}</p>
                                </div>
                                <ul className="space-y-2">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className="size-4 text-green-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                {isCurrent ? (
                                    <Button variant="secondary" size="sm" disabled className="w-full">
                                        現在のプラン
                                    </Button>
                                ) : plan.key === "free" ? (
                                    <Button variant="ghost" size="sm" onClick={handleManage} className="w-full">
                                        ダウングレード
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => handleUpgrade(plan.key)}
                                        isLoading={isLoading === plan.key}
                                        className="w-full"
                                    >
                                        アップグレード
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {currentPlan !== "free" && (
                <div className="text-center">
                    <button onClick={handleManage} className="text-sm text-gray-500 hover:underline">
                        Stripe カスタマーポータルを開く
                    </button>
                </div>
            )}
        </div>
    );
}
