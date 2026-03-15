import Link from "next/link";
import { SeatBadge } from "@/components/ui/seat-badge";
import type { Shop, SeatStatus } from "@/types/database";

type ShopGridCardProps = {
  shop: Shop & { seat_status: SeatStatus[] };
  distance?: string;
};

export function ShopGridCard({ shop, distance }: ShopGridCardProps) {
  const seatStatus = shop.seat_status?.[0];

  return (
    <Link href={`/shop/${shop.id}`} className="block">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="relative aspect-[4/3] bg-gray-100">
          {shop.main_image && (
            <img
              src={shop.main_image}
              alt={shop.name}
              className="size-full object-cover"
              loading="lazy"
            />
          )}
          {seatStatus && (
            <div className="absolute bottom-2 left-2">
              <SeatBadge status={seatStatus.status} />
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="truncate text-sm font-bold text-gray-900">{shop.name}</p>
          <p className="truncate text-xs text-gray-500">
            {shop.genre}{distance ? ` · ${distance}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
