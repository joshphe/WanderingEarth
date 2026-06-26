import { handlers } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export const { GET } = handlers;

/**
 * POST 包装器：对登录请求（/api/auth/callback/credentials）做 IP 级速率限制
 * 同一 IP 每分钟最多 5 次尝试（含成功和失败）
 */
export const POST = async (req: NextRequest) => {
  const url = req.nextUrl;
  if (url.pathname.includes("/callback/")) {
    const ip = getClientIp(req);
    const limiter = rateLimit(`auth:${ip}`, 5, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "登录请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }
  }
  return handlers.POST(req);
};
