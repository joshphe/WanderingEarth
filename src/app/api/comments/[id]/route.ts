import { errorResponse, successResponse } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 递归收集评论及其所有子孙评论的 ID */
async function collectDescendantIds(commentId: string): Promise<string[]> {
  const children = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });

  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const grandchildIds = await collectDescendantIds(child.id);
    ids.push(...grandchildIds);
  }
  return ids;
}

// DELETE /api/comments/[id] — 删除评论及其所有子回复（仅 memory owner）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("请先登录", 401);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    include: {
      location: { select: { userId: true } },
    },
  });

  if (!comment) {
    return errorResponse("评论不存在", 404);
  }

  // 仅 memory owner 可删除评论
  if (comment.location.userId !== session.user.id) {
    return errorResponse("无权操作", 403);
  }

  // 递归收集所有子孙评论 ID
  const descendantIds = await collectDescendantIds(params.id);

  // 批量删除：目标评论 + 所有子孙评论
  const allIds = [params.id, ...descendantIds];
  await prisma.comment.deleteMany({
    where: { id: { in: allIds } },
  });

  return successResponse({ deleted: true });
}
