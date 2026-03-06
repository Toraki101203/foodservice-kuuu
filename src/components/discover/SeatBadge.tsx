"use client";

import { cn } from "@/lib/utils";
import type { SeatStatusType } from "@/types/database";

const statusConfig: Record<SeatStatusType, { label: string; className: string }> = {
  available: { label: "空席あり", className: "bg-green-100 text-green-700" },
  busy: { label: "混雑", className: "bg-yellow-100 text-yellow-700" },
  full: { label: "満席", className: "bg-red-100 text-red-700" },
  closed: { label: "閉店中", className: "bg-gray-100 text-gray-500" },
};

export function SeatBadge({ status }: { status: SeatStatusType }) {
  const config = statusConfig[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", config.className)}>
      {config.label}
    </span>
  );
}
