"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Calendar, Users, Clock, Check, X } from "lucide-react";
import type { Reservation, User } from "@/types/database";

type ReservationWithUser = Reservation & {
    user: Pick<User, "display_name" | "email"> | null;
};

interface Props {
    reservations: ReservationWithUser[];
    shopId: string;
}

export function DashboardReservationsClient({ reservations: initial, shopId }: Props) {
    const [reservations, setReservations] = useState(initial);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const { toast } = useToast();

    const filtered = useMemo(() => {
        return reservations.filter((r) => r.reservation_date === selectedDate);
    }, [reservations, selectedDate]);

    const handleAction = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
        const prev = reservations;
        setReservations((r) => r.map((res) => (res.id === id ? { ...res, status } : res)));

        const supabase = createClient();
        const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
        if (error) {
            setReservations(prev);
            toast("更新に失敗しました", "error");
        } else {
            const labels = { confirmed: "確定", cancelled: "キャンセル", completed: "完了" };
            toast(`予約を${labels[status]}しました`);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">予約台帳</h1>
            </div>

            <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm"
            />

            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">この日の予約はありません</p>
                ) : (
                    filtered.map((res) => (
                        <Card key={res.id}>
                            <CardContent>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900">{res.user?.display_name ?? "ゲスト"}</p>
                                        <p className="text-xs text-gray-500">{res.user?.email}</p>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">
                                        {res.status === "pending" ? "確認待ち" : res.status === "confirmed" ? "確定" : res.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1"><Clock className="size-4" />{res.reservation_time}</span>
                                    <span className="flex items-center gap-1"><Users className="size-4" />{res.party_size}名</span>
                                </div>
                                {res.note && <p className="mt-2 text-xs text-gray-500">備考: {res.note}</p>}
                                {res.status === "pending" && (
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" onClick={() => handleAction(res.id, "confirmed")}>
                                            <Check className="size-4" /> 確定
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleAction(res.id, "cancelled")}>
                                            <X className="size-4" /> キャンセル
                                        </Button>
                                    </div>
                                )}
                                {res.status === "confirmed" && (
                                    <div className="mt-3">
                                        <Button variant="secondary" size="sm" onClick={() => handleAction(res.id, "completed")}>
                                            完了にする
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
