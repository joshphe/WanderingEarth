"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X, MapPin, Search, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import type { SearchResult } from "@/lib/types";
import { formatSearchResult } from "@/lib/types";

export function EditLocationModal({
  locationId,
  currentName,
  currentIsPublic,
  currentCountry,
  currentCountryCode,
  currentCity,
  currentState,
  currentLat,
  currentLng,
  onUpdated,
  onClose,
}: {
  locationId: string;
  currentName: string;
  currentIsPublic?: boolean;
  currentCountry?: string | null;
  currentCountryCode?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentLat?: number;
  currentLng?: number;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [isPublic, setIsPublic] = useState(currentIsPublic ?? true);
  const [saving, setSaving] = useState(false);

  // 经纬度：选中搜索结果后更新
  const [lat, setLat] = useState(currentLat ?? 0);
  const [lng, setLng] = useState(currentLng ?? 0);

  // 地理字段：优先当前值，否则空
  const [country, setCountry] = useState(currentCountry || "");
  const [countryCode, setCountryCode] = useState(currentCountryCode || "");
  const [city, setCity] = useState(currentCity || "");
  const [state, setState] = useState(currentState || "");

  // 搜索相关
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 地点模糊搜索
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);

    const currentQuery = searchQuery;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(currentQuery)}`
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
    const addr = result.address || {};

    // 更新经纬度
    setLat(parseFloat(result.lat));
    setLng(parseFloat(result.lon));

    // 更新地点名
    let locName = "";
    if (addr.city) locName = addr.city;
    else if (addr.town) locName = addr.town;
    else if (addr.village) locName = addr.village;
    else if (addr.state) locName = addr.state;
    else locName = formatSearchResult(result).title;

    if (addr.country_code && addr.country_code !== "cn") {
      locName = `${locName} · ${addr.country || addr.country_code.toUpperCase()}`;
    }

    setName(locName);

    // 自动填入国家/城市
    setCountry(addr.country || "");
    setCountryCode(addr.country_code || "");
    setCity(addr.city || addr.town || addr.village || "");
    setState(addr.state || "");

    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("地点名称不能为空");
      return;
    }

    const body: any = {};

    if (trimmed !== currentName) body.name = trimmed;
    if (isPublic !== currentIsPublic) body.isPublic = isPublic;
    if (country !== (currentCountry || "")) body.country = country || null;
    if (countryCode !== (currentCountryCode || "")) body.countryCode = countryCode || null;
    if (city !== (currentCity || "")) body.city = city || null;
    if (state !== (currentState || "")) body.state = state || null;
    if (lat !== (currentLat ?? 0)) body.latitude = lat;
    if (lng !== (currentLng ?? 0)) body.longitude = lng;

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      toast.success("地点信息已更新");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-400" />
            编辑地点
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 模糊搜索地址 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <Search className="w-3.5 h-3.5" />
              搜索重新匹配地址（可选）
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入地点名以自动匹配国家城市..."
                className="w-full bg-white/[0.07] border border-white/15 rounded-lg pl-3 pr-8 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 transition-colors"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 animate-spin" />
              )}
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="mt-2 glass max-h-36 overflow-y-auto divide-y divide-white/5">
                {searchResults.map((r, i) => {
                  const formatted = formatSearchResult(r);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectLocation(r)}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-blue-400/60 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                        <div className="min-w-0">
                          <p className="text-xs text-white/90 font-medium truncate">
                            {formatted.title}
                          </p>
                          {formatted.subtitle && (
                            <p className="text-[11px] text-white/40 truncate mt-0.5">
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
          </div>

          {/* 地点名称 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <MapPin className="w-3.5 h-3.5" />
              地点名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") onClose();
              }}
              className="w-full bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-blue-400/50 transition-colors"
              autoFocus
            />
          </div>

          {/* 国家 / 城市 */}
          <div>
            <label className="flex items-center gap-2 text-xs text-white/40 mb-1.5">
              <Globe className="w-3.5 h-3.5" />
              国家 / 城市
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="国家"
                className="flex-1 bg-white/[0.07] border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 transition-colors"
              />
              <span className="text-white/20 text-xs">·</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="城市"
                className="flex-1 bg-white/[0.07] border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 transition-colors"
              />
            </div>
            {state && (
              <p className="text-[10px] text-white/20 mt-1">
                省/州: {state}
                {countryCode && ` · ${countryCode.toUpperCase()}`}
              </p>
            )}
          </div>

          {/* 公开/私密切换 */}
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg text-left"
          >
            {isPublic ? (
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/40 shrink-0" />
            )}
            <div>
              <p className="text-sm text-white/80">
                {isPublic ? "公开记忆" : "私密记忆"}
              </p>
              <p className="text-xs text-white/40">
                {isPublic ? "其他用户可以在社区中看到" : "仅自己可见"}
              </p>
            </div>
          </button>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
