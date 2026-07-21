import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";

/**
 * 图片代理 — 解决七牛云测试域名不支持 HTTPS 导致的 mixed content 问题
 *
 * 用法: /api/img-proxy?url=http://your-qiniu-domain.bkt.clouddn.com/photos/xxx.jpg
 *
 * 生产环境 Vercel (HTTPS) 无法直接加载 HTTP 图片时，通过服务端代理获取。
 * 本地开发（localhost HTTP）直接走原始 URL，不走代理。
 * 备案完成后绑定自定义 HTTPS 域名即可去掉代理。
 *
 * 域名来源: QINIU_DOMAIN 环境变量
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return errorResponse("缺少 url 参数", 400);
  }

  // 安全检查：只允许代理七牛云相关域名的图片
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return errorResponse("无效的 URL", 400);
  }

  const allowedHostnames = [
    "cdn.echova.top",
  ];
  // 允许七牛云默认测试域名（*.bkt.clouddn.com / *.qiniudns.com）
  const allowedSuffixes = [".bkt.clouddn.com", ".qiniudns.com"];

  const isAllowed =
    allowedHostnames.includes(hostname) ||
    allowedSuffixes.some((suffix) => hostname.endsWith(suffix));

  if (!isAllowed) {
    return errorResponse("不允许代理该域名", 403);
  }

  try {
    // 检查 Content-Length 防止下载超大文件耗尽内存
    const headRes = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const contentLength = headRes.headers.get("content-length");
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return errorResponse("图片过大", 413);
    }

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return errorResponse("获取图片失败", 502);
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return errorResponse("获取图片失败", 502);
  }
}
