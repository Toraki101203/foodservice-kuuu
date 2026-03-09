"use client";
import { useMemo } from "react";
import { Eye, Heart, Calendar, MousePointer } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import type { AnalyticsEvent } from "@/types/database";

interface Props {
    events: AnalyticsEvent[];
    shopId: string;
}

export function AnalyticsDashboardClient({ events }: Props) {
    const stats = useMemo(() => {
        const counts = { view: 0, click: 0, reserve: 0, favorite: 0 };
        for (const e of events) {
            if (e.event_type in counts) counts[e.event_type as keyof typeof counts]++;
        }
        return counts;
    }, [events]);

    const statCards = [
        { label: "閲覧", value: stats.view, icon: Eye, color: "bg-blue-100 text-blue-600" },
        { label: "クリック", value: stats.click, icon: MousePointer, color: "bg-green-100 text-green-600" },
        { label: "お気に入り", value: stats.favorite, icon: Heart, color: "bg-pink-100 text-pink-600" },
        { label: "予約", value: stats.reserve, icon: Calendar, color: "bg-orange-100 text-orange-600" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">集客分析</h1>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCards.map((s) => (
                    <Card key={s.label}>
                        <CardContent className="flex flex-col items-center gap-2 py-6">
                            <div className={`flex size-10 items-center justify-center rounded-xl ${s.color}`}>
                                <s.icon className="size-5" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent>
                    <h2 className="text-sm font-bold text-gray-900">直近のイベント</h2>
                    <div className="mt-3 space-y-2">
                        {events.slice(0, 20).map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{e.event_type}</span>
                                <span className="text-xs text-gray-400">
                                    {new Date(e.created_at).toLocaleString("ja-JP")}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
