import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // 速率限制: 每个 IP 每分钟最多 3 次注册
  const ip = getClientIp(request);
  const limiter = rateLimit(`register:${ip}`, 3, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少 6 位" },
        { status: 400 }
      );
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    if (!inviteCode || typeof inviteCode !== "string" || !inviteCode.trim()) {
      return NextResponse.json(
        { error: "邀请码不能为空" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    // 验证邀请码
    const code = await prisma.inviteCode.findUnique({
      where: { code: inviteCode.trim() },
    });

    if (!code) {
      return NextResponse.json(
        { error: "邀请码无效" },
        { status: 400 }
      );
    }

    if (code.usedCount >= code.maxUses) {
      return NextResponse.json(
        { error: "邀请码已被使用完" },
        { status: 400 }
      );
    }

    // 创建用户并更新邀请码使用次数（事务保证原子性）
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          name: name || null,
        },
      }),
      prisma.inviteCode.update({
        where: { id: code.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("注册失败:", e);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
