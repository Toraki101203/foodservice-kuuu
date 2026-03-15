"use client";

import { useState, useMemo } from "react";
import { Calendar, Users, ClipboardList } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feed/empty-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, Shop } from "@/types/database";

type ReservationWithShop = Reservation & {
  shop: Pick<Shop, "name" | "main_image">;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "確認中",
  confirmed: "確定",
  cancelled: "キャンセル",
  completed: "完了",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
};

const TABS = ["今後の予約", "過去の予約"];

export function ReservationsClient({
  reservations: initial,
}: {
  reservations: ReservationWithShop[];
}) {
  const [reservations, setReservations] = useState(initial);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [cancelTarget, setCancelTarget] = useState<ReservationWithShop | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(() => {
    if (activeTab === "今後の予約") {
      return reservations.filter(
        (r) =>
          r.reservation_date >= today &&
          r.status !== "cancelled" &&
          r.status !== "completed"
      );
    }
    return reservations.filter(
      (r) =>
        r.reservation_date < today ||
        r.status === "cancelled" ||
        r.status === "completed"
    );
  }, [reservations, activeTab, today]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const prev = reservations;
    setReservations((rs) =>
      rs.map((r) =>
        r.id === cancelTarget.id ? { ...r, status: "cancelled" as const } : r
      )
    );
    setCancelTarget(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.id);
    if (error) setReservations(prev);
  };

  return (
    <div className="pb-20">
      <h1 className="px-4 py-4 text-xl font-bold text-gray-900">予約一覧</h1>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-12" />}
          title={
            activeTab === "今後の予約"
              ? "今後の予約はありません"
              : "過去の予約はありません"
          }
          description="お店を見つけて予約してみましょう"
          actionLabel="お店を探す"
          actionHref="/search"
        />
      ) : (
        <div className="divide-y divide-gray-100 px-4">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {r.shop?.main_image && (
                    <img
                      src={r.shop.main_image}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {r.shop?.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="size-3" />
                    <span>
                      {r.reservation_date} {r.reservation_time}
                    </span>
                    <Users className="size-3" />
                    <span>{r.party_size}名</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_COLORS[r.status]
                  )}
                >
                  {STATUS_LABELS[r.status]}
                </span>
                {r.status === "pending" && (
                  <button
                    onClick={() => setCancelTarget(r)}
                    className="text-xs text-red-500"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="予約をキャンセル"
        description="この予約をキャンセルしますか？"
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
