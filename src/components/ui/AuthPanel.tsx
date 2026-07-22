"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEarthStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Mail, Lock, User, Loader2, LogIn, UserPlus, Ticket, X, AlertTriangle } from "lucide-react";

const PANEL_WIDTH = 400;

export function AuthPanel() {
  const authPanelOpen = useEarthStore((s) => s.authPanelOpen);
  const setAuthPanelOpen = useEarthStore((s) => s.setAuthPanelOpen);
  const prefersReduced = useReducedMotion();

  const close = useCallback(() => setAuthPanelOpen(false), [setAuthPanelOpen]);

  return (
    <AnimatePresence>
      {authPanelOpen && (
        <>
          {/* 半透明遮罩 */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* 右侧面板 */}
          <motion.div
            initial={prefersReduced ? {} : { x: PANEL_WIDTH }}
            animate={{ x: 0 }}
            exit={prefersReduced ? {} : { x: PANEL_WIDTH }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
            style={{ width: PANEL_WIDTH }}
          >
            <div className="flex-1 bg-[#0a0a1a]/95 border-l border-white/10 backdrop-blur-xl overflow-y-auto">
              {/* 关闭按钮 */}
              <button
                onClick={close}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 表单内容 */}
              <div className="p-8 pt-16">
                <AuthForm onSuccess={close} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** 登录 / 注册 Tab 切换表单 */
function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex mb-8 border-b border-white/10">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            tab === "login"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-white/30 hover:text-white/50"
          }`}
        >
          <LogIn className="w-4 h-4 inline mr-1.5" />
          登录
        </button>
        <button
          onClick={() => setTab("register")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            tab === "register"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-white/30 hover:text-white/50"
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-1.5" />
          注册
        </button>
      </div>

      {tab === "login" ? (
        <LoginForm onSuccess={onSuccess} />
      ) : (
        <RegisterForm onSuccess={onSuccess} />
      )}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
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

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      if (
        result.error.includes("锁定") ||
        result.error.includes("lock") ||
        result.error === "account_locked"
      ) {
        setLocked(true);
        setError(result.error);
      } else {
        setError("邮箱或密码错误");
      }
      setLoading(false);
    } else {
      onSuccess();
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className={`border rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
            locked
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {locked && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm text-white/60 mb-1">邮箱</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码" required
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg py-2.5 font-medium transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
        登录
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("密码至少 6 位");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || null, inviteCode }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "注册失败");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("注册成功，但自动登录失败。请尝试登录。");
      setLoading(false);
    } else {
      onSuccess();
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-white/60 mb-1">昵称（可选）</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="你的昵称"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">邮箱</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位密码" required
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">
          邀请码 <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
            placeholder="输入邀请码" required
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg py-2.5 font-medium transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        注册
      </button>
    </form>
  );
}
