import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/locations/[id]/comments — 获取某条记忆的所有评论
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    select: { id: true, isPublic: true, userId: true },
  });

  if (!location) {
    return errorResponse("记忆不存在", 404);
  }

  // 非公开记忆仅 owner 可查看评论
  if (!location.isPublic && location.userId !== session.user.id) {
    return errorResponse("无权查看", 403);
  }

  const comments = await prisma.comment.findMany({
    where: { locationId: params.id, parentId: null },
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({ comments });
}

// POST /api/locations/[id]/comments — 发表评论或回复
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, isPublic: true },
  });

  if (!location) {
    return errorResponse("记忆不存在", 404);
  }

  // 只能对公开记忆发评论
  if (!location.isPublic) {
    return errorResponse("该记忆未公开，无法评论", 400);
  }

  const body = await request.json();
  const { content, parentId } = body;

  // 内容校验
  if (!content || typeof content !== "string" || !content.trim()) {
    return errorResponse("评论内容不能为空", 400);
  }
  if (content.trim().length > 50) {
    return errorResponse("评论不能超过50字", 400);
  }

  const isOwner = location.userId === session.user.id;

  // 仅 owner 可回复（传 parentId）
  if (parentId && !isOwner) {
    return errorResponse("无权操作", 403);
  }

  // 校验 parentId 引用的评论存在且属于同一 location
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, locationId: true },
    });
    if (!parentComment) {
      return errorResponse("该评论不存在", 404);
    }
    if (parentComment.locationId !== params.id) {
      return errorResponse("评论不属于该记忆", 400);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      locationId: params.id,
      parentId: parentId || null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return successResponse(comment, 201);
}
