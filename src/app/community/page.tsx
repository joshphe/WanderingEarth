import { auth } from "@/lib/auth";
import { Navbar } from "@/components/ui/Navbar";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export default async function CommunityPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[#050510]">
      {/* 顶部导航 */}
      <Navbar user={session?.user ?? null} />

      {/* 页面内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white/90 mb-1">社区动态</h1>
          <p className="text-sm text-white/40">
            探索全球旅行者的公开记忆
          </p>
        </div>

        {/* 瀑布流动态 */}
        <CommunityFeed />
      </div>
    </main>
  );
}
