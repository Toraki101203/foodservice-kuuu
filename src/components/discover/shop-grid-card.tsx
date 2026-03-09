import Image from "next/image";
import Link from "next/link";
import type { Restaurant } from "@/types/database";

interface ShopGridCardProps {
    shop: Restaurant;
    distance?: number;
}

export function ShopGridCard({ shop, distance }: ShopGridCardProps) {
    return (
        <Link
            href={`/shop/${shop.id}`}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
            <div className="relative aspect-square w-full bg-gray-100">
                {shop.main_image ? (
                    <Image
                        src={shop.main_image}
                        alt={shop.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 300px"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                        No Image
                    </div>
                )}
            </div>
            <div className="p-3">
                <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{shop.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                    {shop.genre && (
                        <span className="text-xs text-gray-500">{shop.genre}</span>
                    )}
                    {distance !== undefined && (
                        <span className="text-xs text-gray-400">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
