"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera,
  Save,
  MapPin,
  FileText,
  Clock,
  Banknote,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Shop, BusinessHours, DayHours } from "@/types/database";

type Props = {
  shop: Shop;
};

const GENRES = [
  "和食",
  "洋食",
  "中華",
  "イタリアン",
  "フレンチ",
  "韓国料理",
  "タイ料理",
  "インド料理",
  "寿司",
  "焼肉",
  "ラーメン",
  "うどん・そば",
  "居酒屋",
  "バー・バル",
  "カフェ",
  "スイーツ",
  "パン・ベーカリー",
  "その他",
];

const DAY_LABELS: { key: keyof BusinessHours; label: string }[] = [
  { key: "mon", label: "月曜日" },
  { key: "tue", label: "火曜日" },
  { key: "wed", label: "水曜日" },
  { key: "thu", label: "木曜日" },
  { key: "fri", label: "金曜日" },
  { key: "sat", label: "土曜日" },
  { key: "sun", label: "日曜日" },
];

const DEFAULT_DAY_HOURS: DayHours = {
  open: "11:00",
  close: "22:00",
  closed: false,
};

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { ...DEFAULT_DAY_HOURS },
  tue: { ...DEFAULT_DAY_HOURS },
  wed: { ...DEFAULT_DAY_HOURS },
  thu: { ...DEFAULT_DAY_HOURS },
  fri: { ...DEFAULT_DAY_HOURS },
  sat: { ...DEFAULT_DAY_HOURS },
  sun: { ...DEFAULT_DAY_HOURS },
};

export function ProfileClient({ shop }: Props) {
  const [name, setName] = useState(shop.name);
  const [genre, setGenre] = useState(shop.genre ?? "");
  const [description, setDescription] = useState(shop.description ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [budgetLunch, setBudgetLunch] = useState("");
  const [budgetDinner, setBudgetDinner] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    shop.business_hours ?? DEFAULT_BUSINESS_HOURS
  );
  const [mainImage, setMainImage] = useState<string | null>(
    shop.main_image ?? null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像プレビューのクリーンアップ
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB制限
    if (file.size > 5 * 1024 * 1024) {
      setError("画像は5MB以下にしてください");
      return;
    }

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const updateDayHours = (
    day: keyof BusinessHours,
    field: keyof DayHours,
    value: string | boolean
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("店舗名は必須です");
      return;
    }

    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    let uploadedImageUrl = mainImage;

    // 画像アップロード
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const filePath = `${shop.id}/main.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shop-photos")
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) {
        setError("画像のアップロードに失敗しました");
        setIsSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("shop-photos").getPublicUrl(filePath);

      uploadedImageUrl = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        name: name.trim(),
        genre: genre || null,
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        business_hours: businessHours,
        main_image: uploadedImageUrl,
      })
      .eq("id", shop.id);

    if (updateError) {
      setError("保存に失敗しました。もう一度お試しください。");
    } else {
      setMainImage(uploadedImageUrl);
      setImageFile(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }

    setIsSaving(false);
  }, [
    name,
    genre,
    description,
    address,
    phone,
    businessHours,
    mainImage,
    imageFile,
    shop.id,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      {/* ページタイトル */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">店舗プロフィール</h1>
        <p className="mt-1 text-sm text-gray-500">
          お客様に表示される店舗情報を編集できます
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* メイン画像 */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Camera className="size-5" />
            メイン写真
          </h2>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
            {imagePreview ?? mainImage ? (
              <img
                src={imagePreview ?? mainImage ?? ""}
                alt="店舗メイン画像"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center text-gray-400">
                <Camera className="size-10" />
                <p className="mt-2 text-sm">写真をアップロード</p>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-white"
            >
              変更する
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <FileText className="size-5" />
            基本情報
          </h2>

          <Input
            label="店舗名 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 焼肉太郎 渋谷店"
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">ジャンル</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">選択してください</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              紹介文（{description.length}/500）
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setDescription(e.target.value);
                }
              }}
              placeholder="お店の特徴や雰囲気を伝えましょう"
              rows={4}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
            />
          </div>
        </CardContent>
      </Card>

      {/* 連絡先・所在地 */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <MapPin className="size-5" />
            連絡先・所在地
          </h2>

          <Input
            label="住所"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例: 東京都渋谷区渋谷1-2-3"
          />

          <Input
            label="電話番号"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="例: 03-1234-5678"
          />
        </CardContent>
      </Card>

      {/* 予算 */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Banknote className="size-5" />
            予算目安
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ランチ"
              value={budgetLunch}
              onChange={(e) => setBudgetLunch(e.target.value)}
              placeholder="例: 1,000〜1,500円"
            />
            <Input
              label="ディナー"
              value={budgetDinner}
              onChange={(e) => setBudgetDinner(e.target.value)}
              placeholder="例: 3,000〜5,000円"
            />
          </div>
        </CardContent>
      </Card>

      {/* 営業時間 */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Clock className="size-5" />
            営業時間
          </h2>

          <div className="space-y-3">
            {DAY_LABELS.map(({ key, label }) => {
              const dayHours = businessHours[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <span className="w-14 shrink-0 text-sm font-medium text-gray-700">
                    {label}
                  </span>

                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={dayHours.closed}
                      onChange={(e) =>
                        updateDayHours(key, "closed", e.target.checked)
                      }
                      className="size-4 rounded border-gray-300 accent-orange-500"
                    />
                    休み
                  </label>

                  {!dayHours.closed && (
                    <div className="flex flex-1 items-center gap-1 text-sm">
                      <input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) =>
                          updateDayHours(key, "open", e.target.value)
                        }
                        className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                      />
                      <span className="text-gray-400">〜</span>
                      <input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) =>
                          updateDayHours(key, "close", e.target.value)
                        }
                        className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン（固定フッター） */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:left-64">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            className="w-full"
            size="lg"
          >
            <Save className="size-4" />
            保存する
          </Button>
        </div>
      </div>

      {/* 成功トースト */}
      {showSuccess && (
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          プロフィールを保存しました
        </div>
      )}
    </div>
  );
}
