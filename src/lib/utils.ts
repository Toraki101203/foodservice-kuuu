import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeatStatusType } from "@/types/database";

/**
 * Tailwind CSS クラス結合ユーティリティ
 * clsx で条件分岐 → tailwind-merge で重複排除
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 空席ステータスの日本語ラベルを返す
 */
export function getSeatStatusLabel(status: SeatStatusType): string {
  const labels: Record<SeatStatusType, string> = {
    available: "空席あり",
    busy: "やや混雑",
    full: "満席",
    closed: "休業",
  };
  return labels[status];
}

/**
 * 空席ステータスに対応する背景色クラスを返す
 */
export function getSeatStatusColor(status: SeatStatusType): string {
  const colors: Record<SeatStatusType, string> = {
    available: "bg-green-500",
    busy: "bg-yellow-500",
    full: "bg-red-500",
    closed: "bg-gray-400",
  };
  return colors[status];
}

/**
 * 相対時間を日本語で返す（例: "3分前", "2時間前"）
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}日前`;
}
