"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Clock, Users, MessageSquare, Check, UtensilsCrossed, X } from "lucide-react";

interface ReservationFormProps {
    shopId: string;
    shopName: string;
    ownerId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ReservationForm({
    shopId,
    shopName,
    ownerId,
    isOpen,
    onClose,
}: ReservationFormProps) {
    const supabase = createClient();
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [partySize, setPartySize] = useState(2);
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<{ id: string; name: string; price: number }[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("seat_only");

    // コース取得
    useEffect(() => {
        const fetchCourses = async () => {
            const { data } = await supabase
                .from("shop_courses")
                .select("id, name, price")
                .eq("shop_id", shopId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (data) setCourses(data);
        };
        fetchCourses();
    }, [shopId, supabase]);

    // 今日以降の日付のみ選択可能
    const today = new Date().toISOString().split("T")[0];

    // 時間帯の選択肢
    const timeSlots: string[] = [];
    for (let h = 11; h <= 23; h++) {
        timeSlots.push(`${String(h).padStart(2, "0")}:00`);
        timeSlots.push(`${String(h).padStart(2, "0")}:30`);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError("予約するにはログインが必要です。");
            setLoading(false);
            return;
        }

        // 予約をインサート
        const { error: insertError } = await supabase.from("reservations").insert({
            user_id: user.id,
            shop_id: shopId,
            course_id: selectedCourse === "seat_only" ? null : selectedCourse,
            reservation_date: date,
            reservation_time: time,
            party_size: partySize,
            note: note || null,
        });

        if (insertError) {
            setError("予約の送信に失敗しました。もう一度お試しください。");
            setLoading(false);
            return;
        }

        // 店舗オーナーに通知を送信（失敗しても予約は成功とする）
        const { error: notifyError } = await supabase.from("notifications").insert({
            user_id: ownerId,
            type: "new_reservation",
            title: "新しい予約リクエスト",
            message: `${date} ${time} に ${partySize}名様の予約リクエストが届きました。`,
            data: {
                shop_id: shopId,
                reservation_date: date,
                reservation_time: time,
                party_size: partySize,
            },
            is_read: false,
        });
        if (notifyError) {
            console.error("通知の送信に失敗しました:", notifyError);
        }

        setSuccess(true);
        setLoading(false);
    };

    const handleClose = () => {
        if (success) {
            setSuccess(false);
            setDate("");
            setTime("");
            setPartySize(2);
            setNote("");
            setSelectedCourse("seat_only");
        }
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    const inputClass =
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={handleClose}
        >
            <div
                className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">
                        {success ? "予約完了" : "予約する"}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                        aria-label="閉じる"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* 成功画面 */}
                {success ? (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-50">
                            <Check className="size-7 text-green-500" />
                        </div>
                        <h4 className="mb-2 text-base font-bold text-gray-800">
                            予約リクエストを送信しました
                        </h4>
                        <p className="text-sm leading-relaxed text-gray-500">
                            {shopName}に予約リクエストを送信しました。
                            <br />
                            店舗からの確認をお待ちください。
                        </p>
                        <button
                            onClick={handleClose}
                            className="mt-6 w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200"
                        >
                            閉じる
                        </button>
                    </div>
                ) : (
                    <>
                        {/* 店舗名表示 */}
                        <p className="mb-4 text-sm text-gray-500">
                            {shopName} への予約
                        </p>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-500">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* 日付 */}
                            <div>
                                <label
                                    htmlFor="reservation-date"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                >
                                    <CalendarDays className="size-4 text-gray-400" />
                                    日付
                                </label>
                                <input
                                    id="reservation-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={today}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            {/* 時間 */}
                            <div>
                                <label
                                    htmlFor="reservation-time"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                >
                                    <Clock className="size-4 text-gray-400" />
                                    時間
                                </label>
                                <select
                                    id="reservation-time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className={inputClass}
                                >
                                    <option value="">時間を選択</option>
                                    {timeSlots.map((slot) => (
                                        <option key={slot} value={slot}>
                                            {slot}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* コース選択 */}
                            <div>
                                <label
                                    htmlFor="course-selection"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                >
                                    <UtensilsCrossed className="size-4 text-gray-400" />
                                    コース選択
                                </label>
                                <select
                                    id="course-selection"
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="seat_only">席のみ予約 (当日注文)</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} (¥{c.price.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 人数 */}
                            <div>
                                <label
                                    htmlFor="party-size"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                >
                                    <Users className="size-4 text-gray-400" />
                                    人数
                                </label>
                                <select
                                    id="party-size"
                                    value={partySize}
                                    onChange={(e) => setPartySize(Number(e.target.value))}
                                    className={inputClass}
                                >
                                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>
                                            {n}名
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 備考 */}
                            <div>
                                <label
                                    htmlFor="note"
                                    className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700"
                                >
                                    <MessageSquare className="size-4 text-gray-400" />
                                    備考（任意）
                                </label>
                                <textarea
                                    id="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="アレルギー、個室希望、お誕生日など"
                                    rows={3}
                                    className={`${inputClass} resize-none placeholder:text-gray-400`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                            >
                                {loading ? "送信中..." : "予約リクエストを送信"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
