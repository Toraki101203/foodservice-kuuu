import { format, isToday, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 日付を日本語でフォーマット
 * 今日 → 「今日」
 * 昨日 → 「昨日」
 * 今年 → 「2月24日」
 * 去年以前 → 「2025年12月1日」
 */
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);

    if (isToday(date)) return "今日";
    if (isYesterday(date)) return "昨日";

    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
        return format(date, "M月d日", { locale: ja });
    }

    return format(date, "yyyy年M月d日", { locale: ja });
}

/**
 * 時刻を読みやすくフォーマット
 * "19:00:00" → "19:00"
 */
export function formatTime(timeStr: string): string {
    return timeStr.slice(0, 5);
}
