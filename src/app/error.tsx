"use client";

import { useEffect } from "react";
import { Globe } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("页面错误:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-deeper">
      <div className="text-center space-y-6 p-8">
        <Globe className="w-20 h-20 text-red-400/30 mx-auto" />
        <h1 className="text-2xl font-bold text-white">出错了</h1>
        <p className="text-white/40">
          地球遇到了点麻烦，请重试
        </p>
        <button
          onClick={reset}
          className="glass glass-hover rounded-full px-6 py-2.5 text-blue-400"
        >
          重试
        </button>
      </div>
    </div>
  );
}
