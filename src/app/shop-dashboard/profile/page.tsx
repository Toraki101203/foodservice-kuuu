"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useRestaurantOwnerStore } from "@/store";
import Image from "next/image";
import { Camera } from "lucide-react";

export default function ProfilePage() {
    const restaurant = useRestaurantOwnerStore((s) => s.restaurant);
    const setRestaurant = useRestaurantOwnerStore((s) => s.setRestaurant);
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [genre, setGenre] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [description, setDescription] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mainImage, setMainImage] = useState<string | null>(null);

    useEffect(() => {
        if (!restaurant) return;
        setName(restaurant.name);
        setGenre(restaurant.genre ?? "");
        setAddress(restaurant.address);
        setPhone(restaurant.phone ?? "");
        setDescription(restaurant.description ?? "");
        setInstagramUrl(restaurant.instagram_url ?? "");
        setMainImage(restaurant.main_image ?? null);
    }, [restaurant]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !restaurant) return;

        const supabase = createClient();
        const path = `${restaurant.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("shop-photos").upload(path, file);
        if (error) {
            toast("画像のアップロードに失敗しました", "error");
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from("shop-photos").getPublicUrl(path);
        setMainImage(publicUrl);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setIsLoading(true);

        const supabase = createClient();
        const { error, data } = await supabase
            .from("shops")
            .update({ name, genre, address, phone, description, instagram_url: instagramUrl, main_image: mainImage })
            .eq("id", restaurant.id)
            .select()
            .single();

        if (error) {
            toast("保存に失敗しました", "error");
        } else {
            setRestaurant(data);
            toast("プロフィールを更新しました");
        }
        setIsLoading(false);
    };

    if (!restaurant) {
        return <div className="flex items-center justify-center py-20 text-sm text-gray-400">読み込み中...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">店舗プロフィール</h1>

            <Card>
                <CardContent>
                    {/* メイン画像 */}
                    <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                        {mainImage ? (
                            <Image src={mainImage} alt="メイン画像" fill className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                                画像未設定
                            </div>
                        )}
                        <label className="absolute bottom-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/80 shadow">
                            <Camera className="size-5 text-gray-600" />
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input id="name" label="店名" value={name} onChange={(e) => setName(e.target.value)} required />
                        <Input id="genre" label="ジャンル" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="和食、イタリアンなど" />
                        <Input id="address" label="住所" value={address} onChange={(e) => setAddress(e.target.value)} required />
                        <Input id="phone" label="電話番号" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <div className="space-y-1">
                            <label htmlFor="description" className="text-sm font-medium text-gray-700">紹介文</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <Input id="instagramUrl" label="Instagram URL" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
                        <Button type="submit" className="w-full" isLoading={isLoading}>保存する</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
