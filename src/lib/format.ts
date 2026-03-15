import { format, isToday, isYesterday } from "date-fns";

/**
 * 日付文字列を「今日」「昨日」「M月d日」「yyyy年M月d日」形式で返す
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);

  if (isToday(date)) return "今日";
  if (isYesterday(date)) return "昨日";

  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "M月d日");
  }
  return format(date, "yyyy年M月d日");
}

/**
 * 時刻文字列を HH:mm 形式にフォーマット
 */
export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/**
 * 期限までの残り時間を日本語で返す（ストーリー等で使用）
 */
export function formatRemainingTime(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return "期限切れ";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `残り${diffMin}分`;

  const diffHour = Math.floor(diffMin / 60);
  return `残り${diffHour}時間`;
}
