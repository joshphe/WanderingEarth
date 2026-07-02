"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ChevronDown, Pencil, Trash2, MapPin, Image as ImageIcon, Plus } from "lucide-react";
import { PhotoGrid } from "./PhotoGrid";
import { EmptyState } from "./EmptyState";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { PhotoItem, LocationItem } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

const EditLocationModal = dynamic(
  () =>
    import("./EditLocationModal").then((m) => ({
      default: m.EditLocationModal,
    })),
  { ssr: false }
);

const AddPhotoModal = dynamic(
  () =>
    import("./AddPhotoModal").then((m) => ({ default: m.AddPhotoModal })),
  { ssr: false }
);

function MemoryCard({
  item,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  item: LocationItem;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  return (
    <>
      <div className="glass overflow-hidden transition-all">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
          onClick={onToggle}
        >
          <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-white/5 relative">
            {item.coverUrl ? (
              <Image
                src={getSafeImageUrl(item.coverUrl)}
                alt={item.name}
                fill
                sizes="80px"
                className="object-cover opacity-0 transition-opacity duration-300"
                onLoad={(e) => {
                  (e.currentTarget as HTMLImageElement).classList.remove("opacity-0");
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <h3 className="text-white font-medium truncate text-sm">
                {item.name}
              </h3>
            </div>
            <p className="text-white/50 text-xs mt-1">
              {item.photoCount} 张照片
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(true);
              }}
              className="p-1.5 text-white/50 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
              title="编辑名称"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDelete(true);
              }}
              className="p-1.5 text-white/50 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
              title="删除地点"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronDown
              className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
            {item.photos.length > 0 && (
              <PhotoGrid
                photos={item.photos}
                locationName={item.name}
                onUpdate={onUpdate}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddPhoto(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-blue-400 hover:border-blue-400/40 transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              添加照片
            </button>
          </div>
        )}
      </div>

      {showAddPhoto && (
        <AddPhotoModal
          locationId={item.id}
          locationName={item.name}
          onAdded={() => {
            onUpdate();
            setShowAddPhoto(false);
          }}
          onClose={() => setShowAddPhoto(false)}
        />
      )}

      {showEdit && (
        <EditLocationModal
          locationId={item.id}
          currentName={item.name}
          currentIsPublic={item.isPublic}
          currentCountry={item.country}
          currentCountryCode={item.countryCode}
          currentCity={item.city}
          currentState={item.state}
          currentLat={item.lat}
          currentLng={item.lng}
          onUpdated={() => {
            onUpdate();
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirmModal
          targetId={item.id}
          targetType="location"
          targetName={item.name}
          onDeleted={() => {
            onUpdate();
            setShowDelete(false);
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

export function MemoryList({
  items,
  expandedId,
  onToggleExpand,
  onUpdate,
}: {
  items: LocationItem[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdate: () => void;
}) {
  if (items.length === 0)
    return <EmptyState icon={MapPin} message="还没有旅行记忆" />;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MemoryCard
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggleExpand(item.id)}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
