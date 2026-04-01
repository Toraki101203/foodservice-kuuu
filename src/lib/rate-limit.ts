/**
 * シンプルなインメモリレート制限
 * 本番環境では Redis ベースに置き換え推奨
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// 定期的に期限切れエントリを掃除（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000);

type RateLimitConfig = {
  /** ウィンドウあたりの最大リクエスト数 */
  maxRequests: number;
  /** ウィンドウの長さ（ミリ秒） */
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * リクエストがレート制限内かチェック
 * @param key ユーザーID や IP アドレスなどの識別子
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  existing.count += 1;

  if (existing.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}
