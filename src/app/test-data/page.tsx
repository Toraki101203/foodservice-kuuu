"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Trash2, Home } from "lucide-react";

export default function TestDataPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleGenerate = async () => {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch("/api/test-data", { method: "POST" });
            if (res.ok) {
                setMessage("✅ テストデータの作成に成功しました！トップページやMAP画面でダミーの店舗と投稿が確認できます。");
            } else {
                setMessage("❌ エラーが発生しました。");
            }
        } catch (e) {
            setMessage("❌ エラーが発生しました。");
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch("/api/test-data", { method: "DELETE" });
            if (res.ok) {
                setMessage("🗑️ テストデータを削除しました。");
            } else {
                setMessage("❌ エラーが発生しました。");
            }
        } catch (e) {
            setMessage("❌ エラーが発生しました。");
        }
        setLoading(false);
    };

    return (
        <div className="mx-auto flex max-w-lg flex-col px-4 py-12">
            <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">テストデータ管理</h1>
            <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
                MAP機能やタイムラインの表示テストを行うための、ダミーデータ（3店舗＆3投稿）を自動生成または削除します。
            </p>

            {message && (
                <div className={`mb-6 rounded-lg p-4 text-sm font-bold ${message.includes("❌") ? "bg-red-50 text-[var(--color-danger)]" : "bg-green-50 text-[var(--color-success)]"}`}>
                    {message}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                    <Database className="size-5" />
                    テストデータを生成する
                </button>

                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-bold text-[var(--color-danger)] transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                    <Trash2 className="size-5" />
                    テストデータを全て削除する
                </button>
            </div>

            <div className="mt-12 text-center">
                <a
                    href="/?view=map"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:underline"
                >
                    <Home className="size-4" />
                    トップページ（MAP）へ戻って確認する
                </a>
            </div>
        </div>
    );
}
