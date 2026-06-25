"use client";

import { useEffect } from "react";
import { useEarthStore } from "@/lib/store";

export function DataLoader() {
  const setPins = useEarthStore((s) => s.setPins);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
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
    };

    fetchLocations();
  }, [setPins]);

  return null;
}
