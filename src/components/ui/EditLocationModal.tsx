"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { LocationSearch } from "./LocationSearch";

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
      <div className="glass-modal w-full max-w-sm max-h-[90vh] overflow-y-auto animate-modal-enter">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-400" />
            编辑地点
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors group"
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <LocationSearch
            compact={true}
            selectedCoords={lat !== 0 || lng !== 0 ? { lat, lng } : null}
            locationName={name}
            selectedAddress={{
              country,
              country_code: countryCode,
              city,
              state,
            }}
            onSelectLocation={(coords, locName, address) => {
              setLat(coords.lat);
              setLng(coords.lng);
              setName(locName);
              setCountry(address.country || "");
              setCountryCode(address.country_code || "");
              setCity(address.city || "");
              setState(address.state || "");
            }}
            onClearLocation={() => {
              setLat(0);
              setLng(0);
            }}
            onNameChange={setName}
            onAddressChange={(addr) => {
              setCountry(addr.country || "");
              setCountryCode(addr.country_code || "");
              setCity(addr.city || "");
              setState(addr.state || "");
            }}
          />

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
              className="w-full bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-blue-400/50 input-glow transition-colors"
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
                className="flex-1 bg-white/[0.07] border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 input-glow transition-colors"
              />
              <span className="text-white/20 text-xs">·</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="城市"
                className="flex-1 bg-white/[0.07] border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 input-glow transition-colors"
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
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:bg-white/10 disabled:text-white/20 text-white rounded-lg font-medium transition-transform active:scale-[0.97]"
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
