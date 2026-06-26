/**
 * 简易内存速率限制器
 *
 * 注意：此实现在 serverless 环境（Vercel 等）中不共享状态，
 * 不同实例各自计数。生产环境建议使用 Redis（如 Upstash Redis）。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** 定期清理过期条目（每 60 秒） */
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  });
}, 60_000).unref?.();

/**
 * 检查请求是否超过速率限制
 *
 * @param key - 唯一标识（如 IP + endpoint）
 * @param maxRequests - 窗口内最大请求数
 * @param windowMs - 时间窗口（毫秒）
 * @returns 剩余请求次数，若超出限制返回 0
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // 新窗口
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * 从请求中提取客户端 IP
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp || "unknown";
}
