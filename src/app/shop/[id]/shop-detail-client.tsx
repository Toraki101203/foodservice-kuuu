"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  Minus,
  Plus,
  Banknote,
  Utensils,
  Users,
  MessageSquare,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeatBadge } from "@/components/ui/seat-badge";
import { Dialog } from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { InstagramGrid } from "@/components/shop/instagram-grid";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import type { Shop, SeatStatus, InstagramPost } from "@/types/database";

type ShopWithSeat = Shop & { seat_status: SeatStatus[] };

type ShopDetailClientProps = {
  shop: ShopWithSeat;
  posts: InstagramPost[];
  isFollowing: boolean;
  isLoggedIn: boolean;
};

// 営業時間の曜日ラベル
const DAY_LABELS: Record<string, string> = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
};

// 予算をフォーマット
function formatBudget(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `¥${min.toLocaleString()} 〜 ¥${max.toLocaleString()}`;
  if (min) return `¥${min.toLocaleString()} 〜`;
  return `〜 ¥${max!.toLocaleString()}`;
}

export function ShopDetailClient({
  shop,
  posts,
  isFollowing: initialFollowing,
  isLoggedIn,
}: ShopDetailClientProps) {
  const router = useRouter();
  const seatStatus = shop.seat_status?.[0];

  // 閲覧トラッキング（初回マウント時に1回だけ記録）
  useEffect(() => {
    trackEvent(shop.id, "view");
  }, [shop.id]);

  // フォロー状態
  const [following, setFollowing] = useState(initialFollowing);

  // 「今すぐ行く」フォーム
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVisitSheet, setShowVisitSheet] = useState(false);
  const [showVisitSuccess, setShowVisitSuccess] = useState(false);

  // 「今すぐ行く」が使えるか（standard以上 + 空席ありor混雑）
  const canVisit =
    (shop.plan_type === "standard" || shop.plan_type === "premium") &&
    seatStatus &&
    (seatStatus.status === "available" || seatStatus.status === "busy");

  // 営業時間の表示
  const businessHoursDisplay = useMemo(() => {
    if (!shop.business_hours) return null;
    const parsed =
      typeof shop.business_hours === "string"
        ? (() => {
            try { return JSON.parse(shop.business_hours); } catch { return null; }
          })()
        : shop.business_hours;
    if (!parsed || typeof parsed !== "object") return null;
    const days = Object.entries(parsed) as [string, { open?: string; close?: string; closed?: boolean }][];
    return days.map(([key, val]: [string, { open?: string; close?: string; closed?: boolean }]) => ({
      label: DAY_LABELS[key] ?? key,
      text: val?.closed ? "定休日" : `${val?.open ?? ""} - ${val?.close ?? ""}`,
      isClosed: val?.closed ?? false,
    }));
  }, [shop.business_hours]);

  // 予算表示
  const lunchBudget = formatBudget(shop.budget_lunch_min, shop.budget_lunch_max);
  const dinnerBudget = formatBudget(shop.budget_dinner_min, shop.budget_dinner_max);

  // フォロートグル
  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prev = following;
    setFollowing(!following);

    const method = prev ? "DELETE" : "POST";
    const res = await fetch("/api/follows", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id }),
    });
    if (!res.ok) {
      setFollowing(prev);
    } else if (!prev) {
      // 新規フォロー時のみ記録（解除時は記録しない）
      trackEvent(shop.id, "favorite");
    }
  };

  // シェア
  const handleShare = async () => {
    const url = `${window.location.origin}/shop/${shop.id}`;
    if (navigator.share) {
      await navigator.share({ title: shop.name, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    trackEvent(shop.id, "share");
  };

  // 「今すぐ行く」送信
  const handleInstantVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: shop.id,
        partySize,
        note: note || null,
      }),
    });

    setIsSubmitting(false);

    if (res.ok) {
      trackEvent(shop.id, "reserve");
      setShowVisitSheet(false);
      setShowVisitSuccess(true);
      setPartySize(2);
      setNote("");
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) {
        alert(data.error);
      }
    }
  };

  return (
    <div className="mx-auto max-w-lg pb-20">
      {/* ヒーロー画像 */}
      <div className="relative aspect-[4/3] max-h-80 bg-gray-200">
        {shop.main_image ? (
          <img
            src={shop.main_image}
            alt={shop.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Utensils className="size-16 text-gray-300" />
          </div>
        )}

        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* ナビゲーションボタン */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-black/40 p-2 backdrop-blur-sm"
            aria-label="戻る"
          >
            <ArrowLeft className="size-5 text-white" />
          </button>
          <button
            onClick={handleShare}
            className="rounded-full bg-black/40 p-2 backdrop-blur-sm"
            aria-label="シェア"
          >
            <Share2 className="size-5 text-white" />
          </button>
        </div>

        {/* 画像下部に店舗名・ジャンル */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h1 className="text-xl font-bold text-white drop-shadow-sm text-balance">
            {shop.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {shop.genre && (
              <span className="text-sm text-white/80">{shop.genre}</span>
            )}
            {seatStatus && <SeatBadge status={seatStatus.status} />}
          </div>
        </div>
      </div>

      {/* アクションバー */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Button
          variant={following ? "outline" : "primary"}
          size="sm"
          onClick={handleFollowToggle}
          className="flex-1"
        >
          {following ? "フォロー中" : "フォロー"}
        </Button>
        {shop.phone && (
          <a href={`tel:${shop.phone}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Phone className="size-4" />
              電話する
            </Button>
          </a>
        )}
        {shop.instagram_url && (
          <a
            href={shop.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
            onClick={() => trackEvent(shop.id, "instagram_click")}
          >
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="size-4" />
              Instagram
            </Button>
          </a>
        )}
      </div>

      {/* 紹介文 */}
      {shop.description && (
        <div className="px-4 py-4">
          <p className="text-sm leading-relaxed text-gray-600 text-pretty">
            {shop.description}
          </p>
        </div>
      )}

      {/* 基本情報カード */}
      <div className="px-4 py-2">
        <div className="space-y-3">
          {/* 住所 */}
          {shop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <span className="text-sm text-gray-700">{shop.address}</span>
            </div>
          )}

          {/* 予算 */}
          {(lunchBudget || dinnerBudget) && (
            <div className="flex items-start gap-3">
              <Banknote className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div className="text-sm text-gray-700">
                {lunchBudget && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">ランチ</span>
                    <span className="tabular-nums">{lunchBudget}</span>
                  </div>
                )}
                {dinnerBudget && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">ディナー</span>
                    <span className="tabular-nums">{dinnerBudget}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 営業時間 */}
          {businessHoursDisplay && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div className="text-sm text-gray-700">
                {businessHoursDisplay.map((day) => (
                  <div key={day.label} className="flex gap-2">
                    <span className="w-4 shrink-0 font-medium">{day.label}</span>
                    <span className={cn("tabular-nums", day.isClosed && "text-gray-400")}>
                      {day.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 電話番号 */}
          {shop.phone && (
            <div className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-gray-400" />
              <a
                href={`tel:${shop.phone}`}
                className="text-sm text-orange-500"
              >
                {shop.phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Instagram 投稿グリッド */}
      {posts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 px-4 text-sm font-bold text-gray-900">
            投稿
          </h2>
          <InstagramGrid posts={posts} shopId={shop.id} />
        </div>
      )}

      {/* 「今すぐ行く」ボトムシート */}
      <BottomSheet
        open={showVisitSheet}
        onClose={() => setShowVisitSheet(false)}
        title="今すぐ行く"
      >
        <form onSubmit={handleInstantVisit} className="space-y-3">
          {/* 人数 */}
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Users className="size-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">人数</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize((prev) => Math.max(1, prev - 1))}
                disabled={partySize <= 1}
                className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40"
                aria-label="人数を減らす"
              >
                <Minus className="size-4 text-gray-600" />
              </button>
              <span className="min-w-8 text-center text-base font-bold tabular-nums text-gray-900">
                {partySize}
              </span>
              <button
                type="button"
                onClick={() => setPartySize((prev) => Math.min(20, prev + 1))}
                disabled={partySize >= 20}
                className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40"
                aria-label="人数を増やす"
              >
                <Plus className="size-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* メモ */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-4 py-3.5">
            <MessageSquare className="size-5 shrink-0 text-orange-500" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="アレルギー、席の希望など（任意）"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* 送信 */}
          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              <Navigation className="size-5" />
              お店に向かう
            </Button>
            <p className="mt-2 text-center text-xs text-gray-400">
              お店に「向かっています」と通知されます
            </p>
          </div>
        </form>
      </BottomSheet>

      {/* 固定フッター：「今すぐ行く」ボタン */}
      {canVisit && !showVisitSheet && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-gray-100 bg-white px-4 py-3 pb-3">
          <div className="mx-auto max-w-lg">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                if (!isLoggedIn) {
                  router.push("/login");
                  return;
                }
                setShowVisitSheet(true);
              }}
            >
              <Navigation className="size-5" />
              今すぐ行く
            </Button>
          </div>
        </div>
      )}

      {/* 満席・休業時の表示 */}
      {(shop.plan_type === "standard" || shop.plan_type === "premium") &&
        seatStatus &&
        (seatStatus.status === "full" || seatStatus.status === "closed") &&
        !showVisitSheet && (
          <div className="fixed inset-x-0 bottom-16 z-20 border-t border-gray-100 bg-white px-4 py-3 pb-3">
            <div className="mx-auto max-w-lg">
              <Button variant="outline" className="w-full" disabled>
                {seatStatus.status === "full" ? "現在満席です" : "本日は休業です"}
              </Button>
            </div>
          </div>
        )}

      {/* 送信完了ダイアログ */}
      <Dialog
        open={showVisitSuccess}
        onClose={() => setShowVisitSuccess(false)}
        title="お店に通知しました"
        description={`${partySize || 2}名でお店に向かっていることを通知しました。お店でお待ちしています！`}
      >
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowVisitSuccess(false)}
          >
            閉じる
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => router.push("/reservations")}
          >
            来店履歴へ
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
