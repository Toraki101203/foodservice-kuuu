import { cn } from "@/lib/utils";
import { getSeatStatusLabel, getSeatStatusColor } from "@/lib/utils";
import type { SeatStatusType } from "@/types/database";

type SeatBadgeProps = {
  status: SeatStatusType;
  className?: string;
};

export function SeatBadge({ status, className }: SeatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white",
        getSeatStatusColor(status),
        className
      )}
    >
      {getSeatStatusLabel(status)}
    </span>
  );
}
