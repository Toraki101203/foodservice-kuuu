"use client";

import { useState, useMemo } from "react";
import { Eye, MousePointerClick, CalendarCheck, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsEvent, AnalyticsEventType } from "@/types/database";

type PeriodFilter = 7 | 30 | 90;

interface Props {
  events: AnalyticsEvent[];
  shopName: string;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 7, label: "7日間" },
  { value: 30, label: "30日間" },
  { value: 90, label: "90日間" },
];

const eventTypeConfig: {
  type: AnalyticsEventType;
  label: string;
  icon: typeof Eye;
  color: string;
  bgColor: string;
  barColor: string;
}[] = [
  {
    type: "view",
    label: "閲覧数",
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    barColor: "bg-blue-400",
  },
  {
    type: "click",
    label: "クリック数",
    icon: MousePointerClick,
    color: "text-green-600",
    bgColor: "bg-green-50",
    barColor: "bg-green-400",
  },
  {
    type: "reserve",
    label: "予約数",
    icon: CalendarCheck,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    barColor: "bg-orange-400",
  },
  {
    type: "favorite",
    label: "お気に入り",
    icon: Heart,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    barColor: "bg-pink-400",
  },
];

export function AnalyticsCharts({ events, shopName }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>(30);

  // 期間でフィルタリング
  const filteredEvents = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    const cutoffISO = cutoff.toISOString();
    return events.filter((e) => e.created_at >= cutoffISO);
  }, [events, period]);

  // イベント種別ごとのカウント
  const counts = useMemo(() => {
    const map: Record<AnalyticsEventType, number> = {
      view: 0,
      click: 0,
      reserve: 0,
      favorite: 0,
    };
    for (const e of filteredEvents) {
      map[e.event_type] = (map[e.event_type] || 0) + 1;
    }
    return map;
  }, [filteredEvents]);

  const totalEvents = useMemo(
    () => Object.values(counts).reduce((sum, c) => sum + c, 0),
    [counts]
  );

  // 日別閲覧数データ
  const dailyData = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredEvents
      .filter((e) => e.event_type === "view")
      .forEach((e) => {
        const day = e.created_at.split("T")[0];
        grouped.set(day, (grouped.get(day) || 0) + 1);
      });
    return Array.from(grouped.entries()).sort();
  }, [filteredEvents]);

  const maxCount = useMemo(
    () => Math.max(...dailyData.map(([, c]) => c), 1),
    [dailyData]
  );

  // 予約転換率
  const conversionRate = useMemo(() => {
    return counts.view > 0
      ? ((counts.reserve / counts.view) * 100).toFixed(1)
      : "0.0";
  }, [counts]);

  return (
    <div className="space-y-6">
      {/* 店舗名と期間フィルター */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {shopName}
        </p>
        <div className="flex gap-1 rounded-lg bg-[var(--color-surface-secondary)] p-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "min-h-[36px] rounded-md px-3 text-sm font-bold transition-colors",
                period === opt.value
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {eventTypeConfig.map((config) => {
          const Icon = config.icon;
          const count = counts[config.type];
          return (
            <div
              key={config.type}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className={cn("rounded-lg p-1.5", config.bgColor)}>
                  <Icon className={cn("size-4", config.color)} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {config.label}
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                {count.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* 日別閲覧数バーチャート */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6">
        <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
          日別閲覧数
        </h2>
        {dailyData.length > 0 ? (
          <div className="overflow-x-auto">
            <div
              className="flex items-end gap-1"
              style={{ minWidth: `${Math.max(dailyData.length * 28, 200)}px` }}
            >
              {dailyData.map(([date, count]) => (
                <div
                  key={date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                    {count}
                  </span>
                  <div
                    className="w-full rounded-t bg-[var(--color-primary)]"
                    style={{
                      height: `${(count / maxCount) * 200}px`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            この期間のデータはありません
          </p>
        )}
      </section>

      {/* 予約転換率 */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6">
        <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
          予約転換率
        </h2>
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-4xl font-bold tabular-nums text-[var(--color-primary)]">
            {conversionRate}
            <span className="text-lg">%</span>
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            閲覧 → 予約の転換率
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
            <span>
              閲覧{" "}
              <strong className="tabular-nums">
                {counts.view.toLocaleString()}
              </strong>
            </span>
            <span className="text-[var(--color-text-muted)]">→</span>
            <span>
              予約{" "}
              <strong className="tabular-nums">
                {counts.reserve.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* イベント種別内訳 */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6">
        <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
          イベント種別内訳
        </h2>
        {totalEvents > 0 ? (
          <div className="space-y-3">
            {eventTypeConfig.map((config) => {
              const count = counts[config.type];
              const percentage =
                totalEvents > 0 ? (count / totalEvents) * 100 : 0;
              return (
                <div key={config.type}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      {config.label}
                    </span>
                    <span className="tabular-nums text-[var(--color-text-primary)]">
                      {count.toLocaleString()}
                      <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                    <div
                      className={cn("h-full rounded-full", config.barColor)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            この期間のデータはありません
          </p>
        )}
      </section>
    </div>
  );
}
