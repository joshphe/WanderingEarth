import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getUploadInfo } from "@/lib/qiniu";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** 允许上传的 MIME 类型 */
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

/** 最大文件名长度 */
const MAX_FILENAME_LENGTH = 255;

// GET /api/photos/presign — 获取七牛云直传凭证
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  // 速率限制: 每个用户每分钟最多 30 次上传
  const limiter = rateLimit(`presign:${session.user.id}`, 30, 60_000);
  if (!limiter.allowed) {
    return errorResponse("上传请求过于频繁，请稍后再试", 429);
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("fileName");
  const contentType = searchParams.get("contentType") || "image/jpeg";

  if (!fileName) {
    return errorResponse("缺少 fileName 参数", 400);
  }

  // 验证文件名长度
  if (fileName.length > MAX_FILENAME_LENGTH) {
    return errorResponse("文件名过长", 400);
  }

  // 验证 MIME 类型
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return errorResponse("不支持的文件类型，仅允许 JPG、PNG", 400);
  }

  try {
    const info = getUploadInfo(session.user.id, fileName);

    return NextResponse.json(info);
  } catch (err) {
    console.error("生成上传凭证失败:", err);
    return errorResponse("上传服务暂不可用", 500);
  }
}
