"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, MapPin, X } from "lucide-react";
import Link from "next/link";
import { Button, Input, Card } from "@/components/ui";

/**
 * 投稿作成ページ
 */
export default function NewPostPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRestaurantSearch, setShowRestaurantSearch] = useState(false);

    // 画像選択
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    // 画像削除
    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    // 投稿送信
    const handleSubmit = async () => {
        if (!content.trim() && images.length === 0) return;

        setIsSubmitting(true);

        try {
            // TODO: Supabaseに投稿を保存
            await new Promise((resolve) => setTimeout(resolve, 1000));

            router.push("/home");
            router.refresh();
        } catch (error) {
            console.error("投稿に失敗しました:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // サンプル店舗リスト
    const sampleRestaurants = [
        { id: "1", name: "麺屋 Kuuu" },
        { id: "2", name: "居酒屋 さくら" },
        { id: "3", name: "鮨 匠" },
        { id: "4", name: "カフェ モーニング" },
    ];

    const canSubmit = content.trim().length > 0 || images.length > 0;

    return (
        <div className="min-h-dvh bg-white">
            {/* ヘッダー */}
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <Link href="/home" className="flex items-center gap-2 text-gray-600">
                    <ArrowLeft className="size-5" />
                    <span>キャンセル</span>
                </Link>
                <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    isLoading={isSubmitting}
                >
                    投稿する
                </Button>
            </header>

            <div className="px-4 py-4">
                {/* 画像プレビュー */}
                {images.length > 0 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                        {images.map((image, index) => (
                            <div
                                key={index}
                                className="relative size-24 flex-shrink-0 overflow-hidden rounded-lg"
                            >
                                <img
                                    src={image}
                                    alt={`プレビュー ${index + 1}`}
                                    className="size-full object-cover"
                                />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white"
                                    aria-label="画像を削除"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 画像追加ボタン */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-gray-500 transition-colors hover:border-orange-500 hover:text-orange-500"
                >
                    <Camera className="size-6" />
                    <span>写真を追加</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                />

                {/* テキスト入力 */}
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="今日のごはん、お店の感想などを書いてみましょう..."
                    className="mb-4 min-h-[150px] w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />

                {/* 店舗タグ付け */}
                <div className="mb-4">
                    <p className="mb-2 text-sm font-medium text-gray-700">店舗をタグ付け</p>

                    {selectedRestaurant ? (
                        <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2">
                            <MapPin className="size-4 text-orange-500" />
                            <span className="text-orange-600">{selectedRestaurant.name}</span>
                            <button
                                onClick={() => setSelectedRestaurant(null)}
                                className="ml-auto text-orange-500"
                                aria-label="タグを削除"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowRestaurantSearch(true)}
                            className="flex w-full items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-gray-500 hover:border-orange-500"
                        >
                            <MapPin className="size-4" />
                            <span>店舗を検索して追加</span>
                        </button>
                    )}
                </div>

                {/* 店舗検索モーダル */}
                {showRestaurantSearch && (
                    <Card className="mb-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">店舗を選択</h3>
                            <button
                                onClick={() => setShowRestaurantSearch(false)}
                                aria-label="閉じる"
                            >
                                <X className="size-5 text-gray-500" />
                            </button>
                        </div>
                        <Input placeholder="店名で検索" className="mb-3" />
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                            {sampleRestaurants.map((restaurant) => (
                                <button
                                    key={restaurant.id}
                                    onClick={() => {
                                        setSelectedRestaurant(restaurant);
                                        setShowRestaurantSearch(false);
                                    }}
                                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"
                                >
                                    {restaurant.name}
                                </button>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
