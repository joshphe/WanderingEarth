import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/photos/[id] — 编辑照片元数据
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "照片不存在" }, { status: 404 });
  }

  if (photo.location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, takenAt } = body;

  const data: any = {};
  if (title !== undefined) data.title = title || null;
  if (description !== undefined) data.description = description || null;
  if (takenAt !== undefined) data.takenAt = takenAt ? new Date(takenAt) : null;

  const updated = await prisma.photo.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/photos/[id] — 删除照片
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return NextResponse.json({ error: "照片不存在" }, { status: 404 });
  }

  if (photo.location.userId !== session.user.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  await prisma.photo.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
