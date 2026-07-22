"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FeedCard, type FeedItem } from "./FeedCard";
import { MemoryModal, type LocationDetail } from "./MemoryModal";
import { Loader2, Globe } from "lucide-react";

export function CommunityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [prefetchedData, setPrefetchedData] = useState<LocationDetail | null>(null);
  const cacheRef = useRef<Map<string, LocationDetail>>(new Map());
  const pendingRef = useRef<Map<string, Promise<void>>>(new Map());

  const fetchFeed = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/feed?page=${pageNum}&limit=12`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      return data;
    } catch (e: any) {
      throw new Error(e.message || "网络错误");
    }
  }, []);

  // 首次加载
  useEffect(() => {
    fetchFeed(1)
      .then((data) => {
        setItems(data.items);
        setHasMore(data.hasMore);
        setPage(1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  /** 预加载地点详情数据（悬停时触发） */
  const preloadLocation = useCallback(async (locationId: string) => {
    // 已缓存或正在请求中则跳过
    if (cacheRef.current.has(locationId) || pendingRef.current.has(locationId)) return;

    const promise = fetch(`/api/locations/${encodeURIComponent(locationId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const detail: LocationDetail = {
          id: data.id,
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          country: data.country,
          photos: (data.photos || []).map((p: any) => ({
            url: p.url,
            title: p.title,
            description: p.description,
            takenAt: p.takenAt,
          })),
          user: data.user || { id: "", name: null, image: null },
        };
        cacheRef.current.set(locationId, detail);
        pendingRef.current.delete(locationId);
      })
      .catch(() => {
        pendingRef.current.delete(locationId);
      });

    pendingRef.current.set(locationId, promise);
  }, []);

  /** 点击卡片：优先用缓存数据，否则 fallback fetch */
  const handleCardClick = useCallback((locationId: string) => {
    const cached = cacheRef.current.get(locationId);
    setPrefetchedData(cached || null);
    setSelectedLocationId(locationId);
  }, []);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(nextPage);
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch {
      // 静默失败，保留已有数据
    } finally {
      setLoadingMore(false);
    }
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  // Error 状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-white/40 text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchFeed(1)
              .then((data) => {
                setItems(data.items);
                setHasMore(data.hasMore);
                setPage(1);
              })
              .catch((e) => setError(e.message))
              .finally(() => setLoading(false));
          }}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  // Empty 状态
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Globe className="w-10 h-10 text-white/10" />
        <p className="text-white/30 text-sm">还没有公开的旅行记忆</p>
        <p className="text-white/15 text-xs">成为第一个分享旅行足迹的人吧 🌍</p>
      </div>
    );
  }

  return (
    <div>
      {/* 响应式网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            onClick={handleCardClick}
            onMouseEnter={() => preloadLocation(item.id)}
          />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:border-white/20 disabled:opacity-50 transition-all text-sm"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                加载中...
              </>
            ) : (
              "加载更多"
            )}
          </button>
        </div>
      )}

      {/* 底部提示 */}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-white/15 text-xs py-8">
          —— 已展示全部记忆 ——
        </p>
      )}

      {/* 记忆详情弹窗 */}
      <MemoryModal
        locationId={selectedLocationId}
        isOwner={false}
        prefetchedData={prefetchedData}
        onClose={() => {
          setSelectedLocationId(null);
          setPrefetchedData(null);
        }}
      />
    </div>
  );
}
