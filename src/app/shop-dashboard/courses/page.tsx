"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { Plus, CheckCircle2, ChevronRight, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Course = Database["public"]["Tables"]["shop_courses"]["Row"];

export default function CoursesPage() {
    const supabase = createClient();
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopId, setShopId] = useState<string | null>(null);

    // 新規作成モーダル用ステート
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchCourses = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // 店舗取得
            const { data: shop } = await supabase
                .from("shops")
                .select("id")
                .eq("owner_id", user.id)
                .single();

            if (shop) {
                setShopId(shop.id);
                // コース一覧取得
                const { data: coursesData } = await supabase
                    .from("shop_courses")
                    .select("*")
                    .eq("shop_id", shop.id)
                    .order("created_at", { ascending: false });

                if (coursesData) {
                    setCourses(coursesData);
                }
            }
            setLoading(false);
        };

        fetchCourses();
    }, [supabase]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId) return;

        setSubmitting(true);
        const { error } = await supabase.from("shop_courses").insert({
            shop_id: shopId,
            name: newName,
            price: Number(newPrice),
            description: newDesc || null,
        });

        if (!error) {
            // リフレッシュ処理
            const { data } = await supabase
                .from("shop_courses")
                .select("*")
                .eq("shop_id", shopId)
                .order("created_at", { ascending: false });
            if (data) setCourses(data);

            // フォームリセット
            setNewName("");
            setNewPrice("");
            setNewDesc("");
            setIsModalOpen(false);
        }
        setSubmitting(false);
    };

    const toggleActive = async (id: string, current: boolean) => {
        const { error } = await supabase
            .from("shop_courses")
            .update({ is_active: !current })
            .eq("id", id);

        if (!error) {
            setCourses(courses.map(c => c.id === id ? { ...c, is_active: !current } : c));
        }
    };

    if (loading) {
        return (
            <div className="flex h-[300px] items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8 md:px-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        コース管理
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        事前予約用のコース一覧と金額を設定します。
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    <Plus className="size-4" />
                    <span>新規追加</span>
                </button>
            </div>

            {courses.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-[var(--color-text-primary)] text-lg break-words text-balance">
                                        {course.name}
                                    </h3>
                                    <p className="mt-1 font-semibold text-[var(--color-primary)] tabular-nums">
                                        ¥{course.price.toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleActive(course.id, course.is_active)}
                                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors ${course.is_active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                                        }`}
                                    aria-label={course.is_active ? "無効にする" : "有効にする"}
                                >
                                    <CheckCircle2 className="size-6" />
                                </button>
                            </div>
                            {course.description && (
                                <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3 overflow-wrap break-word">
                                    {course.description}
                                </p>
                            )}
                            <div className="mt-auto pt-4 border-t border-[var(--color-border)] text-sm text-[var(--color-text-muted)] flex items-center justify-between">
                                <span>{course.is_active ? '✅ 予約受付中' : '❌ 受付停止中'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 px-4 text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                        <UtensilsCrossed className="size-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-[var(--color-text-primary)]">
                        コースが登録されていません
                    </h3>
                    <p className="mb-6 max-w-sm text-sm text-[var(--color-text-secondary)]">
                        宴会コースや期間限定メニューなどを登録して、予約時の単価と成約率を向上させましょう。席のみの予約受付も可能です。
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                        <Plus className="size-4" />
                        最初のコースを登録
                    </button>
                </div>
            )}

            {/* モーダル */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-xl">
                        <h2 className="mb-4 pl-1 text-xl font-bold text-[var(--color-text-primary)]">
                            コースの新規登録
                        </h2>
                        <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
                            <div>
                                <label className="mb-1 block pl-1 text-sm font-medium text-[var(--color-text-primary)]">
                                    コース名 <span className="text-[var(--color-danger)]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="例: 【2時間飲み放題】特選焼肉コース"
                                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block pl-1 text-sm font-medium text-[var(--color-text-primary)]">
                                    金額 (税込) <span className="text-[var(--color-danger)]">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                                        ¥
                                    </span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        placeholder="5000"
                                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-4 py-3 text-sm font-medium tabular-nums focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block pl-1 text-sm font-medium text-[var(--color-text-primary)]">
                                    説明（任意）
                                </label>
                                <textarea
                                    rows={3}
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="料理内容や注意事項など"
                                    className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-2 font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                                >
                                    {submitting ? "登録中..." : "コースを登録"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
