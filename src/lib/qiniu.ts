/**
 * 七牛云 Kodo 对象存储 — 上传 / 删除
 *
 * 客户端拿到 uploadToken 后直传七牛云，服务端不触达文件数据。
 */

import * as qiniu from "qiniu";

/** 七牛云上传域名（华东，覆盖国内大部分地区） */
const QINIU_UPLOAD_URL = "https://upload.qiniup.com";

/** 七牛云管理 API 域名（华东默认） */
const QINIU_MANAGE_HOST = "rs.qiniu.com";

/**
 * 生成唯一的对象 key
 */
function generateKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `photos/${userId}/${timestamp}_${safeName}`;
}

/**
 * 生成客户端直传所需信息（使用官方 SDK 签名）
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
    throw new Error(
      "七牛云凭证未配置，请设置 QINIU_ACCESS_KEY 和 QINIU_SECRET_KEY 环境变量"
    );
  }

  if (!domain) {
    throw new Error(
      "七牛云域名未配置，请设置 QINIU_DOMAIN 环境变量（如 http://xxx.bkt.clouddn.com）"
    );
  }

  const key = generateKey(userId, fileName);
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${bucket}:${key}`,
    expires: 600,
  });
  const uploadToken = putPolicy.uploadToken(mac);
  const uploadUrl = process.env.QINIU_UPLOAD_URL || QINIU_UPLOAD_URL;
  const publicUrl = `${domain.replace(/\/+$/, "")}/${key}`;

  return { uploadToken, uploadUrl, key, publicUrl };
}

// ─── 文件删除 ────────────────────────────────────────────

/**
 * 从公开 URL 提取对象 key
 *
 * @param url     - 完整公开 URL
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
export async function deleteFile(
  url: string
): Promise<{ success: boolean; error?: string }> {
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

  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const manageHost = process.env.QINIU_MANAGE_HOST || QINIU_MANAGE_HOST;
  const config = new qiniu.conf.Config();
  const bucketManager = new qiniu.rs.BucketManager(mac, config);

  try {
    const { data, resp } = await new Promise<{
      data: any;
      resp: { statusCode: number };
    }>((resolve, reject) => {
      bucketManager.delete(
        bucket,
        key,
        (err: any, body: any, info: any) => {
          if (err) reject(err);
          else resolve({ data: body, resp: info });
        }
      );
    });

    if (resp.statusCode !== 200) {
      return {
        success: false,
        error: `七牛云返回 ${resp.statusCode}: ${JSON.stringify(data)}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `请求失败: ${err.message}` };
  }
}
