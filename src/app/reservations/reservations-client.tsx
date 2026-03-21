"use client";

import { useState, useMemo, useEffect } from "react";
import { Clock, Users, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feed/empty-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, Shop, ReservationStatus } from "@/types/database";

type VisitWithShop = Reservation & {
  shop: Pick<Shop, "name" | "main_image">;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  on_the_way: "向かっています",
  arrived: "到着済み",
  no_show: "未来店",
  cancelled: "キャンセル",
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  on_the_way: "bg-orange-100 text-orange-700",
  arrived: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function ReservationsClient({
  reservations: initial,
  userId,
}: {
  reservations: VisitWithShop[];
  userId: string;
}) {
  const [visits, setVisits] = useState(initial);
  const [cancelTarget, setCancelTarget] = useState<VisitWithShop | null>(null);
  const [statusNotification, setStatusNotification] = useState<{
    shopName: string;
    status: ReservationStatus;
  } | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Supabase Realtime: ステータス変更をリアルタイム受信
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-visits:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Reservation;
          setVisits((prev) =>
            prev.map((v) => {
              if (v.id !== updated.id) return v;
              const newV = { ...v, status: updated.status, updated_at: updated.updated_at };

              // 到着確認の通知を表示
              if (
                v.status === "on_the_way" &&
                updated.status === "arrived"
              ) {
                setStatusNotification({
                  shopName: v.shop?.name ?? "お店",
                  status: updated.status,
                });
                setTimeout(() => setStatusNotification(null), 5000);
              }

              return newV;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // アクティブな来店（今日 + on_the_way）
  const activeVisits = useMemo(
    () => visits.filter((v) => v.reservation_date === today && v.status === "on_the_way"),
    [visits, today]
  );

  // 履歴（アクティブ以外すべて）
  const pastVisits = useMemo(
    () => visits.filter((v) => v.reservation_date !== today || v.status !== "on_the_way"),
    [visits, today]
  );

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const prev = visits;
    setVisits((vs) =>
      vs.map((v) =>
        v.id === cancelTarget.id ? { ...v, status: "cancelled" as const } : v
      )
    );
    setCancelTarget(null);

    const res = await fetch("/api/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId: cancelTarget.id }),
    });
    if (!res.ok) setVisits(prev);
  };

  return (
    <div className="pb-20">
      <h1 className="px-4 py-4 text-xl font-bold text-gray-900">来店履歴</h1>

      {/* ステータス変更通知 */}
      {statusNotification && (
        <div className="mx-4 mt-1 mb-3 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {statusNotification.shopName} が到着を確認しました
        </div>
      )}

      {/* アクティブな来店 */}
      {activeVisits.length > 0 && (
        <div className="px-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-600">
            <Navigation className="size-4" />
            向かっているお店
          </h2>
          <div className="space-y-2">
            {activeVisits.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {v.shop?.main_image && (
                      <img
                        src={v.shop.main_image}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {v.shop?.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users className="size-3" />
                      <span>{v.party_size}名</span>
                      <Clock className="size-3" />
                      <span>{v.reservation_time}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCancelTarget(v)}
                  className="text-xs text-red-500"
                >
                  取消
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空の状態 */}
      {visits.length === 0 && (
        <EmptyState
          icon={<Navigation className="size-12" />}
          title="来店履歴はありません"
          description="気になるお店を見つけて「今すぐ行く」を試してみましょう"
          actionLabel="お店を探す"
          actionHref="/search"
        />
      )}

      {/* 履歴 */}
      {pastVisits.length > 0 && (
        <div className="mt-4 divide-y divide-gray-100 px-4">
          {activeVisits.length > 0 && (
            <h2 className="pb-2 text-sm font-bold text-gray-900">履歴</h2>
          )}
          {pastVisits.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {v.shop?.main_image && (
                    <img
                      src={v.shop.main_image}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {v.shop?.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{v.reservation_date}</span>
                    <Users className="size-3" />
                    <span>{v.party_size}名</span>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_COLORS[v.status]
                )}
              >
                {STATUS_LABELS[v.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="来店をキャンセル"
        description="「向かっています」をキャンセルしますか？"
      >
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setCancelTarget(null)}
          >
            戻る
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleCancel}>
            キャンセルする
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
