import { handlers } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * GET 包装器：捕获未处理异常，暴露真实错误信息用于排查
 */
export const GET = async (req: NextRequest) => {
  try {
    return await handlers.GET(req);
  } catch (error: any) {
    console.error("[auth] GET 未处理异常:", error);
    return NextResponse.json(
      {
        error: "Auth GET error",
        message: error?.message || String(error),
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
        name: error?.name || error?.constructor?.name,
      },
      { status: 500 }
    );
  }
};

/**
 * POST 包装器：对登录请求（/api/auth/callback/credentials）做 IP 级速率限制
 * 同一 IP 每分钟最多 5 次尝试（含成功和失败）
 */
export const POST = async (req: NextRequest) => {
  try {
    const url = req.nextUrl;
    if (url.pathname.includes("/callback/")) {
      const ip = getClientIp(req);
      const limiter = rateLimit(`auth:${ip}`, 5, 60_000);
      if (!limiter.allowed) {
        return errorResponse("登录请求过于频繁，请稍后再试", 429);
      }
    }
    return await handlers.POST(req);
  } catch (error: any) {
    console.error("[auth] POST 未处理异常:", error);
    return NextResponse.json(
      {
        error: "Auth POST error",
        message: error?.message || String(error),
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
        name: error?.name || error?.constructor?.name,
      },
      { status: 500 }
    );
  }
};
