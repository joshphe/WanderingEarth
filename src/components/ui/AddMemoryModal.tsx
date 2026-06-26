"use client";

import { useState, useRef, useEffect } from "react";
import { X, MapPin, Calendar, Image as ImageIcon, Send, Search, Loader2, Plus, Trash2, Eye, EyeOff, Globe } from "lucide-react";
import { useEarthStore } from "@/lib/store";
import type { SearchResult } from "@/lib/types";
import { formatSearchResult } from "@/lib/types";

/**
 * 对用户输入做简单的意图判断，优化搜索词
 */
function optimizeSearchQuery(input: string): string {
  let q = input.trim();
  if (!q) return q;

  // 如果用户输入了中英文混合、拼音等，保持原样让 Nominatim 自行处理
  // 去除多余空格
  q = q.replace(/\s+/g, " ");

  // 如果输入很短（1-2字），可能是城市名，加一些上下文帮助匹配
  // 但也要保持精确匹配的能力
  return q;
}

export function AddMemoryModal({ onClose }: { onClose: () => void }) {
  const addPin = useEarthStore((s) => s.addPin);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);

  const [locationName, setLocationName] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  // 多张照片：每张 { url, title, isPublic }
  const [photos, setPhotos] = useState<{ url: string; title: string; isPublic: boolean }[]>([
    { url: "", title: "", isPublic: true },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  // 选中地点时保存的结构化地址字段，提交时一起发送
  const [selectedAddress, setSelectedAddress] = useState<{
    country?: string;
    country_code?: string;
    city?: string;
    state?: string;
  }>({});
  const debounceRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  // 地点模糊搜索
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);

    const currentQuery = searchQuery; // 闭包捕获当前值

    debounceRef.current = setTimeout(async () => {
      try {
        const optimizedQuery = optimizeSearchQuery(currentQuery);
        if (!optimizedQuery) {
          setSearchResults([]);
          return;
        }

        // 通过服务端代理请求，避免浏览器 CORS / 网络限制
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(optimizedQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setSearchResults(data);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedCoords({ lat, lng });

    // 保存结构化地址字段
    const addr = result.address || {};
    setSelectedAddress({
      country: addr.country,
      country_code: addr.country_code,
      city: addr.city || addr.town || addr.village,
      state: addr.state,
    });

    // 生成智能地点名：优先用结构化地址
    const formatted = formatSearchResult(result);
    let name = "";

    // 尝试构建有意义的中文名称
    if (addr.city) name = addr.city;
    else if (addr.town) name = addr.town;
    else if (addr.village) name = addr.village;
    else if (addr.state) name = addr.state;
    else name = formatted.title;

    // 添加国家后缀（非中国时）
    if (addr.country_code && addr.country_code !== "cn") {
      name = `${name} · ${addr.country || addr.country_code.toUpperCase()}`;
    }

    setLocationName(name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPhotos = photos.filter((p) => p.url.trim());
    if (!locationName.trim() || !selectedCoords || validPhotos.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: locationName.trim(),
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          country: selectedAddress.country || null,
          countryCode: selectedAddress.country_code || null,
          city: selectedAddress.city || null,
          state: selectedAddress.state || null,
          isPublic,
          photos: validPhotos.map((p) => ({
            url: p.url.trim(),
            title: p.title.trim() || null,
            takenAt: travelDate || null,
            isPublic: p.isPublic,
          })),
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addPin(data.location);
        setFlyToTarget({ lat: selectedCoords.lat, lng: selectedCoords.lng });
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "创建失败");
      }
    } catch {
      alert("网络错误，请重试");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            添加旅行记忆
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 旅行日期 - 日历选择 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              旅行日期
              {travelDate && (
                <span className="text-blue-400">
                  — {new Date(travelDate).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </span>
              )}
            </label>
            <div className="relative group">
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm
                  focus:outline-none focus:border-blue-400/50 transition-colors
                  [color-scheme:dark] cursor-pointer
                  [&::-webkit-calendar-picker-indicator]:opacity-50
                  [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                  [&::-webkit-calendar-picker-indicator]:cursor-pointer
                  [&::-webkit-calendar-picker-indicator]:invert
                  [&::-webkit-calendar-picker-indicator]:ml-1
                "
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
              {/* 清除按钮 */}
              {travelDate && (
                <button
                  type="button"
                  onClick={() => setTravelDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                  title="清除日期"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 地点模糊搜索 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <Search className="w-3.5 h-3.5" />
              搜索地点（支持模糊匹配，如: 东京塔、巴黎铁塔、丽江古城）
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入地点名称，比如：冰岛、东京、丽江..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
              )}
            </div>

            {/* 搜索结果列表 - 增强展示 */}
            {searchResults.length > 0 && (
              <div className="mt-2 glass max-h-48 overflow-y-auto divide-y divide-white/5">
                {searchResults.map((r, i) => {
                  const formatted = formatSearchResult(r);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectLocation(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-400/60 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                        <div className="min-w-0">
                          <p className="text-sm text-white/90 font-medium truncate">
                            {formatted.title}
                          </p>
                          {formatted.subtitle && (
                            <p className="text-xs text-white/40 truncate mt-0.5">
                              {formatted.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 已选地点编辑区 */}
            {selectedCoords && (
              <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="地点名称（可修改）"
                    required
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20"
                    autoFocus
                  />
                </div>
                {/* 自动匹配的国家 / 城市 */}
                {(selectedAddress.country || selectedAddress.city) && (
                  <div className="flex items-center gap-2 ml-6">
                    <Globe className="w-3 h-3 text-white/25 shrink-0" />
                    <input
                      type="text"
                      value={selectedAddress.country || ""}
                      onChange={(e) =>
                        setSelectedAddress((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="国家"
                      className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40"
                    />
                    <span className="text-white/20 text-[11px]">·</span>
                    <input
                      type="text"
                      value={selectedAddress.city || ""}
                      onChange={(e) =>
                        setSelectedAddress((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="城市"
                      className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40"
                    />
                    {(selectedAddress.state || selectedAddress.country_code) && (
                      <span className="text-white/15 text-[10px] ml-1">
                        {selectedAddress.state && `${selectedAddress.state}`}
                        {selectedAddress.state && selectedAddress.country_code && " · "}
                        {selectedAddress.country_code &&
                          selectedAddress.country_code.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-white/30 ml-6">
                  坐标 {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoords(null);
                      setLocationName("");
                      setSelectedAddress({});
                      setSearchQuery("");
                    }}
                    className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2"
                  >
                    重新搜索
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* 照片列表 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              照片链接
              <span className="text-white/20">
                ({photos.filter((p) => p.url.trim()).length} 张)
              </span>
            </label>

            <div className="space-y-2">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-lg p-2"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={photo.url}
                      onChange={(e) => {
                        const next = [...photos];
                        next[i] = { ...next[i], url: e.target.value };
                        setPhotos(next);
                      }}
                      placeholder={`照片 ${i + 1} — 阿里云 OSS 链接`}
                      className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20 px-1 py-0.5"
                    />
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) => {
                        const next = [...photos];
                        next[i] = { ...next[i], title: e.target.value };
                        setPhotos(next);
                      }}
                      placeholder="照片标题（可选）"
                      className="w-full bg-transparent border-none outline-none text-white/60 text-xs placeholder:text-white/15 px-1 py-0.5"
                    />
                  </div>
                  {/* 单张照片公开/私有 */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...photos];
                      next[i] = { ...next[i], isPublic: !next[i].isPublic };
                      setPhotos(next);
                    }}
                    className={`p-1.5 rounded transition-colors shrink-0 mt-0.5 ${
                      photo.isPublic
                        ? "text-blue-400 hover:text-blue-300"
                        : "text-white/30 hover:text-white/50"
                    }`}
                    title={photo.isPublic ? "公开照片" : "私密照片"}
                  >
                    {photo.isPublic ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="p-1.5 text-white/30 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setPhotos((prev) => [...prev, { url: "", title: "", isPublic: true }])
              }
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/15 text-white/30 hover:text-blue-400 hover:border-blue-400/30 transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              添加更多照片
            </button>

            {/* 构图建议 */}
            {photos.filter((p) => p.url.trim()).length > 0 && (
              <p className="mt-1.5 text-[10px] text-white/15 text-center leading-relaxed">
                💡 建议上传横构图 (16:9) 和竖构图 (4:5) 两种比例的照片，获得最佳展示效果
              </p>
            )}
          </div>

          {/* 描述 */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="说说这次旅行的故事（可选）"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors resize-none"
          />

          {/* 公开设置 */}
          <div className="space-y-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                  isPublic ? "bg-blue-500" : "bg-white/20"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-white/80">
                  {isPublic ? "本次记忆公开" : "本次记忆私密"}
                </p>
                <p className="text-xs text-white/40">
                  {isPublic
                    ? "其他用户可以在社区中看到本记忆"
                    : "仅自己可见"}
                </p>
              </div>
            </button>

            {/* 公开规则提示 */}
            {isPublic && !photos.some((p) => p.isPublic && p.url.trim()) && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                <EyeOff className="w-3 h-3" />
                请至少将一张照片设为公开，否则本次记忆将自动保存为私密
              </p>
            )}
          </div>

          {/* 提交 */}
          <button
            type="submit"
            disabled={
              submitting ||
              !locationName.trim() ||
              !selectedCoords ||
              !photos.some((p) => p.url.trim())
            }
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg py-2.5 font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? "添加中..." : "添加到地球"}
          </button>
        </form>
      </div>
    </div>
  );
}
