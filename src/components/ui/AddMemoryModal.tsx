"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Calendar, Send } from "lucide-react";
import { useEarthStore } from "@/lib/store";
import { toast } from "sonner";
import { LocationSearch } from "./LocationSearch";
import { PhotoUploader } from "./PhotoUploader";
import { VisibilityToggle } from "./VisibilityToggle";

export function AddMemoryModal({ onClose }: { onClose: () => void }) {
  const addPin = useEarthStore((s) => s.addPin);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);

  const [locationName, setLocationName] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [photos, setPhotos] = useState<
    { url: string; title: string; isPublic: boolean }[]
  >([{ url: "", title: "", isPublic: true }]);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPhotos = photos.filter((p) => p.url.trim());
    if (!locationName.trim() || !selectedCoords || validPhotos.length === 0)
      return;

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
        setFlyToTarget({
          lat: selectedCoords.lat,
          lng: selectedCoords.lng,
        });
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || "创建失败");
      }
    } catch {
      toast.error("网络错误，请重试");
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
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
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
                  —{" "}
                  {new Date(travelDate).toLocaleDateString("zh-CN", {
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-colors [color-scheme:dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:ml-1"
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
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

          {/* 地点搜索 */}
          <LocationSearch
            selectedCoords={selectedCoords}
            locationName={locationName}
            selectedAddress={selectedAddress}
            onSelectLocation={(coords, name, address) => {
              setSelectedCoords(coords);
              setLocationName(name);
              setSelectedAddress(address);
            }}
            onClearLocation={() => {
              setSelectedCoords(null);
              setLocationName("");
              setSelectedAddress({});
            }}
            onNameChange={setLocationName}
            onAddressChange={setSelectedAddress}
          />

          {/* 照片列表 — PhotoUploader 组件 */}
          <PhotoUploader photos={photos} onPhotosChange={setPhotos} />

          {/* 描述 */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="说说这次旅行的故事（可选）"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors resize-none"
          />

          {/* 公开设置 */}
          <VisibilityToggle
            isPublic={isPublic}
            onToggle={() => setIsPublic(!isPublic)}
            showNoPublicPhotoWarning={
              !photos.some((p) => p.isPublic && p.url.trim())
            }
          />

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
