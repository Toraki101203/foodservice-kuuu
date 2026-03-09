import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types/database";

const config: Record<SeatStatusType, { label: string; className: string }> = {
    available: { label: "空席あり", className: "bg-green-100 text-green-700" },
    busy: { label: "やや混雑", className: "bg-yellow-100 text-yellow-700" },
    full: { label: "満席", className: "bg-red-100 text-red-700" },
    closed: { label: "休業", className: "bg-gray-100 text-gray-500" },
};

interface SeatBadgeProps {
    status: SeatStatusType;
    className?: string;
}

export function SeatBadge({ status, className }: SeatBadgeProps) {
    const { label, className: badgeClass } = config[status] ?? config.closed;
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", badgeClass, className)}>
            {label}
        </span>
    );
}
