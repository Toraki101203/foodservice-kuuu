"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import ReservationForm from "@/components/reservation/ReservationForm";

interface ShopDetailClientProps {
    shopId: string;
    shopName: string;
    ownerId: string;
}

/**
 * 店舗詳細ページのクライアントコンポーネント
 * 予約ボタン（固定CTA）と予約モーダルを管理
 */
export default function ShopDetailClient({ shopId, shopName, ownerId }: ShopDetailClientProps) {
    const [isReservationOpen, setIsReservationOpen] = useState(false);

    return (
        <>
            {/* 固定CTA: 予約するボタン */}
            <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm pb-safe">
                <div className="mx-auto max-w-lg">
                    <button
                        onClick={() => setIsReservationOpen(true)}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition-colors hover:bg-orange-600 active:scale-[0.98]"
                    >
                        <CalendarDays className="size-5" />
                        予約する
                    </button>
                </div>
            </div>

            {/* 予約モーダル */}
            <ReservationForm
                shopId={shopId}
                shopName={shopName}
                ownerId={ownerId}
                isOpen={isReservationOpen}
                onClose={() => setIsReservationOpen(false)}
            />
        </>
    );
}
