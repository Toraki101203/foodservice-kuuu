"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useRestaurantOwnerStore } from "@/store";
import type { SeatStatusType } from "@/types/database";

const statuses: { key: SeatStatusType; label: string; color: string }[] = [
    { key: "available", label: "空席あり", color: "bg-green-500 hover:bg-green-600 text-white" },
    { key: "busy", label: "やや混雑", color: "bg-yellow-500 hover:bg-yellow-600 text-white" },
    { key: "full", label: "満席", color: "bg-red-500 hover:bg-red-600 text-white" },
    { key: "closed", label: "休業", color: "bg-gray-400 hover:bg-gray-500 text-white" },
];

export default function SeatsPage() {
    const [current, setCurrent] = useState<SeatStatusType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const restaurant = useRestaurantOwnerStore((s) => s.restaurant);
    const { toast } = useToast();

    useEffect(() => {
        if (!restaurant) return;
        const supabase = createClient();
        supabase
            .from("seat_status")
            .select("status")
            .eq("restaurant_id", restaurant.id)
            .single()
            .then(({ data }) => {
                if (data) setCurrent(data.status as SeatStatusType);
                setIsLoading(false);
            });
    }, [restaurant]);

    const handleUpdate = async (status: SeatStatusType) => {
        if (!restaurant) return;
        const prev = current;
        setCurrent(status);

        const supabase = createClient();
        const { error } = await supabase
            .from("seat_status")
            .upsert({
                restaurant_id: restaurant.id,
                status,
                updated_at: new Date().toISOString(),
            }, { onConflict: "restaurant_id" });

        if (error) {
            setCurrent(prev);
            toast("更新に失敗しました", "error");
        } else {
            toast("空席ステータスを更新しました");
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center py-20 text-sm text-gray-400">読み込み中...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">空席管理</h1>
                <p className="text-sm text-gray-500">ボタンを押して現在の空席状況を更新</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {statuses.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => handleUpdate(s.key)}
                        className={cn(
                            "flex h-24 flex-col items-center justify-center rounded-2xl text-lg font-bold transition-all",
                            current === s.key
                                ? `${s.color} ring-4 ring-offset-2 ring-gray-300 scale-105`
                                : `${s.color} opacity-60`,
                        )}
                    >
                        {s.label}
                        {current === s.key && <span className="mt-1 text-xs font-normal opacity-80">現在</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}
