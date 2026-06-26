"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Map,
  Loader2,
} from "lucide-react";
import { useEarthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface FootprintLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  photoCount: number;
  coverUrl: string | null;
}

interface FootprintCity {
  city: string;
  state: string | null;
  locations: FootprintLocation[];
}

interface FootprintCountry {
  country: string;
  countryCode: string | null;
  cities: FootprintCity[];
}

interface FootprintData {
  countries: FootprintCountry[];
  stats: { countries: number; cities: number; locations: number };
}

export function RightSidebar() {
  const pins = useEarthStore((s) => s.pins);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const flyToTarget = useEarthStore((s) => s.flyToTarget);
  const exploreUserId = useEarthStore((s) => s.exploreUserId);

  const isExploring = !!exploreUserId;

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FootprintData | null>(null);
  const [loading, setLoading] = useState(false);
  // 展开状态：key = "country|city" 格式
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  // 当前飞到的地点 ID（高亮用）
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  // 切换面板时加载数据（探索模式下不加载）
  useEffect(() => {
    if (isExploring || !open || data) return;
    setLoading(true);
    fetch("/api/my-footprints")
      .then((res) => res.ok && res.json())
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, data, isExploring]);

  // 当 pin 数量变化时刷新（探索模式下不触发）
  useEffect(() => {
    if (isExploring || !open || !data || pins.length === data.stats.locations) return;
    setData(null);
  }, [open, pins.length, data, isExploring]);

  // flyToTarget 变化时高亮对应地点
  useEffect(() => {
    if (flyToTarget?.id) {
      setActiveLocationId(flyToTarget.id);
    }
  }, [flyToTarget]);

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const toggleCity = (key: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLocationClick = (loc: FootprintLocation) => {
    setFlyToTarget({ lat: loc.latitude, lng: loc.longitude, id: loc.id });
    setActiveLocationId(loc.id);
  };

  // 展开全部
  const expandAll = () => {
    if (!data) return;
    const allCountries = new Set(data.countries.map((c) => c.country));
    const allCities = new Set<string>();
    data.countries.forEach((c) =>
      c.cities.forEach((city) => allCities.add(`${c.country}|${city.city}`))
    );
    setExpandedCountries(allCountries);
    setExpandedCities(allCities);
  };

  // 收起全部
  const collapseAll = () => {
    setExpandedCountries(new Set());
    setExpandedCities(new Set());
  };

  // 探索模式下隐藏（看的是别人的足迹）
  if (isExploring) return null;

  return (
    <>
      {/* 折叠按钮 — 随面板开合移动 */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute top-24 z-30 glass rounded-full p-2 text-white/60 hover:text-white transition-all duration-300",
          open ? "right-[15.5rem]" : "right-4"
        )}
        title={open ? "收起足迹" : "展开足迹"}
      >
        {open ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* 面板 */}
      <div
        className={cn(
          "absolute top-20 right-4 z-20 transition-all duration-300",
          open
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        )}
      >
        <div className="glass overflow-hidden flex flex-col w-52 max-h-[calc(100vh-6rem)]">
          {/* 头部 */}
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-400" />
              我的足迹
            </h2>
            {data && data.countries.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-1"
                  title="展开全部"
                >
                  展开
                </button>
                <button
                  onClick={collapseAll}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-1"
                  title="收起全部"
                >
                  收起
                </button>
              </div>
            )}
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </div>
            )}

            {!loading && (!data || data.countries.length === 0) && (
              <div className="p-4 text-center text-xs text-white/30">
                <MapPin className="w-6 h-6 mx-auto mb-2 opacity-30" />
                暂无旅行足迹
              </div>
            )}

            {!loading &&
              data &&
              data.countries.map((country) => {
                const isCountryExpanded = expandedCountries.has(country.country);
                return (
                  <div key={country.country} className="border-b border-white/5 last:border-b-0">
                    {/* 国家条目 */}
                    <button
                      onClick={() => toggleCountry(country.country)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-white/30 shrink-0 transition-transform",
                          isCountryExpanded && "rotate-0",
                          !isCountryExpanded && "-rotate-90"
                        )}
                      />
                      <span className="text-xs font-medium text-white/80 truncate flex-1">
                        {country.country}
                      </span>
                      <span className="text-[10px] text-white/25 shrink-0">
                        {country.cities.reduce((s, c) => s + c.locations.length, 0)}
                      </span>
                    </button>

                    {/* 城市列表 */}
                    {isCountryExpanded &&
                      country.cities.map((city) => {
                        const cityKey = `${country.country}|${city.city}`;
                        const isCityExpanded = expandedCities.has(cityKey);
                        return (
                          <div key={cityKey}>
                            {/* 城市条目 */}
                            <button
                              onClick={() => toggleCity(cityKey)}
                              className="w-full flex items-center gap-2 pl-7 pr-3 py-1.5 hover:bg-white/5 transition-colors text-left"
                            >
                              <ChevronDown
                                className={cn(
                                  "w-2.5 h-2.5 text-white/20 shrink-0 transition-transform",
                                  isCityExpanded && "rotate-0",
                                  !isCityExpanded && "-rotate-90"
                                )}
                              />
                              <span className="text-[11px] text-white/60 truncate flex-1">
                                {city.city}
                              </span>
                              <span className="text-[10px] text-white/20 shrink-0">
                                {city.locations.length}
                              </span>
                            </button>

                            {/* 地点列表 */}
                            {isCityExpanded &&
                              city.locations.map((loc) => (
                                <button
                                  key={loc.id}
                                  onClick={() => handleLocationClick(loc)}
                                  className={cn(
                                    "w-full flex items-center gap-2 pl-12 pr-3 py-1 hover:bg-white/5 transition-colors text-left group",
                                    activeLocationId === loc.id && "bg-blue-500/10"
                                  )}
                                >
                                  <MapPin
                                    className={cn(
                                      "w-2.5 h-2.5 shrink-0",
                                      activeLocationId === loc.id
                                        ? "text-blue-400"
                                        : "text-white/20 group-hover:text-white/40"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-[11px] truncate flex-1",
                                      activeLocationId === loc.id
                                        ? "text-blue-300"
                                        : "text-white/50 group-hover:text-white/70"
                                    )}
                                  >
                                    {loc.name}
                                  </span>
                                  {loc.photoCount > 0 && (
                                    <span className="text-[10px] text-white/20 shrink-0">
                                      {loc.photoCount}
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
          </div>

          {/* 底部统计 */}
          {data && data.stats.locations > 0 && (
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-white/25">
                <span>
                  {data.stats.countries} 国 · {data.stats.cities} 城
                </span>
                <span>{data.stats.locations} 地点</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
