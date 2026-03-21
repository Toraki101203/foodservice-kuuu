"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Users,
  Clock,
  Check,
  X as XIcon,
  MessageSquare,
  Bell,
  Navigation,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { createClient } from "@/lib/supabase/client";
import type { Reservation, ReservationStatus } from "@/types/database";

type VisitWithProfile = Reservation & {
  profiles: { display_name: string | null; email: string | null } | null;
};

type Props = {
  shopId: string;
  initialVisits: VisitWithProfile[];
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  on_the_way: "向かっています",
  arrived: "到着済み",
  no_show: "未来店",
  cancelled: "キャンセル",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  on_the_way: "bg-orange-50 text-orange-600",
  arrived: "bg-green-50 text-green-600",
  no_show: "bg-red-50 text-red-500",
  cancelled: "bg-gray-100 text-gray-500",
};

export function ReservationsClient({ shopId, initialVisits }: Props) {
  const [visits, setVisits] = useState<VisitWithProfile[]>(initialVisits);
  const [selectedVisit, setSelectedVisit] = useState<VisitWithProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newVisitAlert, setNewVisitAlert] = useState<VisitWithProfile | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Supabase Realtime: 新規来店通知・ステータス変更をリアルタイム受信
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`shop-visits:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservations",
          filter: `shop_id=eq.${shopId}`,
        },
        async (payload) => {
          const newVisit = payload.new as Reservation;

          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", newVisit.user_id)
            .single();

          const withProfile: VisitWithProfile = {
            ...newVisit,
            profiles: profile,
          };

          setVisits((prev) => {
            if (prev.some((v) => v.id === newVisit.id)) return prev;
            return [withProfile, ...prev];
          });

          // 新規来店アラート表示
          setNewVisitAlert(withProfile);

          // 通知音
          try {
            audioRef.current = new Audio("/notification.mp3");
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
          } catch {
            // 音声再生失敗は無視
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservations",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const updated = payload.new as Reservation;
          setVisits((prev) =>
            prev.map((v) =>
              v.id === updated.id
                ? { ...v, status: updated.status, updated_at: updated.updated_at }
                : v
            )
          );

          setSelectedVisit((prev) =>
            prev?.id === updated.id
              ? { ...prev, status: updated.status, updated_at: updated.updated_at }
              : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  // 今日の来店通知のみ表示
  const todayVisits = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visits.filter((v) => v.reservation_date === today);
  }, [visits]);

  // アクティブな来店通知（on_the_way）
  const activeVisits = useMemo(
    () => todayVisits.filter((v) => v.status === "on_the_way"),
    [todayVisits]
  );

  // 完了済み（arrived / no_show / cancelled）
  const completedVisits = useMemo(
    () => todayVisits.filter((v) => v.status !== "on_the_way"),
    [todayVisits]
  );

  const handleStatusUpdate = useCallback(
    async (visitId: string, newStatus: ReservationStatus) => {
      setIsUpdating(true);

      // 楽観的UI更新
      const previous = visits;
      setVisits((prev) =>
        prev.map((v) =>
          v.id === visitId ? { ...v, status: newStatus } : v
        )
      );

      const res = await fetch("/api/shops/reservations/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, status: newStatus }),
      });

      if (!res.ok) {
        setVisits(previous);
      }

      setIsUpdating(false);
      setSelectedVisit(null);
    },
    [visits]
  );

  // 経過時間を表示（○分前）
  const formatElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    return `${Math.floor(minutes / 60)}時間前`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">来店通知</h1>
        <p className="mt-1 text-sm text-gray-500">
          「今すぐ行く」を押したお客様の通知です
        </p>
      </div>

      {/* 新規来店アラート */}
      {newVisitAlert && (
        <div className="animate-pulse rounded-lg border-2 border-orange-400 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 size-5 shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-orange-800">
                お客様が向かっています！
              </p>
              <p className="mt-1 text-sm text-orange-700">
                {newVisitAlert.profiles?.display_name ?? "ゲスト"} 様 ·{" "}
                {newVisitAlert.party_size}名
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleStatusUpdate(newVisitAlert.id, "arrived");
                    setNewVisitAlert(null);
                  }}
                >
                  <UserCheck className="mr-1 size-4" />
                  到着確認
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewVisitAlert(null);
                    setSelectedVisit(newVisitAlert);
                  }}
                >
                  詳細
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アクティブな来店通知 */}
      {activeVisits.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Navigation className="size-4 text-orange-500" />
            向かっているお客様（{activeVisits.length}名）
          </h2>
          {activeVisits.map((visit) => (
            <Card
              key={visit.id}
              className="cursor-pointer border-orange-200 bg-orange-50/30 transition-shadow hover:shadow-md"
              onClick={() => setSelectedVisit(visit)}
            >
              <CardContent className="flex items-center gap-4 p-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-orange-100">
                  <Navigation className="size-5 text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {visit.profiles?.display_name ?? "ゲスト"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="size-3" />
                    <span>{visit.party_size}名</span>
                    <Clock className="size-3" />
                    <span>{formatElapsed(visit.created_at)}</span>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES.on_the_way)}>
                  {STATUS_LABELS.on_the_way}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 今日のすべてが空 */}
      {todayVisits.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Navigation className="mx-auto size-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">
              今日の来店通知はありません
            </p>
          </CardContent>
        </Card>
      )}

      {/* 完了済み */}
      {completedVisits.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">
            本日の履歴（{completedVisits.length}件）
          </h2>
          {completedVisits.map((visit) => (
            <Card
              key={visit.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedVisit(visit)}
            >
              <CardContent className="flex items-center gap-4 p-3">
                <div className="shrink-0 text-center">
                  <p className="text-sm font-bold tabular-nums text-gray-900">
                    {formatTime(visit.reservation_time)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {visit.profiles?.display_name ?? "ゲスト"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="size-3" />
                    <span>{visit.party_size}名</span>
                    {visit.note && (
                      <>
                        <MessageSquare className="size-3" />
                        <span className="truncate">{visit.note}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[visit.status]
                  )}
                >
                  {STATUS_LABELS[visit.status]}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 来店詳細ボトムシート */}
      <BottomSheet
        open={selectedVisit !== null}
        onClose={() => setSelectedVisit(null)}
        title="来店通知 詳細"
      >
        {selectedVisit && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">お名前</span>
                <span className="font-medium text-gray-900">
                  {selectedVisit.profiles?.display_name ?? "ゲスト"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">通知時刻</span>
                <span className="font-medium tabular-nums text-gray-900">
                  {formatTime(selectedVisit.reservation_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">人数</span>
                <span className="font-medium text-gray-900">
                  {selectedVisit.party_size}名
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">ステータス</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[selectedVisit.status]
                  )}
                >
                  {STATUS_LABELS[selectedVisit.status]}
                </span>
              </div>
              {selectedVisit.note && (
                <div>
                  <span className="text-sm text-gray-500">メモ</span>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedVisit.note}
                  </p>
                </div>
              )}
            </div>

            {/* アクションボタン — on_the_way の場合のみ */}
            {selectedVisit.status === "on_the_way" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    handleStatusUpdate(selectedVisit.id, "arrived")
                  }
                  disabled={isUpdating}
                  className="gap-1 py-3"
                >
                  <UserCheck className="size-5" />
                  到着確認
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    handleStatusUpdate(selectedVisit.id, "no_show")
                  }
                  disabled={isUpdating}
                  className="gap-1 py-3"
                >
                  <UserX className="size-5" />
                  未来店
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
