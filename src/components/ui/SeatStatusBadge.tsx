import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types";
import { getSeatStatusLabel, getSeatStatusColor } from "@/lib/utils";

interface SeatStatusBadgeProps {
    status: SeatStatusType;
    availableSeats?: number | null;
    waitTimeMinutes?: number | null;
    showDetails?: boolean;
    className?: string;
}

/**
 * 席状況バッジコンポーネント
 */
export function SeatStatusBadge({
    status,
    availableSeats,
    waitTimeMinutes,
    showDetails = false,
    className,
}: SeatStatusBadgeProps) {
    const statusIcons: Record<SeatStatusType, string> = {
        available: "🟢",
        busy: "🟡",
        full: "🔴",
        closed: "⚪",
    };

    const bgColors: Record<SeatStatusType, string> = {
        available: "bg-green-50 border-green-200",
        busy: "bg-yellow-50 border-yellow-200",
        full: "bg-red-50 border-red-200",
        closed: "bg-gray-50 border-gray-200",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2",
                bgColors[status],
                className
            )}
        >
            <span className="text-lg">{statusIcons[status]}</span>
            <div className="flex flex-col">
                <span className={cn("font-medium", getSeatStatusColor(status))}>
                    {getSeatStatusLabel(status)}
                </span>
                {showDetails && (
                    <span className="text-xs text-gray-500">
                        {status === "available" && availableSeats && (
                            <>残り {availableSeats} 席</>
                        )}
                        {status === "busy" && waitTimeMinutes && (
                            <>約 {waitTimeMinutes} 分待ち</>
                        )}
                        {status === "full" && waitTimeMinutes && (
                            <>約 {waitTimeMinutes} 分待ち</>
                        )}
                    </span>
                )}
            </div>
        </div>
    );
}
