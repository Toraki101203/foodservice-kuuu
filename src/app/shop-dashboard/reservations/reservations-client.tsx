"use client";

import { useState, useMemo, useCallback } from "react";
import { format, addDays, isToday } from "date-fns";
import {
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X as XIcon,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Reservation, ReservationStatus } from "@/types/database";

type ReservationWithProfile = Reservation & {
  profiles: { display_name: string | null; email: string | null } | null;
};

type Props = {
  shopId: string;
  initialReservations: ReservationWithProfile[];
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "未確認",
  confirmed: "確認済み",
  cancelled: "キャンセル",
  completed: "完了",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  confirmed: "bg-green-50 text-green-600",
  cancelled: "bg-red-50 text-red-500",
  completed: "bg-gray-100 text-gray-500",
};

export function ReservationsClient({ shopId, initialReservations }: Props) {
  const [reservations, setReservations] =
    useState<ReservationWithProfile[]>(initialReservations);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 横スクロール用の日付リスト（前日 + 今日 + 7日先）
  const dateList = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 9 }, (_, i) => {
      const d = addDays(today, i - 1);
      return {
        date: format(d, "yyyy-MM-dd"),
        dayLabel: format(d, "E"),
        dateLabel: format(d, "d"),
        monthLabel: format(d, "M月"),
        isToday: isToday(d),
      };
    });
  }, []);

  // 選択日の予約をフィルタ
  const filteredReservations = useMemo(
    () => reservations.filter((r) => r.reservation_date === selectedDate),
    [reservations, selectedDate]
  );

  // 予約の件数集計（日付別）
  const countByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reservations) {
      if (r.status !== "cancelled") {
        counts[r.reservation_date] = (counts[r.reservation_date] ?? 0) + 1;
      }
    }
    return counts;
  }, [reservations]);

  const handleStatusUpdate = useCallback(
    async (reservationId: string, newStatus: ReservationStatus) => {
      setIsUpdating(true);

      // 楽観的UI更新
      const previous = reservations;
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: newStatus } : r
        )
      );

      const supabase = createClient();
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", reservationId);

      if (error) {
        setReservations(previous);
      }

      setIsUpdating(false);
      setSelectedReservation(null);
    },
    [reservations]
  );

  // 日付を前後に移動
  const navigateDate = (direction: -1 | 1) => {
    const currentIndex = dateList.findIndex((d) => d.date === selectedDate);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < dateList.length) {
      setSelectedDate(dateList[newIndex].date);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">予約台帳</h1>
        <p className="mt-1 text-sm text-gray-500">
          予約の確認・管理ができます
        </p>
      </div>

      {/* 日付セレクター */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateDate(-1)}
          className="shrink-0 rounded-lg p-2 hover:bg-gray-100"
          aria-label="前日"
        >
          <ChevronLeft className="size-5 text-gray-600" />
        </button>
        <div className="flex flex-1 gap-1.5 overflow-x-auto py-1 scrollbar-hide">
          {dateList.map(({ date, dayLabel, dateLabel, monthLabel, isToday: today }) => {
            const count = countByDate[date] ?? 0;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-xs transition-colors",
                  selectedDate === date
                    ? "bg-orange-500 text-white"
                    : today
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className="text-[10px]">{monthLabel}</span>
                <span className="text-lg font-bold tabular-nums">{dateLabel}</span>
                <span>{dayLabel}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "mt-0.5 size-1.5 rounded-full",
                      selectedDate === date ? "bg-white" : "bg-orange-400"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="shrink-0 rounded-lg p-2 hover:bg-gray-100"
          aria-label="翌日"
        >
          <ChevronRight className="size-5 text-gray-600" />
        </button>
      </div>

      {/* 予約リスト */}
      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto size-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">
              この日の予約はありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredReservations.map((reservation) => (
            <Card
              key={reservation.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedReservation(reservation)}
            >
              <CardContent className="flex items-center gap-4 p-3">
                {/* 時刻 */}
                <div className="shrink-0 text-center">
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    {formatTime(reservation.reservation_time)}
                  </p>
                </div>

                {/* 情報 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {reservation.profiles?.display_name ?? "ゲスト"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="size-3" />
                    <span>{reservation.party_size}名</span>
                    {reservation.note && (
                      <>
                        <MessageSquare className="size-3" />
                        <span className="truncate">{reservation.note}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* ステータスバッジ */}
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[reservation.status]
                  )}
                >
                  {STATUS_LABELS[reservation.status]}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 予約詳細ボトムシート */}
      <BottomSheet
        open={selectedReservation !== null}
        onClose={() => setSelectedReservation(null)}
        title="予約詳細"
      >
        {selectedReservation && (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">お名前</span>
                <span className="font-medium text-gray-900">
                  {selectedReservation.profiles?.display_name ?? "ゲスト"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">日時</span>
                <span className="font-medium tabular-nums text-gray-900">
                  {selectedReservation.reservation_date}{" "}
                  {formatTime(selectedReservation.reservation_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">人数</span>
                <span className="font-medium text-gray-900">
                  {selectedReservation.party_size}名
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">ステータス</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[selectedReservation.status]
                  )}
                >
                  {STATUS_LABELS[selectedReservation.status]}
                </span>
              </div>
              {selectedReservation.note && (
                <div>
                  <span className="text-sm text-gray-500">メモ</span>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedReservation.note}
                  </p>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="primary"
                onClick={() =>
                  handleStatusUpdate(selectedReservation.id, "confirmed")
                }
                disabled={
                  isUpdating || selectedReservation.status === "confirmed"
                }
                className="flex-col gap-1 py-3"
              >
                <Check className="size-5" />
                <span className="text-xs">確認</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  handleStatusUpdate(selectedReservation.id, "completed")
                }
                disabled={
                  isUpdating || selectedReservation.status === "completed"
                }
                className="flex-col gap-1 py-3"
              >
                <CheckCircle className="size-5" />
                <span className="text-xs">完了</span>
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  handleStatusUpdate(selectedReservation.id, "cancelled")
                }
                disabled={
                  isUpdating || selectedReservation.status === "cancelled"
                }
                className="flex-col gap-1 py-3"
              >
                <XIcon className="size-5" />
                <span className="text-xs">キャンセル</span>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
