"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { User, LogIn, LogOut, MapPin } from "lucide-react";

interface NavbarProps {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-white no-underline pointer-events-auto ml-16">
          <MapPin className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg hidden sm:block">流浪地球</span>
        </a>

        {/* 右侧 */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {user ? (
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* 用户信息按钮 */}
              <div className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-white/60 hidden sm:block">
                  {user.name || "旅行者"}
                </span>
                {user.image ? (
                  <Image
                    src={user.image}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>

              {/* 下拉菜单 */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 glass overflow-hidden rounded-lg border border-white/10 shadow-xl">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors no-underline"
                  >
                    <User className="w-4 h-4" />
                    个人中心
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/80 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/signin"
              className="glass glass-hover rounded-full px-4 py-2 text-sm text-white/80 flex items-center gap-2 no-underline"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:block">登录</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
