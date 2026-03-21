"use client";

import { useState, useMemo } from "react";
import {
  Navigation,
  CheckCircle2,
  Users,
  Bell,
  BellOff,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feed/empty-state";
import type { Notification } from "@/types/database";

type Props = {
  notifications: Notification[];
};

// 通知タイプごとのアイコン・色
const NOTIFICATION_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  instant_visit: {
    icon: Navigation,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  visit_arrived: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  follow: {
    icon: Users,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  new_post: {
    icon: Bell,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  new_instagram_post: {
    icon: Bell,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
};

// 相対時刻を計算
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;

  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationsClient({ notifications: initial }: Props) {
  const [notifications, setNotifications] = useState(initial);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // 個別の通知を既読にする
  const handleMarkRead = async (id: string) => {
    const prev = notifications;
    setNotifications((ns) =>
      ns.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });

    if (!res.ok) {
      setNotifications(prev);
    }
  };

  // 全て既読にする
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setIsMarkingAll(true);
    const prev = notifications;
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));

    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      setNotifications(prev);
    }
    setIsMarkingAll(false);
  };

  if (notifications.length === 0) {
    return (
      <div className="px-4">
        <h1 className="py-4 text-xl font-bold text-gray-900">通知</h1>
        <EmptyState
          icon={<BellOff className="size-12" />}
          title="通知はありません"
          description="フォローやお店への来店があると、ここに通知が届きます"
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      {/* ヘッダー */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold text-gray-900">通知</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            <Check className="size-4" />
            全て既読
          </Button>
        )}
      </div>

      {/* 通知リスト */}
      <div className="space-y-1">
        {notifications.map((notification) => {
          const config = NOTIFICATION_CONFIG[notification.type] ?? {
            icon: Bell,
            color: "text-gray-500",
            bgColor: "bg-gray-50",
          };
          const Icon = config.icon;

          return (
            <button
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) handleMarkRead(notification.id);
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                notification.is_read
                  ? "bg-white"
                  : "bg-orange-50/50 hover:bg-orange-50"
              )}
            >
              {/* アイコン */}
              <div
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                  config.bgColor
                )}
              >
                <Icon className={cn("size-4", config.color)} />
              </div>

              {/* テキスト */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm",
                      notification.is_read
                        ? "text-gray-700"
                        : "font-medium text-gray-900"
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-500" />
                  )}
                </div>
                {notification.message && (
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500 text-pretty">
                    {notification.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 tabular-nums">
                  {timeAgo(notification.created_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
