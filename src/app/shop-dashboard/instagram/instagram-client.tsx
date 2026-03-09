"use client";
import { useState } from "react";
import Image from "next/image";
import { Instagram, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import type { InstagramPost } from "@/types/database";

interface Props {
    shop: {
        id: string;
        instagram_username: string | null;
        instagram_access_token: string | null;
        instagram_synced_at: string | null;
    };
    posts: InstagramPost[];
}

export function InstagramDashboardClient({ shop, posts }: Props) {
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();
    const isConnected = !!shop.instagram_access_token;

    const handleConnect = () => {
        window.location.href = `/api/instagram/auth?shop_id=${shop.id}`;
    };

    const handleSync = async () => {
        setIsSyncing(true);
        const res = await fetch("/api/instagram/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shopId: shop.id }),
        });
        setIsSyncing(false);
        if (res.ok) {
            toast("同期が完了しました");
            window.location.reload();
        } else {
            toast("同期に失敗しました", "error");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Instagram 連携</h1>
            </div>

            {/* 連携ステータス */}
            <Card>
                <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isConnected ? (
                            <CheckCircle className="size-5 text-green-500" />
                        ) : (
                            <AlertCircle className="size-5 text-yellow-500" />
                        )}
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                {isConnected ? "連携済み" : "未連携"}
                            </p>
                            {shop.instagram_username && (
                                <p className="text-xs text-gray-500">@{shop.instagram_username}</p>
                            )}
                            {shop.instagram_synced_at && (
                                <p className="text-xs text-gray-400">
                                    最終同期: {new Date(shop.instagram_synced_at).toLocaleString("ja-JP")}
                                </p>
                            )}
                        </div>
                    </div>
                    {isConnected ? (
                        <Button variant="secondary" size="sm" onClick={handleSync} isLoading={isSyncing}>
                            <RefreshCw className="size-4" />
                            手動同期
                        </Button>
                    ) : (
                        <Button size="sm" onClick={handleConnect}>
                            <Instagram className="size-4" />
                            連携する
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 投稿グリッド */}
            {posts.length > 0 && (
                <div>
                    <h2 className="mb-3 text-sm font-bold text-gray-900">同期済み投稿 ({posts.length}件)</h2>
                    <div className="grid grid-cols-3 gap-1 md:grid-cols-4">
                        {posts.map((post) => (
                            <div key={post.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                                <Image src={post.image_url} alt={post.caption ?? ""} fill className="object-cover" sizes="150px" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
