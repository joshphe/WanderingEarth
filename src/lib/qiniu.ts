/**
 * 七牛云 Kodo 对象存储 — 上传 Token 生成
 *
 * 纯 Node.js crypto 实现，零外部依赖。
 * 客户端拿到 uploadToken 后直传七牛云，服务端不触达文件数据。
 */

import crypto from "crypto";

/** base64url 编码（七牛云要求：+ → -，/ → _，去除末尾 =） */
function base64urlEncode(data: string | Buffer): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 生成七牛云上传凭证
 *
 * @param accessKey - 七牛云 AccessKey
 * @param secretKey - 七牛云 SecretKey
 * @param bucket   - 存储空间名称
 * @param key      - 对象 key（文件路径）
 * @param expiresInSeconds - 凭证有效期（秒），默认 600
 * @returns 上传凭证（uploadToken）
 *
 * @see https://developer.qiniu.com/kodo/1208/upload-token
 */
export function generateUploadToken(
  accessKey: string,
  secretKey: string,
  bucket: string,
  key: string,
  expiresInSeconds: number = 600
): string {
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const putPolicy = JSON.stringify({
    scope: `${bucket}:${key}`,
    deadline,
  });

  const encodedPutPolicy = base64urlEncode(putPolicy);
  const sign = crypto
    .createHmac("sha1", secretKey)
    .update(encodedPutPolicy)
    .digest();
  const encodedSign = base64urlEncode(sign);

  return `${accessKey}:${encodedSign}:${encodedPutPolicy}`;
}

/** 七牛云上传域名（华东，覆盖国内大部分地区） */
const QINIU_UPLOAD_URL = "https://upload.qiniup.com";

/**
 * 生成唯一的对象 key
 */
function generateKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `photos/${userId}/${timestamp}_${safeName}`;
}

/**
 * 生成客户端直传所需信息
 *
 * @returns { uploadToken, uploadUrl, key, publicUrl }
 */
export function getUploadInfo(
  userId: string,
  fileName: string
): {
  uploadToken: string;
  uploadUrl: string;
  key: string;
  publicUrl: string;
} {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET || "wandering-earth";
  const domain = process.env.QINIU_DOMAIN;

  if (!accessKey || !secretKey) {
    throw new Error("七牛云凭证未配置，请设置 QINIU_ACCESS_KEY 和 QINIU_SECRET_KEY 环境变量");
  }

  if (!domain) {
    throw new Error("七牛云域名未配置，请设置 QINIU_DOMAIN 环境变量（如 https://xxx.bkt.clouddn.com）");
  }

  const key = generateKey(userId, fileName);
  const uploadToken = generateUploadToken(accessKey, secretKey, bucket, key);
  const uploadUrl = process.env.QINIU_UPLOAD_URL || QINIU_UPLOAD_URL;
  const publicUrl = `${domain.replace(/\/+$/, "")}/${key}`;

  return { uploadToken, uploadUrl, key, publicUrl };
}

// ─── 文件删除 ────────────────────────────────────────────

/** 七牛云管理 API 域名（华东默认） */
const QINIU_MANAGE_HOST = "rs.qiniu.com";

/**
 * 生成管理 API 的 QBox 认证 Token
 *
 * @see https://developer.qiniu.com/kodo/1201/access-token
 */
function generateManagementToken(
  accessKey: string,
  secretKey: string,
  method: string,
  path: string,
  host: string,
  contentType = "application/x-www-form-urlencoded",
  body = ""
): string {
  const signingStr = `${method} ${path}\nHost: ${host}\nContent-Type: ${contentType}\n\n${body}`;
  const sign = crypto
    .createHmac("sha1", secretKey)
    .update(signingStr)
    .digest();
  return `QBox ${accessKey}:${base64urlEncode(sign)}`;
}

/**
 * 从公开 URL 提取对象 key
 *
 * @param url     - 完整公开 URL，如 https://xxx.bkt.clouddn.com/photos/user/abc.jpg
 * @param domain  - 配置的 QINIU_DOMAIN
 * @returns 对象 key，如果 URL 不属于该 domain 则返回 null（用户自己的外链）
 */
function extractKey(url: string, domain: string): string | null {
  const normalizedDomain = domain.replace(/\/+$/, "");
  const prefix = normalizedDomain + "/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/**
 * 从七牛云删除单个文件
 *
 * @param url - 照片的公开 URL
 * @returns 删除结果；如果 URL 不属于七牛云（用户自己的外链）则静默跳过
 */
export async function deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET || "wandering-earth";
  const domain = process.env.QINIU_DOMAIN;

  if (!accessKey || !secretKey || !domain) {
    return { success: false, error: "七牛云未配置" };
  }

  const key = extractKey(url, domain);
  if (!key) {
    // URL 不属于我们的 bucket（用户自己的外链），无需删除
    return { success: true };
  }

  // 编码 entry: base64url(bucket:key)
  const entry = base64urlEncode(`${bucket}:${key}`);
  const path = `/delete/${entry}`;
  const host = process.env.QINIU_MANAGE_HOST || QINIU_MANAGE_HOST;

  const token = generateManagementToken(accessKey, secretKey, "POST", path, host);

  try {
    const res = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `七牛云返回 ${res.status}: ${body}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `请求失败: ${err.message}` };
  }
}
