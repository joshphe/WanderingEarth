"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Search, Loader2, Globe, X } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { formatSearchResult } from "@/lib/types";

function optimizeSearchQuery(input: string): string {
  let q = input.trim();
  if (!q) return q;
  return q.replace(/\s+/g, " ");
}

interface LocationSearchProps {
  selectedCoords: { lat: number; lng: number } | null;
  locationName: string;
  selectedAddress: Record<string, string>;
  onSelectLocation: (coords: { lat: number; lng: number }, name: string, address: Record<string, string>) => void;
  onClearLocation: () => void;
  onNameChange: (name: string) => void;
  onAddressChange: (addr: Record<string, string>) => void;
  compact?: boolean;
}

export function LocationSearch({
  selectedCoords,
  locationName,
  selectedAddress,
  onSelectLocation,
  onClearLocation,
  onNameChange,
  onAddressChange,
  compact = false,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

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
        const optimizedQuery = optimizeSearchQuery(currentQuery);
        if (!optimizedQuery) { setSearchResults([]); return; }
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(optimizedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setSearchResults(data);
        }
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};
    const addressData = {
      country: addr.country || "",
      country_code: addr.country_code || "",
      city: addr.city || addr.town || addr.village || "",
      state: addr.state || "",
    };

    let name = "";
    if (addr.city) name = addr.city;
    else if (addr.town) name = addr.town;
    else if (addr.village) name = addr.village;
    else if (addr.state) name = addr.state;
    else name = formatSearchResult(result).title;
    if (addr.country_code && addr.country_code !== "cn") {
      name = `${name} · ${addr.country || addr.country_code.toUpperCase()}`;
    }

    onSelectLocation({ lat, lng }, name, addressData);
    setSearchResults([]);
    setSearchQuery("");
  };

  const inputClass = compact
    ? "w-full bg-white/[0.07] border border-white/15 rounded-lg pl-3 pr-8 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 transition-colors"
    : "w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors";

  const labelClass = compact ? "text-xs text-white/40 mb-1.5" : "text-xs text-white/40 mb-1.5";

  return (
    <div>
      {!compact && (
        <label className={`flex items-center gap-2 ${labelClass}`}>
          <Search className="w-3.5 h-3.5" />
          搜索地点（支持模糊匹配，如: 东京塔、巴黎铁塔、丽江古城）
        </label>
      )}
      {compact && (
        <label className={`flex items-center gap-2 ${labelClass}`}>
          <Search className="w-3.5 h-3.5" />
          搜索重新匹配地址（可选）
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={compact ? "输入地点名以自动匹配国家城市..." : "输入地点名称，比如：冰岛、东京、丽江..."}
          className={inputClass}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="mt-2 glass max-h-48 overflow-y-auto divide-y divide-white/5">
          {searchResults.map((r, i) => {
            const formatted = formatSearchResult(r);
            return (
              <button key={i} type="button" onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors group">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400/60 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium truncate">{formatted.title}</p>
                    {formatted.subtitle && <p className="text-xs text-white/40 truncate mt-0.5">{formatted.subtitle}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCoords && !compact && (
        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <input type="text" value={locationName} onChange={(e) => onNameChange(e.target.value)}
              placeholder="地点名称（可修改）" required
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20" autoFocus />
          </div>
          {(selectedAddress.country || selectedAddress.city) && (
            <div className="flex items-center gap-2 ml-6">
              <Globe className="w-3 h-3 text-white/25 shrink-0" />
              <input type="text" value={selectedAddress.country || ""}
                onChange={(e) => onAddressChange({ ...selectedAddress, country: e.target.value })}
                placeholder="国家" className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40" />
              <span className="text-white/20 text-[11px]">·</span>
              <input type="text" value={selectedAddress.city || ""}
                onChange={(e) => onAddressChange({ ...selectedAddress, city: e.target.value })}
                placeholder="城市" className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] placeholder:text-white/15 outline-none focus:border-blue-400/40" />
              {(selectedAddress.state || selectedAddress.country_code) && (
                <span className="text-white/15 text-[10px] ml-1">
                  {selectedAddress.state && `${selectedAddress.state}`}
                  {selectedAddress.state && selectedAddress.country_code && " · "}
                  {selectedAddress.country_code && selectedAddress.country_code.toUpperCase()}
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-white/30 ml-6">
            坐标 {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
            {" · "}
            <button type="button" onClick={onClearLocation}
              className="text-blue-400/60 hover:text-blue-400 underline underline-offset-2">重新搜索</button>
          </p>
        </div>
      )}
    </div>
  );
}
