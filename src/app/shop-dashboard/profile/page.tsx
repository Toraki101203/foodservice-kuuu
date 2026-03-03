"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Store, ArrowLeft, ImagePlus, X, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";
import { useRouter } from "next/navigation";

type Shop = Database["public"]["Tables"]["shops"]["Row"];

export default function ShopProfileEditPage() {
    const supabase = createClient();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // フォーム用ステート
    const [description, setDescription] = useState("");
    const [businessHours, setBusinessHours] = useState("");
    const [closedDays, setClosedDays] = useState("");
    const [phone, setPhone] = useState("");
    const [priceRange, setPriceRange] = useState("");
    const [address, setAddress] = useState("");

    // 画像アップロード用ステート
    const [atmospherePhotos, setAtmospherePhotos] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const fetchShop = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data } = await supabase
                .from("shops")
                .select("*")
                .eq("owner_id", user.id)
                .single();

            if (data) {
                setShop(data);
                setDescription(data.description || "");
                setBusinessHours(data.business_hours || "");
                setClosedDays(data.closed_days || "");
                setPhone(data.phone || "");
                setPriceRange(data.price_range || "");
                setAddress(data.address || "");
                setAtmospherePhotos(data.atmosphere_photos || []);
            }
            setLoading(false);
        };

        fetchShop();
    }, [supabase, router]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        if (!shop) return;

        let latitude = shop.latitude;
        let longitude = shop.longitude;

        // 住所が変更された場合、ジオコーディングで緯度経度を取得
        if (address && address !== shop.address) {
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                if (apiKey) {
                    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
                    const geoData = await res.json();
                    if (geoData.status === "OK" && geoData.results.length > 0) {
                        const location = geoData.results[0].geometry.location;
                        latitude = location.lat;
                        longitude = location.lng;
                    }
                }
            } catch (err) {
                console.error("Geocoding failed:", err);
            }
        }

        const { error } = await supabase
            .from("shops")
            .update({
                description,
                business_hours: businessHours,
                closed_days: closedDays,
                phone,
                price_range: priceRange,
                address,
                latitude,
                longitude,
                atmosphere_photos: atmospherePhotos,
            })
            .eq("id", shop.id);

        if (error) {
            setErrorMessage("設定の保存に失敗しました。もう一度お試しください。");
            console.error("Profile update error:", error);
        } else {
            setSuccessMessage("店舗設定を更新しました！");
            // 更新後のStateを反映
            setShop((prev) => prev ? { ...prev, address, latitude, longitude } : null);
            // 3秒後にメッセージを消す
            setTimeout(() => setSuccessMessage(""), 3000);
        }
        setSaving(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !shop) return;

        const files = Array.from(e.target.files);
        // 最大3枚までの制限
        if (atmospherePhotos.length + files.length > 3) {
            setErrorMessage("設定できる写真は最大3枚までです。");
            return;
        }

        setUploadingImage(true);
        setErrorMessage("");

        try {
            const newPhotoUrls: string[] = [];

            for (const file of files) {
                // 簡単なバリデーション
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error("ファイルサイズは5MB以下にしてください。");
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${shop.id}/${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from("shop_photos")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from("shop_photos")
                    .getPublicUrl(filePath);

                newPhotoUrls.push(publicUrl);
            }

            setAtmospherePhotos(prev => [...prev, ...newPhotoUrls]);

            // アップロード成功後、即座に保存処理を実行してDBを同期する
            const { error: updateError } = await supabase
                .from("shops")
                .update({
                    atmosphere_photos: [...atmospherePhotos, ...newPhotoUrls],
                })
                .eq("id", shop.id);

            if (updateError) throw updateError;

            setSuccessMessage("写真をアップロードしました。");
            setTimeout(() => setSuccessMessage(""), 3000);

        } catch (error: any) {
            console.error("Upload error:", error);
            setErrorMessage(error.message || "写真のアップロードに失敗しました。");
        } finally {
            setUploadingImage(false);
            // reset input
            e.target.value = "";
        }
    };

    const handleRemovePhoto = async (indexToRemove: number) => {
        if (!shop) return;
        const photoUrlToRemove = atmospherePhotos[indexToRemove];

        // URLからパスを抽出してStorageから削除（任意実装: 削除に失敗してもDBからは消す）
        try {
            const urlParts = photoUrlToRemove.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from("shop_photos").remove([`${shop.id}/${fileName}`]);
        } catch (e) {
            console.error("Storage cleanup error:", e);
        }

        const newPhotos = atmospherePhotos.filter((_, i) => i !== indexToRemove);
        setAtmospherePhotos(newPhotos);

        // 即座にDBを同期
        const { error } = await supabase
            .from("shops")
            .update({ atmosphere_photos: newPhotos })
            .eq("id", shop.id);

        if (error) {
            setErrorMessage("写真の削除に失敗しました。");
        } else {
            setSuccessMessage("写真を削除しました。");
            setTimeout(() => setSuccessMessage(""), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-[var(--color-text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
                店舗が見つかりません。
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/shop-dashboard"
                    className="flex size-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
                >
                    <ArrowLeft className="size-5" />
                </Link>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    店舗情報設定
                </h1>
            </div>

            {successMessage && (
                <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm font-bold text-[var(--color-success)]">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm font-bold text-[var(--color-danger)]">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-6">
                {/* 読み取り専用情報 */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
                        <Store className="size-4" /> 基本情報 (変更不可)
                    </h2>
                    <div className="mb-3">
                        <span className="block text-xs text-[var(--color-text-muted)]">店舗名</span>
                        <span className="font-bold text-[var(--color-text-primary)]">{shop.name}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-[var(--color-text-muted)]">ジャンル</span>
                        <span className="text-[var(--color-text-primary)]">{shop.genre}</span>
                    </div>
                </div>

                {/* 写真アップロード */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
                        <ImagePlus className="size-4" /> お店の写真（最大3枚）
                    </h2>

                    <div className="grid grid-cols-3 gap-3">
                        {atmospherePhotos.map((url, index) => (
                            <div key={index} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`お店の写真 ${index + 1}`} className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(index)}
                                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}

                        {atmospherePhotos.length < 3 && (
                            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                                {uploadingImage ? (
                                    <Loader2 className="size-6 animate-spin" />
                                ) : (
                                    <>
                                        <ImagePlus className="mb-2 size-6" />
                                        <span className="text-[10px] font-bold">追加する</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                />
                            </label>
                        )}
                    </div>
                    <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                        ※アップロード時、自動的に保存されます。
                    </p>
                </div>

                {/* 編集可能フィールド */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                住所
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="例: 福岡県福岡市中央区天神1-1-1"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                ※住所を変更するとマップ上のピンの位置が自動的に更新されます。
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                営業時間
                            </label>
                            <input
                                type="text"
                                value={businessHours}
                                onChange={(e) => setBusinessHours(e.target.value)}
                                placeholder="例: 17:00 ~ 24:00 (L.O. 23:30)"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                定休日
                            </label>
                            <input
                                type="text"
                                value={closedDays}
                                onChange={(e) => setClosedDays(e.target.value)}
                                placeholder="例: 毎週火曜日、年末年始"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                予算目安
                            </label>
                            <input
                                type="text"
                                value={priceRange}
                                onChange={(e) => setPriceRange(e.target.value)}
                                placeholder="例: ¥3,000 ~ ¥4,999"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                電話番号
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="例: 03-XXXX-XXXX"
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-[var(--color-text-primary)]">
                                お店の紹介文
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="お店のこだわりや雰囲気などを書いてアピールしましょう！"
                                rows={4}
                                className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="mt-2 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                    <Save className="size-5" />
                    {saving ? "保存中..." : "設定を保存する"}
                </button>
            </form>
        </div>
    );
}
