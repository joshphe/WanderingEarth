"use client";

import { useEffect } from "react";
import { useEarthStore } from "@/lib/store";

export function DataLoader({ userId }: { userId?: string }) {
  const setPins = useEarthStore((s) => s.setPins);
  const setDataLoading = useEarthStore((s) => s.setDataLoading);
  const setPhotoCount = useEarthStore((s) => s.setPhotoCount);
  const setMaxPhotos = useEarthStore((s) => s.setMaxPhotos);
  const exploreUserId = useEarthStore((s) => s.exploreUserId);

  useEffect(() => {
    // 如果处于探索模式，由 LeftSidebar 手动设置 pins，不自动加载
    if (exploreUserId) return;

    const fetchLocations = async () => {
      setDataLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.set("userId", userId);

        const res = await fetch(`/api/locations?${params}`);
        if (res.ok) {
          const data = await res.json();
          const locations = data.items || data;
          const pins = locations.map((loc: any) => ({
            id: loc.id,
            lat: loc.latitude,
            lng: loc.longitude,
            name: loc.name,
            photoCount: loc.photoCount || 0,
            coverUrl: loc.coverUrl || undefined,
            photoUrls: loc.photoUrls || [],
            photos: loc.photos || [],
          }));
          setPins(pins);
        }
      } catch (err) {
        console.error("加载地点失败:", err);
      }

      // 加载照片配额
      try {
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setPhotoCount(profile.photoCount ?? 0);
          setMaxPhotos(profile.maxPhotos ?? 50);
        }
      } catch {
        // 静默失败，不影响主流程
      }

      setDataLoading(false);
    };

    fetchLocations();
  }, [setPins, setDataLoading, userId, exploreUserId]);

  return null;
}
