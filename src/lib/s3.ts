import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET || "wandering-earth-photos";
const PUBLIC_URL = process.env.S3_PUBLIC_URL || "";

/**
 * 生成唯一的文件存储 key
 */
function generateKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `photos/${userId}/${timestamp}_${safeName}`;
}

/**
 * 上传文件到 S3/R2
 */
export async function uploadToS3(
  file: Buffer,
  userId: string,
  fileName: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const key = generateKey(userId, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : `${BUCKET}/${key}`;
  return { url, key };
}

/**
 * 删除 S3/R2 中的文件
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * 生成预签名上传 URL（用于客户端直传）
 */
export async function getPresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const key = generateKey(userId, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5 分钟有效
  });

  const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : `${BUCKET}/${key}`;
  return { uploadUrl, publicUrl, key };
}
