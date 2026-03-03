"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Calendar, MapPin, LogOut, Store, CreditCard, Pencil, Camera, X } from "lucide-react";
import Link from "next/link";
import Cropper from "react-easy-crop";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
    shops: Database["public"]["Tables"]["shops"]["Row"];
};

export default function MyPage() {
    const supabase = createClient();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
    const [pastReservations, setPastReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 画像クロップ用のState
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            setIsAuthenticated(true);

            // プロフィール取得
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            setProfile(profileData);
            setEditName(profileData?.display_name || "");
            setUserId(user.id);

            // 予約履歴取得
            const { data: resData } = await supabase
                .from("reservations")
                .select("*, shops(*)")
                .eq("user_id", user.id)
                .order("reservation_date", { ascending: false })
                .order("reservation_time", { ascending: false });

            if (resData) {
                const today = new Date().toISOString().split("T")[0];
                const formattedData = resData as unknown as Reservation[];

                // これから（今日以降 ＆ キャンセル以外）
                const upcoming = formattedData.filter(
                    (r) => (r.reservation_date ?? "") >= today && r.status !== "cancelled"
                ).reverse(); // 近い日付を上にするため反転

                // 過去（またはキャンセル済）
                const past = formattedData.filter(
                    (r) => (r.reservation_date ?? "") < today || r.status === "cancelled"
                );

                // 時間表記をHH:MMにフォーマットするヘルパーを適用（秒数を削除）
                const formatTime = (timeStr: string) => {
                    if (!timeStr) return "";
                    // "19:00:00" -> "19:00"
                    const parts = timeStr.split(":");
                    if (parts.length >= 2) {
                        return `${parts[0]}:${parts[1]}`;
                    }
                    return timeStr;
                };

                const upcomingFormatted = upcoming.map(r => ({ ...r, reservation_time: formatTime(r.reservation_time ?? "") }));
                const pastFormatted = past.map(r => ({ ...r, reservation_time: formatTime(r.reservation_time ?? "") }));

                setUpcomingReservations(upcomingFormatted);
                setPastReservations(pastFormatted);
            }

            setLoading(false);
        };

        fetchUserData();
    }, [supabase]);

    const handleNameSave = async () => {
        if (!userId || !editName.trim()) return;

        const { error } = await supabase
            .from("profiles")
            .update({ display_name: editName })
            .eq("id", userId);

        if (!error) {
            setProfile(prev => prev ? { ...prev, display_name: editName } : null);
            setIsEditingName(false);
        } else {
            alert("名前の更新に失敗しました。");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!userId || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            setImageSrc(reader.result?.toString() || null);
        });
        reader.readAsDataURL(file);

        // Reset input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.setAttribute('crossOrigin', 'anonymous')
            image.src = url
        })

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: { width: number; height: number; x: number; y: number }
    ): Promise<Blob | null> => {
        const image = await createImage(imageSrc)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob)
            }, 'image/jpeg')
        })
    }

    const handleCropSave = async () => {
        if (!userId || !imageSrc || !croppedAreaPixels) return;

        setIsUploading(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedBlob) throw new Error("画像切り抜きに失敗しました");

            const fileName = `${userId}-${Math.random()}.jpg`;
            const filePath = `avatars/${fileName}`;

            // Storageにアップロード
            const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // パブリックURLを取得
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // プロフィールテーブルを更新
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 成功したらStateを更新
            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
            setImageSrc(null); // モーダルを閉じる
        } catch (error) {
            console.error('Upload error:', error);
            alert('画像のアップロードに失敗しました。');
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    if (loading) {
        return (
            <div className="flex min-h-[60dvh] items-center justify-center">
                <div className="text-sm text-gray-400">読み込み中...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-4">
                    <User className="size-8 text-gray-400" />
                </div>
                <h1 className="mb-2 text-xl font-bold text-gray-800">
                    ログインが必要です
                </h1>
                <p className="mb-6 text-sm text-gray-500">
                    マイページや予約履歴を確認するには、ログインしてください。
                </p>
                <Link
                    href="/login"
                    className="flex min-h-[44px] items-center justify-center rounded-lg bg-orange-500 px-8 font-bold text-white transition-colors hover:bg-orange-600"
                >
                    ログインへ
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-lg flex-col px-4 py-6">
            <h1 className="mb-6 text-2xl font-bold text-gray-800">マイページ</h1>

            {/* プロフィール情報 */}
            <div className="mb-8 border-b border-gray-200 pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative mx-auto flex size-24 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-orange-500 sm:mx-0">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="size-full rounded-2xl object-cover" />
                        ) : (
                            <User className="size-12" />
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                            aria-label="プロフィール画像を変更"
                        >
                            <Camera className="size-4" />
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        {isEditingName ? (
                            <div className="flex items-center justify-center gap-2 sm:justify-start">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full max-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    autoFocus
                                />
                                <button
                                    onClick={handleNameSave}
                                    className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
                                >
                                    保存
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingName(false);
                                        setEditName(profile?.display_name || "");
                                    }}
                                    className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-200"
                                >
                                    キャンセル
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 sm:justify-start">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {profile?.display_name || "名無しユーザー"}
                                </h2>
                                <button
                                    onClick={() => setIsEditingName(true)}
                                    className="text-gray-400 hover:text-orange-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    aria-label="名前を編集"
                                >
                                    <Pencil className="size-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 予約の確認セクション */}
            <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-gray-800">
                    これからの予約
                </h2>

                <div className="flex flex-col gap-0 border-y border-gray-200">
                    {upcomingReservations.length > 0 ? (
                        upcomingReservations.map((res, index) => (
                            <Link
                                key={res.id}
                                href={`/shop/${res.shop_id}`}
                                className={`group block py-4 transition-colors hover:bg-gray-50 ${index !== upcomingReservations.length - 1 ? "border-b border-gray-100" : ""
                                    }`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold tabular-nums text-gray-800">
                                            {res.reservation_time}
                                        </span>
                                        <span className="mb-1 text-sm font-bold text-orange-500">
                                            {res.reservation_date}
                                        </span>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${res.status === "confirmed" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                                        {res.status === "confirmed" ? "予約確定" : "店舗確認中"}
                                    </span>
                                </div>

                                <div className="mb-2 font-bold text-gray-800">{res.shops?.name}</div>

                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="size-3" />
                                        <span className="line-clamp-1">{res.shops?.address}</span>
                                    </span>
                                    <span className="shrink-0 font-bold">{res.party_size}名様</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="py-6 text-center text-sm text-gray-400">
                            予定されている予約はありません。
                        </p>
                    )}
                </div>
            </div>

            {/* 過去の予約セクション */}
            <div className="mb-10">
                <h2 className="mb-4 text-sm font-bold text-gray-400">
                    過去の利用履歴
                </h2>

                <div className="flex flex-col border-y border-gray-200">
                    {pastReservations.length > 0 ? (
                        pastReservations.map((res, index) => (
                            <Link
                                key={res.id}
                                href={`/shop/${res.shop_id}`}
                                className={`flex items-center justify-between py-3 transition-colors hover:bg-gray-50 ${index !== pastReservations.length - 1 ? "border-b border-gray-100" : ""
                                    } ${res.status === "cancelled" ? "opacity-60" : ""}`}
                            >
                                <div>
                                    <p className="mb-0.5 text-xs font-bold text-gray-500">
                                        {res.reservation_date}
                                        {res.status === "cancelled" && " (キャンセル)"}
                                    </p>
                                    <p className="text-sm font-bold text-gray-800">{res.shops?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold tabular-nums text-gray-800">{res.reservation_time}</p>
                                    <p className="text-xs text-gray-500">{res.party_size}名</p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="py-4 text-center text-sm text-gray-400">
                            履歴はありません。
                        </p>
                    )}
                </div>
            </div>

            {/* 一番下へログアウトボタンを移動 */}
            <div className="mt-8">
                <button
                    onClick={handleLogout}
                    className="mx-auto flex w-full max-w-[200px] items-center justify-center gap-2 rounded-full border border-red-200 bg-transparent py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                >
                    <LogOut className="size-4" />
                    ログアウト
                </button>
            </div>

            {/* 法的表記などのフッターリンク群（モバイル向け） */}
            <div className="mt-12 mb-8 flex flex-col items-center gap-4 text-xs text-gray-400 md:hidden">
                <Link href="/terms" className="hover:text-gray-700">利用規約</Link>
                <Link href="/privacy" className="hover:text-gray-700">プライバシーポリシー</Link>
                <Link href="/commercial" className="hover:text-gray-700">特定商取引法に基づく表記</Link>
                <Link href="/about" className="hover:text-gray-700">Kuuuとは</Link>
                <p>&copy; {new Date().getFullYear()} Kuuu.</p>
            </div>

            {/* 画像クロップ用モーダル */}
            {imageSrc && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="flex items-center justify-between bg-black/80 px-4 py-4 backdrop-blur-sm">
                        <button
                            onClick={() => setImageSrc(null)}
                            className="text-white hover:text-gray-300"
                        >
                            <X className="size-6" />
                        </button>
                        <h2 className="text-lg font-bold text-white">画像を切り抜く</h2>
                        <button
                            onClick={handleCropSave}
                            disabled={isUploading}
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                            {isUploading ? "保存中..." : "保存"}
                        </button>
                    </div>
                    <div className="relative flex-1 bg-black">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            cropShape="rect"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
