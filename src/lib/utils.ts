import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合するユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて、Tailwindクラスの競合を解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日付をフォーマットする
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 相対時間を表示する（例：「3分前」「1時間前」）
 */
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "たった今";
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return formatDate(date);
}

/**
 * 席状況のステータスラベルを取得
 */
export function getSeatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "空席あり",
    busy: "やや混雑",
    full: "満席",
    closed: "閉店中",
  };
  return labels[status] || status;
}

/**
 * 席状況のカラーを取得
 */
export function getSeatStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "text-green-500",
    busy: "text-yellow-500",
    full: "text-red-500",
    closed: "text-gray-500",
  };
  return colors[status] || "text-gray-500";
}
