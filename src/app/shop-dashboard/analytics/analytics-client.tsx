"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Eye,
  Users,
  Navigation,
  Sparkles,
  TrendingUp,
  Loader2,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalyticsEvent, AnalyticsEventType } from "@/types/database";

type PostInfo = {
  id: string;
  image_url: string | null;
  caption: string | null;
  posted_at: string | null;
};

type Props = {
  shopId: string;
  events: AnalyticsEvent[];
  totalStats: {
    views: number;
    followers: number;
    visits: number;
  };
  posts: PostInfo[];
};

type Period = "7d" | "30d" | "90d";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7日間" },
  { value: "30d", label: "30日間" },
  { value: "90d", label: "90日間" },
];

const PERIOD_DAYS: Record<Period, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const STAT_CARDS = [
  { key: "views" as const, label: "閲覧数", icon: Eye, color: "text-blue-500", bgColor: "bg-blue-50" },
  { key: "followers" as const, label: "フォロワー", icon: Users, color: "text-pink-500", bgColor: "bg-pink-50" },
  { key: "visits" as const, label: "来店数", icon: Navigation, color: "text-orange-500", bgColor: "bg-orange-50" },
];

// 投稿別パフォーマンス（期間フィルターに連動）
function PostPerformanceSection({
  posts,
  filteredEvents,
}: {
  posts: PostInfo[];
  filteredEvents: AnalyticsEvent[];
}) {
  const postStats = useMemo(() => {
    const stats: Record<string, { views: number; impressions: number }> = {};
    for (const ev of filteredEvents) {
      if (ev.event_type !== "post_view" && ev.event_type !== "post_impression") continue;
      const postId = (ev.metadata as Record<string, unknown> | null)?.post_id as string | undefined;
      if (!postId) continue;
      stats[postId] = stats[postId] ?? { views: 0, impressions: 0 };
      if (ev.event_type === "post_view") stats[postId].views++;
      else stats[postId].impressions++;
    }
    return stats;
  }, [filteredEvents]);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Image className="size-5 text-gray-600" />
          <h2 className="font-bold text-gray-900">投稿別パフォーマンス</h2>
        </div>
        <div className="space-y-3">
          {posts.map((post) => {
            const views = postStats[post.id]?.views ?? 0;
            const impressions = postStats[post.id]?.impressions ?? 0;
            return (
              <div key={post.id} className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[8px] text-gray-400">
                      画像なし
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">
                    {post.caption
                      ? post.caption.length > 30
                        ? `${post.caption.slice(0, 30)}...`
                        : post.caption
                      : "キャプションなし"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3 text-cyan-500" />
                      <span className="tabular-nums">{views}</span>
                      <span>閲覧</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3 text-teal-500" />
                      <span className="tabular-nums">{impressions}</span>
                      <span>表示</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsClient({ shopId, events, totalStats, posts }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // 期間でフィルタされたイベント
  const filteredEvents = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return events.filter((e) => new Date(e.created_at) >= cutoff);
  }, [events, period]);

  // 期間内の統計
  const periodStats = useMemo(() => {
    const stats = { views: 0, followers: 0, visits: 0 };
    for (const event of filteredEvents) {
      if (event.event_type === "view") stats.views++;
      else if (event.event_type === "favorite") stats.followers++;
      else if (event.event_type === "reserve") stats.visits++;
    }
    return stats;
  }, [filteredEvents]);

  // 日別データ（棒グラフ用）
  const dailyData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const result: { date: string; label: string; views: number; followers: number; visits: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;

      const dayEvents = filteredEvents.filter(
        (e) => e.created_at.slice(0, 10) === dateStr
      );

      result.push({
        date: dateStr,
        label: dayLabel,
        views: dayEvents.filter((e) => e.event_type === "view").length,
        followers: dayEvents.filter((e) => e.event_type === "favorite").length,
        visits: dayEvents.filter((e) => e.event_type === "reserve").length,
      });
    }
    return result;
  }, [filteredEvents, period]);

  // グラフの最大値（棒の高さ計算用）
  const maxValue = useMemo(() => {
    const max = Math.max(...dailyData.map((d) => d.views), 1);
    return max;
  }, [dailyData]);

  // 間引き表示（ラベルの重なり防止）
  const labelInterval = useMemo(() => {
    if (period === "7d") return 1;
    if (period === "30d") return 5;
    return 15;
  }, [period]);

  // AI提案の取得
  const handleGetSuggestion = useCallback(async () => {
    setIsLoadingSuggestion(true);
    setSuggestionError(null);

    try {
      const res = await fetch("/api/ai/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSuggestionError(data.error ?? "提案の取得に失敗しました");
        return;
      }

      const data = await res.json();
      setAiSuggestion(data.suggestion);
    } catch {
      setSuggestionError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoadingSuggestion(false);
    }
  }, [shopId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">集客分析</h1>
        <p className="mt-1 text-sm text-gray-500">
          お店のパフォーマンスを詳しく分析
        </p>
      </div>

      {/* 期間セレクター */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              period === value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bgColor }) => (
          <Card key={key}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <div className={cn("rounded-lg p-1.5", bgColor)}>
                  <Icon className={cn("size-4", color)} />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 md:text-2xl">
                {periodStats[key]}
              </p>
              <p className="text-[10px] text-gray-400">
                累計: {totalStats[key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 閲覧数グラフ（CSS棒グラフ） */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-gray-600" />
            <h2 className="font-bold text-gray-900">閲覧数推移</h2>
          </div>

          <div className="flex items-end gap-[2px] overflow-x-auto py-2" style={{ height: 160 }}>
            {dailyData.map((day, index) => {
              const heightPct = maxValue > 0 ? (day.views / maxValue) * 100 : 0;
              const showLabel = index % labelInterval === 0;
              return (
                <div
                  key={day.date}
                  className="flex flex-1 shrink-0 flex-col items-center"
                  style={{ minWidth: period === "7d" ? 40 : period === "30d" ? 16 : 8 }}
                >
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-[24px] rounded-t bg-blue-400 transition-all"
                      style={{
                        height: `${Math.max(heightPct, day.views > 0 ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                  {showLabel && (
                    <span className="mt-1 text-[9px] text-gray-400 tabular-nums">
                      {day.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* イベント種別別の棒グラフ */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-bold text-gray-900">イベント内訳</h2>
          <div className="space-y-3">
            {([
              { type: "view" as const, label: "店舗閲覧", color: "bg-blue-400" },
              { type: "post_view" as const, label: "投稿閲覧", color: "bg-cyan-400" },
              { type: "post_impression" as const, label: "投稿表示", color: "bg-teal-400" },
              { type: "reserve" as const, label: "来店", color: "bg-orange-400" },
              { type: "share" as const, label: "シェア", color: "bg-green-400" },
              { type: "instagram_click" as const, label: "Instagram", color: "bg-purple-400" },
            ] as { type: AnalyticsEventType; label: string; color: string }[]).map(
              ({ type, label, color }) => {
                const count = filteredEvents.filter(
                  (e) => e.event_type === type
                ).length;
                const pct = filteredEvents.length > 0
                  ? (count / Math.max(periodStats.views, 1)) * 100
                  : 0;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium tabular-nums text-gray-900">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn("h-full rounded-full transition-all", color)}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* 投稿別パフォーマンス（期間に連動） */}
      {posts.length > 0 && (
        <PostPerformanceSection
          posts={posts}
          filteredEvents={filteredEvents}
        />
      )}

      {/* AI提案セクション */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-orange-500" />
            <h2 className="font-bold text-gray-900">AI投稿最適化提案</h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            AIがあなたのお店の分析データとInstagram投稿を解析し、集客を最大化するための提案を行います。
          </p>

          {!aiSuggestion && !isLoadingSuggestion && (
            <Button onClick={handleGetSuggestion} variant="outline">
              <Sparkles className="size-4" />
              詳しい提案を見る
            </Button>
          )}

          {isLoadingSuggestion && (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" />
              AIが分析しています...
            </div>
          )}

          {suggestionError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {suggestionError}
            </div>
          )}

          {aiSuggestion && (
            <div className="rounded-lg bg-orange-50 p-4">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiSuggestion}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetSuggestion}
                className="mt-3"
              >
                <Sparkles className="size-4" />
                再分析する
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
