"use client";
import { useState, useMemo } from "react";
import { ArrowLeft, Calendar, Users, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, Card, CardContent, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/feed/empty-state";
import type { Reservation, Restaurant } from "@/types/database";

type ReservationWithShop = Reservation & {
    shop: Pick<Restaurant, "id" | "name" | "main_image" | "address">;
};

interface ReservationsClientProps {
    reservations: ReservationWithShop[];
}

const tabs = [
    { key: "upcoming", label: "今後の予約" },
    { key: "past", label: "過去の予約" },
];

export function ReservationsClient({ reservations: initial }: ReservationsClientProps) {
    const [reservations, setReservations] = useState(initial);
    const [activeTab, setActiveTab] = useState("upcoming");
    const router = useRouter();
    const { toast } = useToast();

    const today = new Date().toISOString().split("T")[0];

    const filtered = useMemo(() => {
        return reservations.filter((r) =>
            activeTab === "upcoming" ? r.reservation_date >= today : r.reservation_date < today,
        );
    }, [reservations, activeTab, today]);

    const handleCancel = async (id: string) => {
        const prev = reservations;
        setReservations((r) => r.map((res) => (res.id === id ? { ...res, status: "cancelled" as const } : res)));

        const supabase = createClient();
        const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
        if (error) {
            setReservations(prev);
            toast("キャンセルに失敗しました", "error");
        } else {
            toast("予約をキャンセルしました");
        }
    };

    const statusLabel: Record<string, string> = {
        pending: "確認待ち",
        confirmed: "確定",
        cancelled: "キャンセル済",
        completed: "完了",
    };

    const statusColor: Record<string, string> = {
        pending: "text-yellow-600 bg-yellow-50",
        confirmed: "text-green-600 bg-green-50",
        cancelled: "text-gray-500 bg-gray-100",
        completed: "text-blue-600 bg-blue-50",
    };

    return (
        <div className="px-4 py-4">
            <div className="mb-4 flex items-center gap-3">
                <button onClick={() => router.back()} aria-label="戻る">
                    <ArrowLeft className="size-6 text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">予約一覧</h1>
            </div>

            <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

            <div className="mt-4 space-y-3">
                {filtered.length === 0 ? (
                    <EmptyState
                        title={activeTab === "upcoming" ? "予約がありません" : "過去の予約はありません"}
                        description={activeTab === "upcoming" ? "お気に入りのお店を予約してみましょう" : ""}
                        actionLabel={activeTab === "upcoming" ? "お店を探す" : undefined}
                        actionHref={activeTab === "upcoming" ? "/search" : undefined}
                    />
                ) : (
                    filtered.map((res) => (
                        <Card key={res.id}>
                            <CardContent>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{res.shop.name}</h3>
                                        <p className="mt-1 text-xs text-gray-500">{res.shop.address}</p>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor[res.status]}`}>
                                        {statusLabel[res.status]}
                                    </span>
                                </div>
                                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="size-4 text-gray-400" />
                                        {res.reservation_date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="size-4 text-gray-400" />
                                        {res.reservation_time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="size-4 text-gray-400" />
                                        {res.party_size}名
                                    </span>
                                </div>
                                {res.status === "pending" && (
                                    <div className="mt-3 flex justify-end">
                                        <Button variant="danger" size="sm" onClick={() => handleCancel(res.id)}>
                                            キャンセル
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
