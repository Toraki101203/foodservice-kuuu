"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types";
import { Check } from "lucide-react";

const seatStatuses: {
    value: SeatStatusType;
    label: string;
    emoji: string;
    description: string;
    color: string;
}[] = [
        {
            value: "available",
            label: "空席あり",
            emoji: "🟢",
            description: "すぐにご案内できます",
            color: "border-green-500 bg-green-50",
        },
        {
            value: "busy",
            label: "やや混雑",
            emoji: "🟡",
            description: "少しお待ちいただく場合があります",
            color: "border-yellow-500 bg-yellow-50",
        },
        {
            value: "full",
            label: "満席",
            emoji: "🔴",
            description: "現在満席です",
            color: "border-red-500 bg-red-50",
        },
        {
            value: "closed",
            label: "閉店中",
            emoji: "⚪",
            description: "本日の営業は終了しました",
            color: "border-gray-400 bg-gray-50",
        },
    ];

/**
 * 席状況更新ページ
 */
export default function SeatsPage() {
    const [currentStatus, setCurrentStatus] = useState<SeatStatusType>("available");
    const [availableSeats, setAvailableSeats] = useState(5);
    const [waitTime, setWaitTime] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const handleSave = async () => {
        setIsSaving(true);

        try {
            // TODO: Supabaseに保存
            await new Promise((resolve) => setTimeout(resolve, 500));
            setLastUpdated(new Date());
        } catch (error) {
            console.error("保存に失敗しました:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">席状況を更新</h2>
                <p className="mt-1 text-gray-600">
                    ワンタップで現在の席状況をお客様にお知らせできます
                </p>
            </div>

            {/* ステータス選択 */}
            <div className="grid grid-cols-2 gap-3">
                {seatStatuses.map((status) => (
                    <button
                        key={status.value}
                        onClick={() => setCurrentStatus(status.value)}
                        className={cn(
                            "relative rounded-xl border-2 p-4 text-left transition-all",
                            currentStatus === status.value
                                ? status.color
                                : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                    >
                        {currentStatus === status.value && (
                            <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white shadow-sm">
                                <Check className="size-4 text-green-600" />
                            </div>
                        )}
                        <span className="mb-1 block text-2xl">{status.emoji}</span>
                        <span className="block font-medium text-gray-900">
                            {status.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                            {status.description}
                        </span>
                    </button>
                ))}
            </div>

            {/* 詳細設定 */}
            {(currentStatus === "available" || currentStatus === "busy") && (
                <Card>
                    <h3 className="mb-4 font-semibold text-gray-900">詳細情報</h3>

                    {/* 空席数 */}
                    {currentStatus === "available" && (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                おおよその空席数
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setAvailableSeats(Math.max(0, availableSeats - 1))}
                                    className="flex size-10 items-center justify-center rounded-lg border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50"
                                    disabled={availableSeats <= 0}
                                >
                                    −
                                </button>
                                <span className="min-w-[4rem] text-center text-2xl font-bold text-gray-900 tabular-nums">
                                    {availableSeats}席
                                </span>
                                <button
                                    onClick={() => setAvailableSeats(availableSeats + 1)}
                                    className="flex size-10 items-center justify-center rounded-lg border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 待ち時間 */}
                    {currentStatus === "busy" && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                おおよその待ち時間
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[0, 10, 15, 20, 30, 45, 60].map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => setWaitTime(time)}
                                        className={cn(
                                            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                                            waitTime === time
                                                ? "border-orange-500 bg-orange-50 text-orange-600"
                                                : "border-gray-300 text-gray-600 hover:border-gray-400"
                                        )}
                                    >
                                        {time === 0 ? "待ち時間なし" : `約${time}分`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* 保存ボタン */}
            <Button
                onClick={handleSave}
                isLoading={isSaving}
                className="w-full"
                size="lg"
            >
                この状況で更新する
            </Button>

            {/* 最終更新 */}
            {lastUpdated && (
                <p className="text-center text-sm text-gray-500">
                    最終更新:{" "}
                    {lastUpdated.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            )}

            {/* ヒント */}
            <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="font-medium text-blue-900">ヒント</p>
                        <p className="text-sm text-blue-700">
                            席状況をこまめに更新すると、お客様からの信頼度がアップします。
                            営業開始時と混雑状況が変わった時に更新するのがおすすめです。
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
