import Link from "next/link";
import { Globe } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-space-deeper">
      <div className="text-center space-y-6">
        <Globe className="w-20 h-20 text-blue-400/30 mx-auto" />
        <h1 className="text-6xl font-bold text-white/20">404</h1>
        <p className="text-white/40">这个坐标上没有找到任何东西...</p>
        <Link
          href="/"
          className="inline-block glass glass-hover rounded-full px-6 py-2.5 text-blue-400 no-underline"
        >
          返回地球
        </Link>
      </div>
    </div>
  );
}
