"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, LogIn, UserPlus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setLocked(false);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // 检查是否为账户锁定错误
      if (
        result.error.includes("锁定") ||
        result.error.includes("lock") ||
        result.error === "account_locked"
      ) {
        setLocked(true);
        setError(result.error);
      } else {
        // 不暴露具体失败原因，统一显示
        setError("邮箱或密码错误");
      }
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // 检查 URL 中是否有 NextAuth 传递的错误码
  const urlError = searchParams.get("error");

  return (
    <>
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        流浪地球
      </h1>
      <p className="text-white/50 text-sm text-center mb-8">登录你的地球</p>

      {error && (
        <div
          className={`border rounded-lg px-4 py-3 text-sm mb-4 flex items-start gap-2 ${
            locked
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {locked && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{error}</span>
        </div>
      )}

      {/* NextAuth 重定向后的通用错误提示 */}
      {!error && urlError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
          登录失败，请重试
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">邮箱</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg py-2.5 font-medium transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          登录
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/register"
          className="text-sm text-white/40 hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          还没有账号？点击注册
        </Link>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-space-deeper">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="relative z-10 glass w-full max-w-sm mx-4 p-8">
        <Suspense
          fallback={
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-2">
                流浪地球
              </h1>
              <p className="text-white/50 text-sm text-center mb-8">加载中...</p>
            </>
          }
        >
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
