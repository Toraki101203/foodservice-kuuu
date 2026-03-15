"use client";

import { useState, useMemo } from "react";
import { Copy, Check, TrendingUp, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Partner, PartnerReferral, PartnerPayout, PlanType } from "@/types/database";

// --- 型定義 ---

type ReferralWithShop = PartnerReferral & {
  shops: { name: string; plan_type: PlanType } | null;
};

type PartnerWithRelations = Partner & {
  partner_referrals: ReferralWithShop[];
  partner_payouts: PartnerPayout[];
};

type Props = {
  partner: PartnerWithRelations;
};

// --- プラン日本語ラベル ---

const PLAN_LABELS: Record<PlanType, string> = {
  free: "無料",
  standard: "スタンダード",
  premium: "プレミアム",
};

// --- 紹介報酬ステータスラベル ---

function getReferralStatusLabel(referral: ReferralWithShop): string {
  if (!referral.contracted_at) return "未契約";
  if (!referral.is_active) return "解約済み";
  return "契約中";
}

function getReferralStatusColor(referral: ReferralWithShop): string {
  if (!referral.contracted_at) return "text-gray-500";
  if (!referral.is_active) return "text-red-500";
  return "text-green-600";
}

// --- コンポーネント ---

export function PartnerDashboard({ partner }: Props) {
  const [copied, setCopied] = useState(false);

  const referrals = partner.partner_referrals;
  const payouts = partner.partner_payouts;

  // 統計値を派生状態として計算
  const stats = useMemo(() => {
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(
      (r) => r.is_active && r.contracted_at
    ).length;
    const totalEarnings = payouts.reduce((sum, p) => sum + p.amount, 0);
    return { totalReferrals, activeReferrals, totalEarnings };
  }, [referrals, payouts]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(partner.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 紹介コード */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-gray-500">あなたの紹介コード</p>
            <p className="mt-1 text-xl font-bold tracking-wide text-gray-900">
              {partner.referral_code}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex size-10 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50"
            aria-label="紹介コードをコピー"
          >
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </CardContent>
      </Card>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
              <TrendingUp className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">紹介数</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {stats.totalReferrals}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-100">
              <Users className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">契約中</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {stats.activeReferrals}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-orange-100">
              <Wallet className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">累計報酬</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                &yen;{stats.totalEarnings.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 紹介一覧 */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">紹介一覧</h2>
        {referrals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-gray-500">
                紹介実績はまだありません。紹介コードを共有して店舗を紹介しましょう。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    店舗名
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    プラン
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    契約日
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr
                    key={referral.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-4 py-2 text-gray-900">
                      {referral.shops?.name ?? "---"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {referral.plan_type
                        ? PLAN_LABELS[referral.plan_type]
                        : "---"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                      {referral.contracted_at
                        ? new Date(referral.contracted_at).toLocaleDateString(
                            "ja-JP"
                          )
                        : "---"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 font-medium",
                        getReferralStatusColor(referral)
                      )}
                    >
                      {getReferralStatusLabel(referral)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 報酬履歴 */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">報酬履歴</h2>
        {payouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-gray-500">
                報酬履歴はまだありません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    対象期間
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    金額
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-4 py-2 text-gray-600 tabular-nums">
                      {new Date(payout.period_start).toLocaleDateString(
                        "ja-JP"
                      )}{" "}
                      〜{" "}
                      {new Date(payout.period_end).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 tabular-nums">
                      &yen;{payout.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          payout.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}
                      >
                        {payout.status === "paid" ? "支払済み" : "処理中"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
