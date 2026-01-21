import { Bell, Heart, MessageCircle, UserPlus, Calendar, Store } from "lucide-react";
import { Card } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";

/**
 * 通知ページ
 */
export default function NotificationsPage() {
    // TODO: Supabaseから通知を取得
    const notifications = [
        {
            id: "1",
            type: "like",
            title: "いいねされました",
            message: "田中さんがあなたの投稿にいいねしました",
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            is_read: false,
        },
        {
            id: "2",
            type: "follow",
            title: "フォローされました",
            message: "麺屋 Kuuuがあなたをフォローしました",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            is_read: false,
        },
        {
            id: "3",
            type: "reservation_confirmed",
            title: "予約が確定しました",
            message: "居酒屋さくらへの予約が確定しました（1/25 19:00〜）",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            is_read: true,
        },
        {
            id: "4",
            type: "comment",
            title: "コメントされました",
            message: "山田さんがあなたの投稿にコメントしました",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            is_read: true,
        },
        {
            id: "5",
            type: "new_post",
            title: "新しい投稿",
            message: "フォロー中の鮨匠が新しく投稿しました",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            is_read: true,
        },
    ];

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "like":
                return <Heart className="size-5 text-red-500" />;
            case "comment":
                return <MessageCircle className="size-5 text-blue-500" />;
            case "follow":
                return <UserPlus className="size-5 text-green-500" />;
            case "reservation_confirmed":
                return <Calendar className="size-5 text-orange-500" />;
            case "new_post":
                return <Store className="size-5 text-purple-500" />;
            default:
                return <Bell className="size-5 text-gray-500" />;
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="px-4 py-4">
            {/* ヘッダー */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">通知</h1>
                {unreadCount > 0 && (
                    <button className="text-sm text-orange-500 hover:underline">
                        すべて既読にする
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <Card className="py-12 text-center">
                    <Bell className="mx-auto mb-4 size-12 text-gray-300" />
                    <p className="text-gray-500">通知はまだありません</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex items-start gap-3 rounded-xl p-4 transition-colors ${notification.is_read
                                    ? "bg-white"
                                    : "bg-orange-50 border border-orange-100"
                                }`}
                        >
                            {/* アイコン */}
                            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                                {getNotificationIcon(notification.type)}
                            </div>

                            {/* コンテンツ */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">
                                    {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {notification.message}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {formatRelativeTime(notification.created_at)}
                                </p>
                            </div>

                            {/* 未読インジケータ */}
                            {!notification.is_read && (
                                <div className="size-2 flex-shrink-0 rounded-full bg-orange-500" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
