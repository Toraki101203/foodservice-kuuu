"use client";

import { useState, useCallback } from "react";
import {
  Instagram,
  Link2,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InstagramPost } from "@/types/database";

type Props = {
  shopId: string;
  isConnected: boolean;
  instagramUsername: string | null;
  instagramUrl: string | null;
  lastSyncedAt: string | null;
  initialPosts: InstagramPost[];
};

export function InstagramClient({
  shopId,
  isConnected,
  instagramUsername,
  instagramUrl,
  lastSyncedAt,
  initialPosts,
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());

  // 手動同期
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/instagram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSyncResult(data.error ?? "同期に失敗しました");
        return;
      }

      const data = await res.json();
      setSyncResult(`${data.synced ?? 0}件の投稿を同期しました`);

      // 同期後に投稿リストを再取得（ページリロード）
      window.location.reload();
    } catch {
      setSyncResult("同期中にエラーが発生しました");
    } finally {
      setIsSyncing(false);
    }
  }, [shopId]);

  // 投稿の表示/非表示切り替え
  const togglePostVisibility = (postId: string) => {
    setHiddenPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Instagram連携</h1>
        <p className="mt-1 text-sm text-gray-500">
          Instagramアカウントを連携して、投稿を自動的に表示できます
        </p>
      </div>

      {/* 接続ステータス */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                isConnected ? "bg-pink-50" : "bg-gray-100"
              )}
            >
              <Instagram
                className={cn(
                  "size-6",
                  isConnected ? "text-pink-500" : "text-gray-400"
                )}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">
                  {isConnected ? "連携中" : "未連携"}
                </p>
                <span
                  className={cn(
                    "inline-flex size-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              </div>
              {isConnected && instagramUsername && (
                <p className="text-sm text-gray-500">@{instagramUsername}</p>
              )}
              {!isConnected && instagramUrl && (
                <p className="text-sm text-gray-500">
                  URL登録済み: {instagramUrl}
                </p>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          {isConnected ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSync}
                isLoading={isSyncing}
                className="flex-1"
              >
                <RefreshCw className="size-4" />
                手動同期
              </Button>
              {instagramUsername && (
                <a
                  href={`https://instagram.com/${instagramUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="md">
                    <ExternalLink className="size-4" />
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <a href="/api/instagram/auth">
              <Button className="w-full">
                <Link2 className="size-4" />
                Instagramを連携する
              </Button>
            </a>
          )}

          {/* 最終同期時刻 */}
          {lastSyncedAt && (
            <p className="text-xs text-gray-400">
              最終同期: {formatRelativeTime(lastSyncedAt)}
            </p>
          )}

          {/* 同期結果メッセージ */}
          {syncResult && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                syncResult.includes("失敗") || syncResult.includes("エラー")
                  ? "bg-red-50 text-red-600"
                  : "bg-green-50 text-green-600"
              )}
            >
              {syncResult.includes("失敗") || syncResult.includes("エラー") ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <Check className="size-4 shrink-0" />
              )}
              {syncResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 投稿一覧 */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              投稿一覧（{posts.length}件）
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => {
              const isHidden = hiddenPosts.has(post.id);
              return (
                <div key={post.id} className="group relative">
                  <div
                    className={cn(
                      "aspect-square overflow-hidden rounded-lg bg-gray-100",
                      isHidden && "opacity-40"
                    )}
                  >
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.caption ?? ""}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* ホバー時のオーバーレイ */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                    <button
                      onClick={() => togglePostVisibility(post.id)}
                      className="rounded-full bg-white/90 p-2"
                      aria-label={isHidden ? "表示する" : "非表示にする"}
                    >
                      {isHidden ? (
                        <Eye className="size-4 text-gray-700" />
                      ) : (
                        <EyeOff className="size-4 text-gray-700" />
                      )}
                    </button>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/90 p-2"
                        aria-label="Instagramで開く"
                      >
                        <ExternalLink className="size-4 text-gray-700" />
                      </a>
                    )}
                  </div>

                  {/* キャプション（ホバー時） */}
                  {post.caption && (
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="line-clamp-2 text-[10px] text-white leading-relaxed">
                        {post.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 投稿がない場合 */}
      {posts.length === 0 && isConnected && (
        <Card>
          <CardContent className="py-8 text-center">
            <Instagram className="mx-auto size-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">
              投稿がまだ同期されていません
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleSync}
              isLoading={isSyncing}
            >
              今すぐ同期する
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
