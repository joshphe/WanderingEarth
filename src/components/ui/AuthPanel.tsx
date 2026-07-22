"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEarthStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Loader2, LogIn, UserPlus, Ticket, X, AlertTriangle, Globe } from "lucide-react";

const PANEL_WIDTH = 400;

export function AuthPanel() {
  const authPanelOpen = useEarthStore((s) => s.authPanelOpen);
  const setAuthPanelOpen = useEarthStore((s) => s.setAuthPanelOpen);

  const close = useCallback(() => setAuthPanelOpen(false), [setAuthPanelOpen]);

  return (
    <AnimatePresence>
      {authPanelOpen && (
        <>
          {/* 遮罩 — 渐变暗化而非纯黑 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-30"
            style={{ background: "rgba(2, 2, 20, 0.55)" }}
            onClick={close}
          />

          {/* 右侧面板 */}
          <motion.div
            initial={{ x: PANEL_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: PANEL_WIDTH }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
            style={{ width: PANEL_WIDTH }}
          >
            {/* 面板主体 — 玻璃拟态 */}
            <div className="flex-1 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(8, 12, 40, 0.98) 0%, rgba(10, 14, 48, 0.97) 100%)",
                borderLeft: "1px solid rgba(59, 130, 246, 0.15)",
                boxShadow: "-8px 0 40px rgba(0, 0, 0, 0.4), -1px 0 0 rgba(59, 130, 246, 0.1)",
              }}
            >
              {/* 装饰渐变光晕 */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  style={{
                    position: "absolute",
                    top: "-15%", right: "-30%",
                    width: "300px", height: "300px",
                    background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
                    borderRadius: "50%",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "5%", left: "-20%",
                    width: "250px", height: "250px",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
                    borderRadius: "50%",
                  }}
                />
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={close}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* 内容 */}
              <div className="relative z-10 h-full flex flex-col justify-center px-10 py-16">
                {/* 头部 */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                    style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.2)" }}
                  >
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white/90 mb-1.5">流浪地球</h2>
                  <p className="text-sm text-white/35">标记属于你的旅行足迹</p>
                </div>

                {/* 表单 */}
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
      <div className="flex mb-8 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <button
          onClick={() => setTab("login")}
          className="flex-1 relative py-2.5 text-sm font-medium rounded-lg transition-all duration-300"
          style={{
            color: tab === "login" ? "#fff" : "rgba(255,255,255,0.35)",
            background: tab === "login" ? "rgba(59, 130, 246, 0.2)" : "transparent",
            boxShadow: tab === "login" ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
          }}
        >
          <LogIn className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          登录
        </button>
        <button
          onClick={() => setTab("register")}
          className="flex-1 relative py-2.5 text-sm font-medium rounded-lg transition-all duration-300"
          style={{
            color: tab === "register" ? "#fff" : "rgba(255,255,255,0.35)",
            background: tab === "register" ? "rgba(59, 130, 246, 0.2)" : "transparent",
            boxShadow: tab === "register" ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
          }}
        >
          <UserPlus className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          注册
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {tab === "login" ? (
            <LoginForm onSuccess={onSuccess} />
          ) : (
            <RegisterForm onSuccess={onSuccess} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** 输入框公共样式 */
const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "10px 12px 10px 40px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.25s, box-shadow 0.25s",
};

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
      if (result.error.includes("锁定") || result.error.includes("lock") || result.error === "account_locked") {
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
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
          style={{
            background: locked ? "rgba(251, 191, 36, 0.08)" : "rgba(239, 68, 68, 0.08)",
            border: `1px solid ${locked ? "rgba(251, 191, 36, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            color: locked ? "#fbbf24" : "#f87171",
          }}
        >
          {locked && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{error}</span>
        </motion.div>
      )}

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">邮箱</label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">密码</label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码" required
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-sm transition-all duration-300 mt-2"
        style={{
          background: loading
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          color: loading ? "rgba(255,255,255,0.25)" : "#fff",
          border: "none",
          boxShadow: loading ? "none" : "0 4px 14px rgba(59, 130, 246, 0.35)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.5)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 130, 246, 0.35)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
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
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#f87171",
          }}
        >
          {error}
        </motion.div>
      )}

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">昵称（可选）</label>
        <div className="relative group">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="你的昵称"
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">邮箱</label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">密码</label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位密码" required
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5 ml-1">
          邀请码 <span style={{ color: "#f87171" }}>*</span>
        </label>
        <div className="relative group">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400/60 transition-colors" />
          <input
            type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
            placeholder="输入邀请码" required
            style={inputBase}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-sm transition-all duration-300 mt-2"
        style={{
          background: loading
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          color: loading ? "rgba(255,255,255,0.25)" : "#fff",
          border: "none",
          boxShadow: loading ? "none" : "0 4px 14px rgba(59, 130, 246, 0.35)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.5)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 130, 246, 0.35)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        注册
      </button>
    </form>
  );
}
