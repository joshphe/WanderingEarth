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

  // 安全检查：只允许代理已配置的 QINIU_DOMAIN 或旧测试域名下的图片
  const allowedDomains = [
    process.env.QINIU_DOMAIN,
    process.env.QINIU_LEGACY_DOMAIN,
  ].filter(Boolean) as string[];

  if (allowedDomains.length === 0) {
    return errorResponse("代理未配置", 500);
  }

  const isAllowed = allowedDomains.some((domain) => {
    const normalized = domain.replace(/\/+$/, "");
    return url.startsWith(normalized + "/");
  });

  if (!isAllowed) {
    return errorResponse("不允许代理该域名", 403);
  }

  try {
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
