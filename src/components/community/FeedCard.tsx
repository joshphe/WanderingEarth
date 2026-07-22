"use client";

import Image from "next/image";
import { MapPin, ImageIcon } from "lucide-react";
import { getSafeImageUrl } from "@/lib/utils";

export interface FeedItem {
  id: string;
  name: string;
  country?: string | null;
  coverUrl: string | null;
  photoCount: number;
  commentCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  photos?: Array<{
    url: string;
    title?: string | null;
    description?: string | null;
    takenAt?: string | null;
  }>;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "刚刚";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

/** 从用户名提取首字母作为头像 fallback */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.slice(0, 2);
}

export function FeedCard({ item, onClick }: {
  item: FeedItem;
  onClick: (item: FeedItem) => void;
}) {
  return (
    <div
      onClick={() => onClick(item)}
      className="group rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] transition-all duration-300 cursor-pointer h-full flex flex-col"
    >
      {/* 封面照片 */}
      <div className="relative w-full bg-white/[0.03]">
        {item.coverUrl ? (
          <Image
            src={getSafeImageUrl(item.coverUrl)}
            unoptimized
            alt={item.name}
            width={400}
            height={300}
            className="w-full h-auto object-cover"
            style={{ display: "block" }}
          />
        ) : (
          <div className="w-full aspect-[4/3] flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/10" />
          </div>
        )}
        {/* 照片数量角标 */}
        {item.photoCount > 1 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white/70 text-[10px]">
            {item.photoCount} 张
          </span>
        )}
      </div>

      {/* 信息栏 */}
      <div className="p-3 space-y-2 flex-1">
        {/* 发布者 */}
        <div className="flex items-center gap-2">
          {item.user.image ? (
            <Image
              src={item.user.image}
              unoptimized
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] flex items-center justify-center">
              {getInitials(item.user.name)}
            </span>
          )}
          <span className="text-xs text-white/50 truncate">
            {item.user.name || "未知用户"}
          </span>
        </div>

        {/* 地点名 */}
        <h3 className="text-sm text-white/90 font-medium truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 text-white/30 shrink-0" />
          {item.name}
        </h3>

        {/* 底部元信息 */}
        <div className="flex items-center justify-between text-[11px] text-white/30">
          <span>{item.country || "未知地点"}</span>
          <span>{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
