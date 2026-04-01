"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CreditCard,
  Crown,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/stripe/plans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { PlanType, Subscription } from "@/types/database";

type Props = {
  shopId: string;
  currentPlan: PlanType;
  subscription: Subscription | null;
};

const PLAN_ORDER: PlanType[] = ["free", "standard", "premium"];

const PLAN_ICONS: Record<PlanType, typeof CreditCard> = {
  free: CreditCard,
  standard: Crown,
  premium: Sparkles,
};

const PLAN_COLORS: Record<PlanType, { border: string; bg: string; text: string }> = {
  free: {
    border: "border-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-600",
  },
  standard: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-600",
  },
  premium: {
    border: "border-orange-400",
    bg: "bg-orange-100",
    text: "text-orange-700",
  },
};

export function BillingClient({ shopId, currentPlan, subscription }: Props) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const cancelScheduled = searchParams.get("cancel_scheduled");

  const [isLoading, setIsLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // プラン変更（既存サブスクリプションなら即座に変更、なければ Stripe Checkout）
  const handleChangePlan = useCallback(
    async (planType: PlanType) => {
      if (planType === currentPlan) return;
      // 無料へのダウングレードは解約で対応
      if (planType === "free") return;

      const plan = PLANS[planType];
      if (!plan.priceId) return;

      setIsLoading(planType);
      setError(null);

      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: planType, shopId }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "チェックアウトの作成に失敗しました");
          return;
        }

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        setError("エラーが発生しました。もう一度お試しください。");
      } finally {
        setIsLoading(null);
      }
    },
    [shopId, currentPlan]
  );

  // Stripe カスタマーポータルへ遷移
  const handleManageBilling = useCallback(async () => {
    setIsLoading(currentPlan);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "ポータルの作成に失敗しました");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(null);
    }
  }, [shopId, currentPlan]);

  // サブスクリプション解約（期間終了時に無料プランへ）
  const handleCancelSubscription = useCallback(async () => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    setIsCanceling(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "解約に失敗しました");
        return;
      }

      setShowCancelDialog(false);
      window.location.href = "/shop-dashboard/billing?cancel_scheduled=true";
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsCanceling(false);
    }
  }, [shopId]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">料金プラン</h1>
        <p className="mt-1 text-sm text-gray-500">
          お店に合ったプランをお選びください
        </p>
      </div>

      {/* 成功・キャンセルメッセージ */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
          <Check className="size-4 shrink-0" />
          プランの変更が完了しました。ご利用ありがとうございます。
        </div>
      )}
      {cancelScheduled && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600">
          <Check className="size-4 shrink-0" />
          解約を受け付けました。現在の請求期間終了まで引き続きご利用いただけます。
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle className="size-4 shrink-0" />
          チェックアウトがキャンセルされました。
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 現在のプラン */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-orange-100">
            <CreditCard className="size-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">現在のプラン</p>
            <p className="font-bold text-gray-900">{PLANS[currentPlan].name}</p>
          </div>
          {subscription?.current_period_end && (
            <p className="text-xs text-gray-500">
              次回更新日:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "ja-JP"
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* プランカード一覧 */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planType) => {
          const plan = PLANS[planType];
          const colors = PLAN_COLORS[planType];
          const Icon = PLAN_ICONS[planType];
          const isCurrent = currentPlan === planType;
          const isPopular = planType === "standard";

          return (
            <Card
              key={planType}
              className={cn(
                "relative h-full transition-shadow hover:shadow-md",
                isCurrent && "ring-2 ring-orange-500",
                isPopular && !isCurrent && "ring-1 ring-orange-300"
              )}
            >
              {/* 人気バッジ */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-medium text-white">
                  人気
                </div>
              )}

              <CardContent className="flex h-full flex-col space-y-4 p-5">
                {/* プランアイコン + 名前 */}
                <div className="text-center">
                  <div
                    className={cn(
                      "mx-auto flex size-12 items-center justify-center rounded-full",
                      colors.bg
                    )}
                  >
                    <Icon className={cn("size-6", colors.text)} />
                  </div>
                  <h3 className="mt-2 font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-1">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-gray-900">
                        無料
                      </span>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold tabular-nums text-gray-900">
                          ¥{plan.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">/月</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 機能リスト */}
                <ul className="flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check
                        className={cn("mt-0.5 size-4 shrink-0", colors.text)}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* アクションボタン */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled
                    >
                      現在のプラン
                    </Button>
                  ) : planType === "free" ? (
                    currentPlan !== "free" ? (
                      <Button
                        variant="outline"
                        className="w-full text-red-500"
                        onClick={handleCancelSubscription}
                        isLoading={isCanceling}
                      >
                        無料プランに戻す
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        無料プラン
                      </Button>
                    )
                  ) : (
                    <Button
                      variant={isPopular ? "primary" : "outline"}
                      className="w-full"
                      onClick={() => handleChangePlan(planType)}
                      isLoading={isLoading === planType}
                    >
                      {PLAN_ORDER.indexOf(planType) > PLAN_ORDER.indexOf(currentPlan)
                        ? "アップグレード"
                        : "プラン変更"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 請求管理 */}
      {subscription?.stripe_customer_id && (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">請求・支払い管理</p>
              <p className="text-sm text-gray-500">
                支払い方法の変更ができます
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              isLoading={isLoading === currentPlan}
            >
              <ExternalLink className="size-4" />
              管理画面
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 解約確認ダイアログ */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="プランを解約しますか？"
        description="現在の請求期間が終了するまで有料機能をご利用いただけます。期間終了後に無料プランに切り替わります。"
      >
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowCancelDialog(false)}
          >
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={confirmCancel}
            isLoading={isCanceling}
          >
            解約する
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
