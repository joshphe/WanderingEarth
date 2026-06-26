import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // 中间件仅用于注入 session，不做拦截
  // API 路由各自验证权限
  return NextResponse.next();
});

export const config = {
  // 仅匹配需要 session 的页面路由 + API 路由，排除静态资源
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|eot|css|js|map)).*)",
  ],
};
