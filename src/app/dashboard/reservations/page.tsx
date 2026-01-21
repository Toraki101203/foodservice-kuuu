import { Calendar, Clock, User, Phone, MoreVertical, Check, X } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@/types";

/**
 * 予約管理ページ
 */
export default function ReservationsPage() {
    // サンプル予約データ
    const reservations = [
        {
            id: "1",
            user_name: "田中太郎",
            user_phone: "090-1234-5678",
            datetime: "2026-01-21T19:00:00",
            party_size: 4,
            note: "誕生日のお祝いです。可能であれば個室希望",
            status: "pending" as ReservationStatus,
        },
        {
            id: "2",
            user_name: "山田花子",
            user_phone: "080-9876-5432",
            datetime: "2026-01-21T20:00:00",
            party_size: 2,
            note: "",
            status: "confirmed" as ReservationStatus,
        },
        {
            id: "3",
            user_name: "佐藤次郎",
            user_phone: "070-1111-2222",
            datetime: "2026-01-21T21:00:00",
            party_size: 6,
            note: "子連れです（2歳）",
            status: "confirmed" as ReservationStatus,
        },
    ];

    const getStatusBadge = (status: ReservationStatus) => {
        const styles = {
            pending: "bg-yellow-100 text-yellow-700",
            confirmed: "bg-green-100 text-green-700",
            cancelled: "bg-gray-100 text-gray-700",
            completed: "bg-blue-100 text-blue-700",
        };

        const labels = {
            pending: "確認待ち",
            confirmed: "確定",
            cancelled: "キャンセル",
            completed: "来店済み",
        };

        return (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
                {labels[status]}
            </span>
        );
    };

    const formatTime = (datetime: string) => {
        return new Date(datetime).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const pendingCount = reservations.filter((r) => r.status === "pending").length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">予約管理</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        本日の予約: {reservations.length}件
                    </p>
                </div>
                {pendingCount > 0 && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                        {pendingCount}件の確認待ち
                    </span>
                )}
            </div>

            {/* 予約リスト */}
            <div className="space-y-3">
                {reservations.map((reservation) => (
                    <Card key={reservation.id} className="relative">
                        {/* ステータスバッジ */}
                        <div className="mb-3 flex items-center justify-between">
                            {getStatusBadge(reservation.status)}
                            <button
                                className="flex size-8 items-center justify-center rounded-lg hover:bg-gray-100"
                                aria-label="メニュー"
                            >
                                <MoreVertical className="size-5 text-gray-400" />
                            </button>
                        </div>

                        {/* 予約情報 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-gray-400" />
                                    <span className="font-semibold text-gray-900 tabular-nums">
                                        {formatTime(reservation.datetime)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="size-4 text-gray-400" />
                                    <span className="text-gray-600 tabular-nums">
                                        {reservation.party_size}名
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                    {reservation.user_name} 様
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Phone className="size-4 text-gray-400" />
                                <a
                                    href={`tel:${reservation.user_phone}`}
                                    className="text-sm text-orange-500 hover:underline"
                                >
                                    {reservation.user_phone}
                                </a>
                            </div>

                            {reservation.note && (
                                <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
                                    📝 {reservation.note}
                                </div>
                            )}
                        </div>

                        {/* アクションボタン（確認待ちの場合） */}
                        {reservation.status === "pending" && (
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1">
                                    <X className="mr-1 size-4" />
                                    お断り
                                </Button>
                                <Button size="sm" className="flex-1">
                                    <Check className="mr-1 size-4" />
                                    確定する
                                </Button>
                            </div>
                        )}

                        {/* アクションボタン（確定済みの場合） */}
                        {reservation.status === "confirmed" && (
                            <div className="mt-4">
                                <Button variant="secondary" size="sm" className="w-full">
                                    来店済みにする
                                </Button>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {reservations.length === 0 && (
                <Card className="py-12 text-center">
                    <Calendar className="mx-auto mb-4 size-12 text-gray-300" />
                    <p className="text-gray-500">本日の予約はありません</p>
                </Card>
            )}
        </div>
    );
}
