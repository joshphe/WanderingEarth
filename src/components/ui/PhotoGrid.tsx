"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { PhotoItem } from "@/lib/types";
import { getSafeImageUrl } from "@/lib/utils";

const EditPhotoModal = dynamic(
  () =>
    import("./EditPhotoModal").then((m) => ({
      default: m.EditPhotoModal,
    })),
  { ssr: false }
);

function PhotoCard({
  photo,
  onUpdate,
}: {
  photo: PhotoItem;
  onUpdate: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden bg-white/5 aspect-[4/3]">
        <img
          src={getSafeImageUrl(photo.url)}
          alt={photo.title || ""}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="编辑"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-red-500/60 text-white transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {photo.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">{photo.title}</p>
          </div>
        )}
      </div>

      {showEdit && (
        <EditPhotoModal
          photo={photo}
          onUpdated={() => {
            onUpdate();
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirmModal
          targetId={photo.id}
          targetType="photo"
          targetName={photo.title || "照片"}
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

export function PhotoGrid({
  photos,
  locationName,
  onUpdate,
}: {
  photos: PhotoItem[];
  locationName: string;
  onUpdate: () => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
