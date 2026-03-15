"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeatBadge } from "@/components/ui/seat-badge";
import { Dialog } from "@/components/ui/dialog";
import { InstagramGrid } from "@/components/shop/instagram-grid";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Shop, SeatStatus, InstagramPost } from "@/types/database";

type ShopWithSeat = Shop & { seat_status: SeatStatus[] };

type ShopDetailClientProps = {
  shop: ShopWithSeat;
  posts: InstagramPost[];
  isFollowing: boolean;
  isFavorited: boolean;
  isLoggedIn: boolean;
};

// 30分刻みの時間選択肢を生成
const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 11;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

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

export function ShopDetailClient({
  shop,
  posts,
  isFollowing: initialFollowing,
  isFavorited: initialFavorited,
  isLoggedIn,
}: ShopDetailClientProps) {
  const router = useRouter();
  const seatStatus = shop.seat_status?.[0];

  // フォロー・お気に入り状態
  const [following, setFollowing] = useState(initialFollowing);
  const [favorited, setFavorited] = useState(initialFavorited);

  // 予約フォーム
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("18:00");
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReservationSuccess, setShowReservationSuccess] = useState(false);

  // 予約可能かどうか（standard以上のプラン）
  const canReserve = shop.plan_type === "standard" || shop.plan_type === "premium";

  // 今日の日付（予約日の最小値）
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 営業時間の表示
  const businessHoursDisplay = useMemo(() => {
    if (!shop.business_hours) return null;
    const days = Object.entries(shop.business_hours) as [string, { open: string; close: string; closed: boolean }][];
    return days.map(([key, val]) => ({
      label: DAY_LABELS[key] ?? key,
      text: val.closed ? "定休日" : `${val.open} - ${val.close}`,
      isClosed: val.closed,
    }));
  }, [shop.business_hours]);

  // フォロートグル
  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prev = following;
    setFollowing(!following);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (prev) {
      // アンフォロー
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", user.id)
        .eq("shop_id", shop.id);
      if (error) setFollowing(prev);
    } else {
      // フォロー
      const { error } = await supabase
        .from("follows")
        .insert({ user_id: user.id, shop_id: shop.id });
      if (error) setFollowing(prev);
    }
  };

  // お気に入りトグル
  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const prev = favorited;
    setFavorited(!favorited);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (prev) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("shop_id", shop.id);
      if (error) setFavorited(prev);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, shop_id: shop.id });
      if (error) setFavorited(prev);
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
  };

  // 予約送信
  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!reservationDate || !reservationTime) return;

    setIsSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      user_id: user.id,
      shop_id: shop.id,
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      party_size: partySize,
      note: note || null,
    });

    setIsSubmitting(false);

    if (!error) {
      setShowReservationSuccess(true);
      setReservationDate("");
      setReservationTime("18:00");
      setPartySize(2);
      setNote("");
    }
  };

  return (
    <div className="pb-20">
      {/* ヒーロー画像 */}
      <div className="relative h-60 bg-gray-200">
        {shop.main_image && (
          <img
            src={shop.main_image}
            alt={shop.name}
            className="size-full object-cover"
          />
        )}
        {/* オーバーレイボタン */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-black/40 p-2"
            aria-label="戻る"
          >
            <ArrowLeft className="size-5 text-white" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleFavoriteToggle}
              className="rounded-full bg-black/40 p-2"
              aria-label={favorited ? "お気に入り解除" : "お気に入り追加"}
            >
              <Heart
                className={cn(
                  "size-5",
                  favorited ? "fill-red-500 text-red-500" : "text-white"
                )}
              />
            </button>
            <button
              onClick={handleShare}
              className="rounded-full bg-black/40 p-2"
              aria-label="シェア"
            >
              <Share2 className="size-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 店舗情報 */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 text-balance">
              {shop.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {shop.genre && (
                <span className="text-sm text-gray-500">{shop.genre}</span>
              )}
              {seatStatus && <SeatBadge status={seatStatus.status} />}
            </div>
          </div>
          <Button
            variant={following ? "outline" : "primary"}
            size="sm"
            onClick={handleFollowToggle}
            className="ml-3 shrink-0"
          >
            {following ? "フォロー中" : "フォロー"}
          </Button>
        </div>

        {shop.description && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600 text-pretty">
            {shop.description}
          </p>
        )}
      </div>

      {/* Instagram 投稿グリッド */}
      <div className="mt-6">
        <h2 className="mb-2 px-4 text-sm font-bold text-gray-900">
          Instagram 投稿
        </h2>
        <InstagramGrid posts={posts} />
      </div>

      {/* 基本情報 */}
      <div className="mt-6 px-4">
        <h2 className="mb-3 text-sm font-bold text-gray-900">基本情報</h2>
        <div className="space-y-3">
          {/* 住所 */}
          {shop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <span className="text-sm text-gray-700">{shop.address}</span>
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
                    <span className={day.isClosed ? "text-gray-400" : ""}>
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

          {/* Instagram リンク */}
          {shop.instagram_url && (
            <div className="flex items-center gap-3">
              <ExternalLink className="size-4 shrink-0 text-gray-400" />
              <a
                href={shop.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-orange-500"
              >
                Instagramを見る
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 予約フォーム */}
      {canReserve && (
        <div className="mt-6 px-4">
          <h2 className="mb-3 text-sm font-bold text-gray-900">予約する</h2>
          <form
            onSubmit={handleReservation}
            className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            {/* 日付 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                日付
              </label>
              <input
                type="date"
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                min={todayStr}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* 時間 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                時間
              </label>
              <select
                value={reservationTime}
                onChange={(e) => setReservationTime(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* 人数 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                人数
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize((prev) => Math.max(1, prev - 1))}
                  disabled={partySize <= 1}
                  className="flex size-11 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-50"
                  aria-label="人数を減らす"
                >
                  <Minus className="size-4 text-gray-700" />
                </button>
                <span className="min-w-12 text-center text-lg font-bold tabular-nums text-gray-900">
                  {partySize}名
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize((prev) => Math.min(20, prev + 1))}
                  disabled={partySize >= 20}
                  className="flex size-11 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-50"
                  aria-label="人数を増やす"
                >
                  <Plus className="size-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* メモ */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                備考（任意）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="アレルギー、お祝い、席の希望など"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* 送信 */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isSubmitting}
              disabled={!reservationDate}
            >
              予約をリクエストする
            </Button>
          </form>
        </div>
      )}

      {/* 予約完了ダイアログ */}
      <Dialog
        open={showReservationSuccess}
        onClose={() => setShowReservationSuccess(false)}
        title="予約リクエスト送信完了"
        description="お店からの確認をお待ちください。予約状況は「予約一覧」から確認できます。"
      >
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowReservationSuccess(false)}
          >
            閉じる
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => router.push("/reservations")}
          >
            予約一覧へ
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
