import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword, rehashPassword } from "@/lib/password";

/** 账户锁定阈值：连续失败 N 次后锁定 */
const MAX_FAILED_ATTEMPTS = 5;
/** 账户锁定时长（毫秒） */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "email",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // 用户不存在 → 不泄露信息，返回 null
        if (!user) return null;

        // 检查账户是否被锁定
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMin = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60_000
          );
          const err = new CredentialsSignin(
            `账户已被临时锁定，请 ${remainingMin} 分钟后再试`
          );
          err.code = "account_locked";
          throw err;
        }

        const isValid = verifyPassword(password, user.passwordHash);

        if (!isValid) {
          // 递增失败计数
          const newAttempts = user.failedLoginAttempts + 1;
          const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
            failedLoginAttempts: newAttempts,
          };

          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          return null;
        }

        // 登录成功 → 重置失败计数和锁定状态
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // 自动升级旧版本密码哈希（异步，不阻塞登录流程）
        const upgraded = rehashPassword(password, user.passwordHash);
        if (upgraded) {
          prisma.user
            .update({ where: { id: user.id }, data: { passwordHash: upgraded } })
            .catch((err) => console.error("密码哈希升级失败:", err));
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  trustHost:
    !!process.env.AUTH_TRUST_HOST ||
    !!process.env.VERCEL ||
    process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
});
