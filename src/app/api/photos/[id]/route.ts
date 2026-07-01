import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/qiniu";

// PATCH /api/photos/[id] — 编辑照片元数据
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return errorResponse("照片不存在", 404);
  }

  if (photo.location.userId !== session.user.id) {
    return errorResponse("无权操作", 403);
  }

  const body = await request.json();
  const { title, description, takenAt, isPublic } = body;

  const data: any = {};
  if (title !== undefined) data.title = title || null;
  if (description !== undefined) data.description = description || null;
  if (takenAt !== undefined) data.takenAt = takenAt ? new Date(takenAt) : null;
  if (isPublic !== undefined) data.isPublic = Boolean(isPublic);

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
    return errorResponse("请先登录", 401);
  }

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { location: { select: { userId: true } } },
  });

  if (!photo) {
    return errorResponse("照片不存在", 404);
  }

  if (photo.location.userId !== session.user.id) {
    return errorResponse("无权操作", 403);
  }

  // 先删数据库记录
  await prisma.photo.delete({ where: { id: params.id } });

  // 如果照片存储在七牛云，同步清理文件（用户自己的外链会自动跳过）
  deleteFile(photo.url).catch((err) => {
    console.error("清理七牛云文件失败:", err);
  });

  return NextResponse.json({ success: true });
}
