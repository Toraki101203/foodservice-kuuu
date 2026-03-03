"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Store,
    Users,
    CalendarDays,
    TrendingUp,
    Ban,
    CheckCircle,
    UserPlus,
    Trash2,
} from "lucide-react";
import type { Database } from "@/types/database";

type Shop = Database["public"]["Tables"]["shops"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function AdminDashboardPage() {
    const supabase = createClient();
    const [shops, setShops] = useState<Shop[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalReservations, setTotalReservations] = useState(0);
    const [mrr, setMrr] = useState(0);
    const [loading, setLoading] = useState(true);

    // 新規アカウント発行
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newShopName, setNewShopName] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const load = async () => {
            // 全店舗
            const { data: shopsData } = await supabase
                .from("shops")
                .select("*")
                .order("created_at", { ascending: false });
            setShops(shopsData || []);

            // ユーザー数
            const { count: userCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true });
            setTotalUsers(userCount || 0);

            // 予約数
            const { count: resCount } = await supabase
                .from("reservations")
                .select("*", { count: "exact", head: true });
            setTotalReservations(resCount || 0);

            // MRR (月額収益)
            const { data: subsData } = await supabase
                .from("subscriptions")
                .select("plan")
                .eq("status", "active");

            let calculatedMrr = 0;
            if (subsData) {
                subsData.forEach(sub => {
                    if (sub.plan === "starter") calculatedMrr += 9800; // 仮のプラン料金
                    if (sub.plan === "premium") calculatedMrr += 19800;
                });
            }
            setMrr(calculatedMrr);

            setLoading(false);
        };
        load();
    }, []);

    const toggleShopStatus = async (shopId: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "suspended" : "active";
        await supabase.from("shops").update({ status: newStatus }).eq("id", shopId);

        setShops(
            shops.map((s) => (s.id === shopId ? { ...s, status: newStatus as "active" | "suspended" } : s))
        );
    };

    const deletePost = async (postId: string) => {
        await supabase.from("posts").delete().eq("id", postId);
    };

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
                管理者ダッシュボード
            </h1>

            {/* KPIサマリー */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <Store className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">総店舗数</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {shops.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <Users className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">総ユーザー数</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {totalUsers}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <CalendarDays className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">総予約数</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                {totalReservations}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--color-primary-light)] p-2.5">
                            <TrendingUp className="size-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-muted)]">MRR</p>
                            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                                ¥{mrr.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 新規アカウント発行 */}
            <div className="mb-8">
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    <UserPlus className="size-4" />
                    新規店舗アカウント発行
                </button>

                {showCreateForm && (
                    <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                        <h3 className="mb-3 font-bold text-[var(--color-text-primary)]">
                            店舗アカウント発行
                        </h3>
                        <div className="flex flex-col gap-3 md:flex-row">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="メールアドレス"
                                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="初期パスワード"
                                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <input
                                type="text"
                                value={newShopName}
                                onChange={(e) => setNewShopName(e.target.value)}
                                placeholder="店舗名"
                                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <button
                                disabled={creating}
                                onClick={async () => {
                                    setCreating(true);
                                    // 管理者APIで店舗アカウント作成（実際にはサーバーサイドAPIを経由）
                                    const { data, error } = await supabase.auth.signUp({
                                        email: newEmail,
                                        password: newPassword,
                                        options: {
                                            data: {
                                                display_name: newShopName,
                                                role: "shop_owner",
                                            },
                                        },
                                    });

                                    if (data?.user) {
                                        // 店舗レコード作成
                                        await supabase.from("shops").insert({
                                            owner_id: data.user.id,
                                            name: newShopName,
                                        });
                                    }

                                    setNewEmail("");
                                    setNewPassword("");
                                    setNewShopName("");
                                    setShowCreateForm(false);
                                    setCreating(false);
                                    window.location.reload();
                                }}
                                className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
                            >
                                {creating ? "作成中..." : "発行"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 店舗一覧 */}
            <section>
                <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">
                    店舗一覧
                </h2>
                {shops.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                                        店舗名
                                    </th>
                                    <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                                        ジャンル
                                    </th>
                                    <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                                        ステータス
                                    </th>
                                    <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                                        登録日
                                    </th>
                                    <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {shops.map((shop) => (
                                    <tr
                                        key={shop.id}
                                        className="border-b border-[var(--color-border)] last:border-b-0"
                                    >
                                        <td className="px-4 py-3 font-medium">{shop.name}</td>
                                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                            {shop.genre || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${shop.status === "active"
                                                    ? "bg-green-50 text-[var(--color-success)]"
                                                    : "bg-red-50 text-[var(--color-danger)]"
                                                    }`}
                                            >
                                                {shop.status === "active" ? "アクティブ" : "停止中"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                                            {new Date(shop.created_at).toLocaleDateString("ja-JP")}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => toggleShopStatus(shop.id, shop.status || "active")}
                                                className={`rounded-lg p-1.5 text-white hover:opacity-80 ${shop.status === "active"
                                                    ? "bg-[var(--color-warning)]"
                                                    : "bg-[var(--color-success)]"
                                                    }`}
                                                aria-label={
                                                    shop.status === "active" ? "店舗を停止" : "店舗を再開"
                                                }
                                            >
                                                {shop.status === "active" ? (
                                                    <Ban className="size-4" />
                                                ) : (
                                                    <CheckCircle className="size-4" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="rounded-xl bg-[var(--color-surface-secondary)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                        登録された店舗はありません
                    </p>
                )}
            </section>
        </div>
    );
}
