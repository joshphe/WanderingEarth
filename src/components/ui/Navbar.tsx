"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X, User, LogIn, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
            <div className="flex items-center gap-3">
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
