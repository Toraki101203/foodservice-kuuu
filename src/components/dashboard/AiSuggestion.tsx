"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  shopId: string;
  isPremium: boolean;
}

export default function AiSuggestion({ shopId, isPremium }: Props) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const res = await fetch("/api/ai/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "提案の取得に失敗しました");
        return;
      }

      setSuggestion(data.suggestion);
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // プレミアムプランでない場合
  if (!isPremium) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-orange-500" />
          <h3 className="font-bold text-[var(--color-text-primary)]">
            AI投稿最適化提案
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
            <Lock className="size-3" />
            プレミアム限定
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          AIがアクセスデータを分析し、最適な投稿タイミングやコンテンツを提案します。プレミアムプランにアップグレードしてご利用ください。
        </p>
        <a
          href="/shop-dashboard/billing"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
        >
          プレミアムプランを確認
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-orange-200 bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-orange-500" />
          <h3 className="font-bold text-[var(--color-text-primary)]">
            AI投稿最適化提案
          </h3>
        </div>
        {suggestion && (
          <button
            onClick={fetchSuggestion}
            disabled={loading}
            aria-label="提案を再取得"
            className="flex size-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-secondary)] disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
            />
          </button>
        )}
      </div>

      {!suggestion && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            直近7日間のデータをAIが分析し、投稿の最適化提案を行います。
          </p>
          <button
            onClick={fetchSuggestion}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            提案を取得
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <RefreshCw className="size-5 animate-spin text-orange-500" />
          <span className="text-sm text-[var(--color-text-muted)]">
            AIが分析中...
          </span>
        </div>
      )}

      {error && !suggestion && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchSuggestion}
            disabled={loading}
            className="mt-2 text-sm font-bold text-red-600 underline hover:text-red-800"
          >
            もう一度試す
          </button>
        </div>
      )}

      {suggestion && (
        <div className="rounded-lg bg-orange-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
            {suggestion}
          </p>
          {error && (
            <p className="mt-2 text-xs text-orange-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
