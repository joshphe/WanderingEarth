import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // 中间件仅用于注入 session，不做拦截
  // API 路由各自验证权限
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
