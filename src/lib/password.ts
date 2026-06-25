import crypto from "crypto";

/**
 * 使用 PBKDF2 哈希密码
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * 验证密码
 */
export function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  const [salt, hash] = storedHash.split(":");
  const verify = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === verify;
}
