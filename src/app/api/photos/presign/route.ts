import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";

// GET /api/photos/presign — 获取预签名上传 URL
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("fileName");
  const contentType = searchParams.get("contentType") || "image/jpeg";

  if (!fileName) {
    return NextResponse.json(
      { error: "缺少 fileName 参数" },
      { status: 400 }
    );
  }

  try {
    const { uploadUrl, publicUrl, key } = await getPresignedUploadUrl(
      session.user.id,
      fileName,
      contentType
    );

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("生成上传 URL 失败:", err);
    return NextResponse.json(
      { error: "上传服务暂不可用" },
      { status: 500 }
    );
  }
}
