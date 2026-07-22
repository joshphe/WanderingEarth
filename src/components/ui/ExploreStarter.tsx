"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEarthStore, type ExpandedMemory } from "@/lib/store";

/**
 * 检测 URL 参数，处理社区入口跳转：
 * - ?explore=userId → 进入探索该用户模式
 * - ?memory=locationId → 飞到该地点并展开记忆卡片
 * 需要被 Suspense 包裹（Next.js useSearchParams 要求）。
 */
export function ExploreStarter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const exploreUserId = searchParams.get("explore");
  const memoryId = searchParams.get("memory");
  const setPins = useEarthStore((s) => s.setPins);
  const setExploreMode = useEarthStore((s) => s.setExploreMode);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const setPendingExpandedMemory = useEarthStore((s) => s.setPendingExpandedMemory);
  const firedRef = useRef<string | null>(null);
  const memoryFiredRef = useRef<string | null>(null);

  // 处理 ?explore=userId
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

    // 清理 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    params.delete("explore");
    const newUrl = params.size > 0 ? `/?${params.toString()}` : "/";
    router.replace(newUrl);
  }, [exploreUserId, searchParams, router, setPins, setExploreMode, setFlyToTarget]);

  // 处理 ?memory=locationId — 直接飞过去展开记忆卡片
  useEffect(() => {
    if (!memoryId || memoryFiredRef.current === memoryId) return;
    memoryFiredRef.current = memoryId;

    const fetchMemory = async () => {
      try {
        const res = await fetch(`/api/locations/${encodeURIComponent(memoryId)}`);
        if (!res.ok) return;

        const loc = await res.json();
        if (!loc || !loc.photos?.length) return;

        // 构建 GlobePin
        const pin = {
          id: loc.id,
          lat: loc.latitude,
          lng: loc.longitude,
          name: loc.name,
          photoCount: loc.photos.length,
          createdAt: loc.createdAt,
          coverUrl: loc.photos[0]?.url || null,
          photoUrls: loc.photos.map((p: any) => p.url),
          photos: loc.photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            title: p.title,
            description: p.description,
            takenAt: p.takenAt,
            isPublic: p.isPublic,
            createdAt: p.createdAt,
          })),
        };

        setPins([pin]);

        // 选第一张照片作为展开的照片
        const photo = loc.photos[0];
        setPendingExpandedMemory({
          pin,
          photo: {
            url: photo.url,
            title: photo.title,
            description: photo.description,
            takenAt: photo.takenAt,
          },
        });
        setFlyToTarget({ lat: pin.lat, lng: pin.lng, id: pin.id });
      } catch {
        // 静默失败
      }
    };

    fetchMemory();

    // 清理 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    params.delete("memory");
    const newUrl = params.size > 0 ? `/?${params.toString()}` : "/";
    router.replace(newUrl);
  }, [memoryId, searchParams, router, setPins, setFlyToTarget, setPendingExpandedMemory]);

  return null;
}
