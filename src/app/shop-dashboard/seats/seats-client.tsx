"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Armchair,
  Users,
  XCircle,
  Moon,
  Clock,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import type { SeatStatus, SeatStatusType, PlanType } from "@/types/database";

type Props = {
  shopId: string;
  planType: PlanType;
  initialStatus: SeatStatus | null;
};

const STATUS_CONFIG: {
  value: SeatStatusType;
  label: string;
  description: string;
  icon: typeof Armchair;
  bgClass: string;
  activeClass: string;
}[] = [
  {
    value: "available",
    label: "空席あり",
    description: "すぐにご案内できます",
    icon: Armchair,
    bgClass: "bg-green-50 border-green-200",
    activeClass: "bg-green-500 border-green-500 text-white",
  },
  {
    value: "busy",
    label: "やや混雑",
    description: "少しお待ちいただく場合があります",
    icon: Users,
    bgClass: "bg-yellow-50 border-yellow-200",
    activeClass: "bg-yellow-500 border-yellow-500 text-white",
  },
  {
    value: "full",
    label: "満席",
    description: "現在お席がございません",
    icon: XCircle,
    bgClass: "bg-red-50 border-red-200",
    activeClass: "bg-red-500 border-red-500 text-white",
  },
  {
    value: "closed",
    label: "本日休業",
    description: "本日は営業しておりません",
    icon: Moon,
    bgClass: "bg-gray-50 border-gray-200",
    activeClass: "bg-gray-500 border-gray-500 text-white",
  },
];

export function SeatsClient({ shopId, planType, initialStatus }: Props) {
  const [status, setStatus] = useState<SeatStatusType>(
    initialStatus?.status ?? "closed"
  );
  const [updatedAt, setUpdatedAt] = useState<string>(
    initialStatus?.updated_at ?? new Date().toISOString()
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Supabase リアルタイム購読
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`seat_status:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "seat_status",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const newRecord = payload.new as SeatStatus;
          setStatus(newRecord.status);
          setUpdatedAt(newRecord.updated_at);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const handleStatusChange = useCallback(
    async (newStatus: SeatStatusType) => {
      if (newStatus === status || isUpdating) return;

      const previous = status;
      const previousUpdatedAt = updatedAt;
      const now = new Date().toISOString();

      // 楽観的UI更新
      setStatus(newStatus);
      setUpdatedAt(now);
      setIsUpdating(true);

      const supabase = createClient();
      const { error } = await supabase
        .from("seat_status")
        .update({ status: newStatus, updated_at: now })
        .eq("shop_id", shopId);

      if (error) {
        // ロールバック
        setStatus(previous);
        setUpdatedAt(previousUpdatedAt);
      } else {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }

      setIsUpdating(false);
    },
    [shopId, status, updatedAt, isUpdating]
  );

  const isPaidPlan = planType !== "free";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">空席ステータス</h1>
        <p className="mt-1 text-sm text-gray-500">
          お店の空席状況をリアルタイムで更新できます
        </p>
      </div>

      {/* 無料プラン注意 */}
      {!isPaidPlan && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent>
            <p className="text-sm text-orange-700">
              空席ステータスのリアルタイム更新は
              <strong>スタンダードプラン</strong>
              以上でご利用いただけます。現在は閲覧のみ可能です。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 現在のステータス表示 */}
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500">現在のステータス</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={cn(
                "inline-block size-3 rounded-full",
                status === "available" && "bg-green-500",
                status === "busy" && "bg-yellow-500",
                status === "full" && "bg-red-500",
                status === "closed" && "bg-gray-400"
              )}
            />
            <span className="text-2xl font-bold text-gray-900">
              {STATUS_CONFIG.find((s) => s.value === status)?.label}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
            <Clock className="size-3" />
            <span>最終更新: {formatRelativeTime(updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ステータス変更ボタン */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {STATUS_CONFIG.map(
          ({ value, label, description, icon: Icon, bgClass, activeClass }) => {
            const isActive = status === value;
            return (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                disabled={isUpdating || !isPaidPlan}
                className={cn(
                  "relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  isActive ? activeClass : bgClass
                )}
              >
                <Icon className={cn("size-8 shrink-0", isActive ? "text-white" : "text-gray-600")} />
                <div>
                  <p
                    className={cn(
                      "font-bold",
                      isActive ? "text-white" : "text-gray-900"
                    )}
                  >
                    {label}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      isActive ? "text-white/80" : "text-gray-500"
                    )}
                  >
                    {description}
                  </p>
                </div>
                {isActive && (
                  <Check className="absolute top-3 right-3 size-5 text-white" />
                )}
              </button>
            );
          }
        )}
      </div>

      {/* 成功トースト */}
      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          ステータスを更新しました
        </div>
      )}
    </div>
  );
}
