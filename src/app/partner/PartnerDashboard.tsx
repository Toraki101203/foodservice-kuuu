"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Copy,
  DollarSign,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Partner, PartnerPayout, PartnerReferral } from "@/types/database";

// 月額報酬単価（円）
const REVENUE_SHARE: Record<string, number> = {
  standard: 2000,
  premium: 5000,
  free: 0,
};

interface Props {
  partner: Partner;
  referrals: (PartnerReferral & {
    restaurant: { name: string; plan_type: string } | null;
  })[];
  payouts: PartnerPayout[];
}

export function PartnerDashboard({ partner, referrals, payouts }: Props) {
  const [copied, setCopied] = useState(false);

  // 紹介コードをクリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(partner.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: 古いブラウザ対応
      const textarea = document.createElement("textarea");
      textarea.value = partner.referral_code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // アクティブな紹介店舗数
  const activeReferralCount = useMemo(
    () => referrals.filter((r) => r.is_active).length,
    [referrals]
  );

  // 今月の推定収益
  const monthlyEstimate = useMemo(() => {
    return referrals
      .filter((r) => r.is_active)
      .reduce((sum, r) => {
        const planType = r.restaurant?.plan_type || r.plan_type || "free";
        return sum + (REVENUE_SHARE[planType] || 0);
      }, 0);
  }, [referrals]);

  // 累計振込額
  const totalPaid = useMemo(() => {
    return payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payouts]);

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 期間フォーマット
  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const sy = s.getFullYear();
    const sm = s.getMonth() + 1;
    const ey = e.getFullYear();
    const em = e.getMonth() + 1;
    const ed = e.getDate();
    if (sy === ey && sm === em) {
      return `${sy}年${sm}月`;
    }
    return `${sy}年${sm}月 〜 ${ey}年${em}月${ed}日`;
  };

  return (
    <div className="space-y-6">
      {/* 紹介コードセクション */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="mb-2 text-xs font-bold text-[var(--color-text-muted)]">
          あなたの紹介コード
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-wide tabular-nums text-[var(--color-text-primary)]">
            {partner.referral_code}
          </span>
          <button
            onClick={handleCopy}
            aria-label="紹介コードをコピー"
            className={cn(
              "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-bold transition-colors",
              copied
                ? "border-green-300 bg-green-50 text-green-600"
                : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-gray-100"
            )}
          >
            {copied ? (
              <>
                <CheckCircle className="size-4" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="size-4" />
                コピー
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
          このコードを飲食店オーナーに共有してください。契約につながると報酬が発生します。
        </p>
      </section>

      {/* 収益サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Users className="size-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">
                アクティブ紹介店舗
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {activeReferralCount}
                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                  店舗
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <DollarSign className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">
                今月の推定収益
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatCurrency(monthlyEstimate)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2.5">
              <DollarSign className="size-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">
                累計振込額
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 紹介店舗一覧 */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">
          紹介店舗一覧
        </h2>
        {referrals.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* モバイル: カードリスト / デスクトップ: テーブル */}
            {/* デスクトップテーブル */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    店舗名
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    プラン
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    契約日
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-[var(--color-text-muted)]">
                    月額報酬
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => {
                  const planType =
                    referral.restaurant?.plan_type ||
                    referral.plan_type ||
                    "free";
                  const revenuePerMonth = REVENUE_SHARE[planType] || 0;

                  return (
                    <tr
                      key={referral.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                        {referral.restaurant?.name || "不明な店舗"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        <PlanBadge plan={planType} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[var(--color-text-secondary)]">
                        {formatDate(referral.contracted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={referral.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--color-text-primary)]">
                        {referral.is_active
                          ? formatCurrency(revenuePerMonth)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* モバイルカードリスト */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {referrals.map((referral) => {
                const planType =
                  referral.restaurant?.plan_type ||
                  referral.plan_type ||
                  "free";
                const revenuePerMonth = REVENUE_SHARE[planType] || 0;

                return (
                  <div key={referral.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {referral.restaurant?.name || "不明な店舗"}
                      </span>
                      <StatusBadge isActive={referral.is_active} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                        <PlanBadge plan={planType} />
                        <span className="tabular-nums">
                          {formatDate(referral.contracted_at)}
                        </span>
                      </div>
                      <span className="tabular-nums font-bold text-[var(--color-text-primary)]">
                        {referral.is_active
                          ? formatCurrency(revenuePerMonth)
                          : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center text-sm font-medium text-[var(--color-text-muted)]">
            まだ紹介店舗がありません。紹介コードを飲食店オーナーに共有しましょう。
          </p>
        )}
      </section>

      {/* 振込履歴 */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">
          振込履歴
        </h2>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* デスクトップテーブル */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    対象期間
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-[var(--color-text-muted)]">
                    振込日
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-[var(--color-text-muted)]">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {formatPeriod(payout.period_start, payout.period_end)}
                    </td>
                    <td className="px-4 py-3">
                      <PayoutStatusBadge status={payout.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-secondary)]">
                      {payout.paid_at ? formatDate(payout.paid_at) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--color-text-primary)]">
                      {formatCurrency(payout.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* モバイルカードリスト */}
            <div className="divide-y divide-[var(--color-border)] md:hidden">
              {payouts.map((payout) => (
                <div key={payout.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {formatPeriod(payout.period_start, payout.period_end)}
                    </span>
                    <PayoutStatusBadge status={payout.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                      <Calendar className="size-3.5" />
                      {payout.paid_at ? formatDate(payout.paid_at) : "未振込"}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                      {formatCurrency(payout.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-8 text-center text-sm font-medium text-[var(--color-text-muted)]">
            振込履歴はまだありません
          </p>
        )}
      </section>
    </div>
  );
}

/** プランバッジ */
function PlanBadge({ plan }: { plan: string }) {
  const label =
    plan === "premium"
      ? "プレミアム"
      : plan === "standard"
        ? "スタンダード"
        : "フリー";
  const colorClass =
    plan === "premium"
      ? "bg-purple-50 text-purple-700"
      : plan === "standard"
        ? "bg-blue-50 text-blue-700"
        : "bg-gray-100 text-gray-500";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        colorClass
      )}
    >
      {label}
    </span>
  );
}

/** ステータスバッジ（アクティブ/解約済み） */
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
      )}
    >
      {isActive ? (
        <>
          <CheckCircle className="size-3" />
          アクティブ
        </>
      ) : (
        <>
          <XCircle className="size-3" />
          解約済み
        </>
      )}
    </span>
  );
}

/** 振込ステータスバッジ */
function PayoutStatusBadge({ status }: { status: string }) {
  const isPaid = status === "paid";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        isPaid ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
      )}
    >
      {isPaid ? (
        <>
          <CheckCircle className="size-3" />
          支払済み
        </>
      ) : (
        <>
          <Calendar className="size-3" />
          処理中
        </>
      )}
    </span>
  );
}
