"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Dialog, BottomSheet } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface ReservationFormProps {
    shopId: string;
    userId: string;
    onClose: () => void;
}

export function ReservationForm({ shopId, userId, onClose }: ReservationFormProps) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [partySize, setPartySize] = useState("2");
    const [note, setNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        setShowConfirm(false);

        const supabase = createClient();
        const { error } = await supabase.from("reservations").insert({
            user_id: userId,
            shop_id: shopId,
            reservation_date: date,
            reservation_time: time,
            party_size: parseInt(partySize),
            note: note || null,
            status: "pending",
        });

        if (error) {
            toast("予約に失敗しました", "error");
        } else {
            toast("予約リクエストを送信しました");
            onClose();
        }
        setIsLoading(false);
    };

    return (
        <>
            <BottomSheet open onClose={onClose}>
                <h3 className="mb-4 text-lg font-bold text-gray-900">予約する</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="date"
                        label="日付"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                    />
                    <Input
                        id="time"
                        label="時間"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                    />
                    <Input
                        id="partySize"
                        label="人数"
                        type="number"
                        value={partySize}
                        onChange={(e) => setPartySize(e.target.value)}
                        min="1"
                        max="20"
                        required
                    />
                    <Input
                        id="note"
                        label="備考（任意）"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="アレルギー、お祝いなど"
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        確認画面へ
                    </Button>
                </form>
            </BottomSheet>

            <Dialog
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="予約内容の確認"
                description={`${date} ${time} / ${partySize}名`}
            >
                <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
                    戻る
                </Button>
                <Button size="sm" onClick={handleConfirm} isLoading={isLoading}>
                    予約を確定
                </Button>
            </Dialog>
        </>
    );
}
