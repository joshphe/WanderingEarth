"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { User, LogIn, LogOut, Globe, MapPin } from "lucide-react";
import { useEarthStore } from "@/lib/store";

interface NavbarProps {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

const navLinkClass =
  "flex items-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white/85 transition-colors no-underline";

export function Navbar({ user }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReduced = useReducedMotion();
  const setAuthPanelOpen = useEarthStore((s) => s.setAuthPanelOpen);

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDropdownOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  }, []);

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      {/* 导航栏背景渐变 — 顶部微微暗化增强可读性 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(5, 5, 16, 0.85) 0%, rgba(5, 5, 16, 0.4) 60%, transparent 100%)",
          height: "80px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between">
        {/* 导航链接 */}
        <div className="flex items-center gap-5 pointer-events-auto ml-16">
          <Link href="/" className={navLinkClass}>
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">首页</span>
          </Link>
          <Link href="/community" className={navLinkClass}>
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">社区</span>
          </Link>
        </div>

        {/* 右侧 */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {user ? (
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* 用户信息按钮 */}
              <div className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-sm font-semibold text-white/70 hidden sm:block">
                  {user.name || "旅行者"}
                </span>
                {user.image ? (
                  <motion.div
                    whileHover={prefersReduced ? {} : { boxShadow: "0 0 16px rgba(59,130,246,0.5)" }}
                    transition={{ duration: 0.3 }}
                    className="rounded-full"
                  >
                    <Image
                      src={user.image}
                      alt="avatar"
                      width={34}
                      height={34}
                      className="w-[34px] h-[34px] rounded-full border-2 border-white/15"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={prefersReduced ? {} : { boxShadow: "0 0 16px rgba(59,130,246,0.5)" }}
                    transition={{ duration: 0.3 }}
                    className="w-[34px] h-[34px] rounded-full bg-blue-500/15 border-2 border-blue-400/25 flex items-center justify-center"
                  >
                    <User className="w-4 h-4 text-blue-400" />
                  </motion.div>
                )}
              </div>

              {/* 下拉菜单 */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={prefersReduced ? {} : { opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={prefersReduced ? {} : { opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl border border-white/10 shadow-xl"
                    style={{ background: "rgba(12, 16, 40, 0.95)", backdropFilter: "blur(16px)" }}
                  >
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors no-underline"
                    >
                      <User className="w-4 h-4" />
                      个人中心
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400/70 hover:text-red-300 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setAuthPanelOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-2 transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                color: "rgba(255,255,255,0.8)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.25) 100%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.25)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)";
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">登录</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
