import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile — 获取当前用户完整资料
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, isPublic: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json(user, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

// PATCH /api/profile — 更新当前用户资料（昵称、社区开放状态）
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { name, isPublic } = body;

  const data: any = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (isPublic !== undefined) {
    data.isPublic = Boolean(isPublic);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无更新内容" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, isPublic: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
