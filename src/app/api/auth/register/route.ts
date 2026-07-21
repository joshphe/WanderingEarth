import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // 速率限制: 每个 IP 每分钟最多 3 次注册
  const ip = getClientIp(request);
  const limiter = rateLimit(`register:${ip}`, 3, 60_000);
  if (!limiter.allowed) {
    return errorResponse("请求过于频繁，请稍后再试", 429);
  }

  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password) {
      return errorResponse("邮箱和密码不能为空", 400);
    }

    if (password.length < 6) {
      return errorResponse("密码至少 6 位", 400);
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("邮箱格式不正确", 400);
    }

    if (!inviteCode || typeof inviteCode !== "string" || !inviteCode.trim()) {
      return errorResponse("邀请码不能为空", 400);
    }

    // 验证邀请码存在
    const code = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.trim() },
    });

    if (!code) {
      return errorResponse("邀请码无效", 400);
    }

    // 使用交互式事务：邮箱唯一性检查 + 邀请码原子自增
    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash: hashPassword(password),
            name: name || null,
          },
        });

        // 原子性自增：仅当 usedCount < maxUses 时才更新
        // 利用数据库行锁保证并发安全
        const result = await tx.inviteCode.updateMany({
          where: {
            id: code.id,
            usedCount: { lt: code.maxUses },
          },
          data: { usedCount: { increment: 1 } },
        });

        // 如果 updateMany 影响 0 行，说明邀请码在并发竞争中被消耗完
        if (result.count === 0) {
          throw new Error("INVITE_CODE_EXHAUSTED");
        }

        return created;
      });

      return NextResponse.json(
        {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        { status: 201 }
      );
    } catch (e: any) {
      // 邀请码在并发中被消耗完 → 事务自动回滚用户创建
      if (e?.message === "INVITE_CODE_EXHAUSTED") {
        return errorResponse("邀请码已被使用完", 400);
      }
      // Prisma 唯一约束违反 → 邮箱已注册（并发安全）
      if (e?.code === "P2002") {
        return errorResponse("该邮箱已注册", 409);
      }
      throw e;
    }
  } catch (e: any) {
    console.error("注册失败:", e);
    return errorResponse("服务器错误，请稍后重试", 500);
  }
}
