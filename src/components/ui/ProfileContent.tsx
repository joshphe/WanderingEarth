"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ProfileHeader } from "./ProfileHeader";
import { SearchBar } from "./SearchBar";
import { MemoryList } from "./MemoryList";
import { Pagination } from "./Pagination";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import type { UserProp, LocationItem } from "@/lib/types";

const PAGE_SIZE = 12;

export function ProfileContent({ user: initialUser }: { user: UserProp }) {
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 拉取完整用户资料（含 isPublic）
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data) setUser((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/locations?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("加载失败，请检查网络后重试");
      toast.error("加载记忆失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [user.id, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  const onUpdate = () => fetchData();

  return (
    <div className="space-y-6">
      <ProfileHeader
        user={user}
        onUserUpdate={(updated) =>
          setUser((prev) => ({ ...prev, ...updated }))
        }
        totalLocations={total}
        totalPhotos={items.reduce((sum, item) => sum + item.photoCount, 0)}
      />

      <SearchBar value={search} onChange={handleSearch} />

      {loading ? (
        <LoadingState message="加载旅行记忆..." />
      ) : error ? (
        <ErrorState message="加载失败，请检查网络后重试" onRetry={fetchData} />
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/50 text-lg">
            {search.trim()
              ? "没有匹配的记忆"
              : "还没有旅行记忆，去地球添加一个吧 🌍"}
          </p>
          {!search.trim() && (
            <a
              href="/"
              className="inline-block mt-4 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              返回地球
            </a>
          )}
        </div>
      ) : (
        <>
          <MemoryList
            items={items}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId((prev) => (prev === id ? null : id))
            }
            onUpdate={onUpdate}
          />

          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
