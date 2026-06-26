import crypto from "crypto";

/** OWASP 2023 推荐的最小迭代次数 */
const CURRENT_ITERATIONS = 210_000;

/** 旧版本迭代次数（用于兼容已有密码哈希） */
const LEGACY_ITERATIONS = 1_000;

/**
 * 使用 PBKDF2 哈希密码
 * 格式: "iterations:salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, CURRENT_ITERATIONS, 64, "sha512")
    .toString("hex");
  return `${CURRENT_ITERATIONS}:${salt}:${hash}`;
}

/**
 * 验证密码，自动兼容新旧两种哈希格式
 * - 新格式: "iterations:salt:hash"
 * - 旧格式: "salt:hash"（隐式 1000 次迭代）
 */
export function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  const parts = storedHash.split(":");

  let iterations: number;
  let salt: string;
  let hash: string;

  if (parts.length === 3) {
    // 新格式: iterations:salt:hash
    iterations = parseInt(parts[0], 10);
    salt = parts[1];
    hash = parts[2];
  } else if (parts.length === 2) {
    // 旧格式（兼容）: salt:hash
    iterations = LEGACY_ITERATIONS;
    salt = parts[0];
    hash = parts[1];
  } else {
    return false;
  }

  const verify = crypto
    .pbkdf2Sync(password, salt, iterations, 64, "sha512")
    .toString("hex");

  // 常量时间比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(verify, "hex")
  );
}

/**
 * 检查密码哈希是否需要升级到当前迭代次数
 * 用于在用户登录时自动迁移旧哈希
 */
export function needsRehash(storedHash: string): boolean {
  const parts = storedHash.split(":");
  // 旧格式（2段）需要迁移到新格式
  if (parts.length === 2) return true;
  // 新格式但迭代次数低于当前值，需要升级
  if (parts.length === 3) {
    const iterations = parseInt(parts[0], 10);
    return iterations < CURRENT_ITERATIONS;
  }
  return false;
}

/**
 * 升级密码哈希（在数据库中更新）
 * 仅在 verifyPassword 成功后调用
 */
export function rehashPassword(
  password: string,
  storedHash: string
): string | null {
  if (!needsRehash(storedHash)) return null;
  return hashPassword(password);
}
