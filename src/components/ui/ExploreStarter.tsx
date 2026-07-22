"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEarthStore } from "@/lib/store";

/**
 * 检测 URL 中的 ?explore=userId 参数，自动进入探索该用户模式。
 * 从社区动态流跳转而来时使用。
 * 需要被 Suspense 包裹（Next.js useSearchParams 要求）。
 */
export function ExploreStarter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const exploreUserId = searchParams.get("explore");
  const setPins = useEarthStore((s) => s.setPins);
  const setExploreMode = useEarthStore((s) => s.setExploreMode);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!exploreUserId || firedRef.current === exploreUserId) return;
    firedRef.current = exploreUserId;

    const fetchExplore = async () => {
      try {
        const res = await fetch(`/api/explore?userId=${encodeURIComponent(exploreUserId)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.empty || !data.locations?.length) return;

        setExploreMode(data.user.id, data.user.name);
        setPins(data.locations);

        const first = data.locations[0];
        if (first) {
          setFlyToTarget({ lat: first.lat, lng: first.lng, id: first.id });
        }
      } catch {
        // 静默失败
      }
    };

    fetchExplore();

    // 清理 URL 参数，避免刷新重复触发
    const params = new URLSearchParams(searchParams.toString());
    params.delete("explore");
    const newUrl = params.size > 0 ? `/?${params.toString()}` : "/";
    router.replace(newUrl);
  }, [exploreUserId, searchParams, router, setPins, setExploreMode, setFlyToTarget]);

  return null;
}
