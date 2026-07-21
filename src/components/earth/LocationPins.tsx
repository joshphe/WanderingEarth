"use client";

import { useRef, useState, memo } from "react";
import Image from "next/image";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { latLonToVector3, getSafeImageUrl } from "@/lib/utils";
import type { PhotoMeta } from "@/lib/types";
import * as THREE from "three";

/** 随机选取一张照片并返回其 URL + 元数据 */
function pickPhoto(pin: {
  coverUrl?: string;
  photoUrls?: string[];
  photos?: PhotoMeta[];
}): { url: string; title?: string | null; description?: string | null; takenAt?: string | null } | null {
  if (pin.photos && pin.photos.length > 0) {
    const picked = pin.photos[Math.floor(Math.random() * pin.photos.length)];
    return { url: picked.url, title: picked.title, description: picked.description, takenAt: picked.takenAt };
  }
  if (pin.photoUrls && pin.photoUrls.length > 0) {
    return { url: pin.photoUrls[Math.floor(Math.random() * pin.photoUrls.length)] };
  }
  if (pin.coverUrl) return { url: pin.coverUrl };
  return null;
}

type PinData = {
  id: string; lat: number; lng: number; name: string;
  photoCount: number; createdAt: string; coverUrl?: string; photoUrls?: string[];
  photos?: PhotoMeta[];
};

// Html 组件的恒定视觉倍率：distanceFactor = 相机距离 × TARGET_SCALE
// drei Html 应用 CSS transform: scale(df / distance)，所以 df/distance 恒为 TARGET_SCALE
const TARGET_SCALE = 1.25;

const PHOTO_FADE_START = 4.0; // 相机距离 > 此值时完全不显示
const PHOTO_FULL_SIZE = 1.65;   // 相机距离 < 此值时卡片保持恒定最大尺寸
const FADE_RANGE = PHOTO_FADE_START - PHOTO_FULL_SIZE; // 渐变区间 0.35

const FocusedPhoto = memo(function FocusedPhoto({ pin }: { pin: PinData }) {
  const { camera } = useThree();
  const photo = pickPhoto(pin);
  const photoUrl = photo?.url ?? null;
  const [visible, setVisible] = useState(false);
  const initDf = Math.round(camera.position.length() * TARGET_SCALE * 10) / 10;
  const [distanceFactor, setDistanceFactor] = useState(initDf);
  const prevVisibleRef = useRef(false);
  const prevDfRef = useRef(initDf);
  const groupRef = useRef<THREE.Group>(null);
  const [fx, fy, fz] = latLonToVector3(pin.lat, pin.lng, 1.03);
  const _worldPos = useRef(new THREE.Vector3());
  const _camDir = useRef(new THREE.Vector3());
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const setEarthPaused = useEarthStore((s) => s.setEarthPaused);
  const setPendingExpandedMemory = useEarthStore((s) => s.setPendingExpandedMemory);
  const expandedMemory = useEarthStore((s) => s.expandedMemory);
  const pendingExpandedMemory = useEarthStore((s) => s.pendingExpandedMemory);
  const guestMode = useEarthStore((s) => s.guestMode);
  // 飞行过程中隐藏迷你卡片，避免遮挡 overlay
  const overlayOpen = !!expandedMemory || !!pendingExpandedMemory;

  useFrame(() => {
    const d = camera.position.length();

    if (d >= PHOTO_FADE_START) {
      if (prevVisibleRef.current) {
        prevVisibleRef.current = false;
        setVisible(false);
      }
      return;
    }

    if (groupRef.current) {
      groupRef.current.getWorldPosition(_worldPos.current);
      _camDir.current.copy(camera.position).normalize();
      const dot = _worldPos.current.normalize().dot(_camDir.current);
      if (dot < 0.02) {
        if (prevVisibleRef.current) {
          prevVisibleRef.current = false;
          setVisible(false);
        }
        return;
      }
    }

    if (!prevVisibleRef.current) {
      prevVisibleRef.current = true;
      setVisible(true);
    }

    const scale = d < PHOTO_FULL_SIZE
      ? TARGET_SCALE
      : TARGET_SCALE * (PHOTO_FADE_START - d) / FADE_RANGE;

    const newDf = Math.round(d * scale * 10) / 10;
    if (Math.abs(newDf - prevDfRef.current) > 0.05) {
      prevDfRef.current = newDf;
      setDistanceFactor(newDf);
    }
  });

  const handleClick = () => {
    // 访客模式：不支持任何交互
    if (guestMode) return;
    if (!photo) return;
    setPendingExpandedMemory({ pin, photo });
    setFlyToTarget({ lat: pin.lat, lng: pin.lng, id: pin.id });
  };

  // overlay 打开时隐藏所有迷你卡片，避免遮挡
  if (overlayOpen) return <group ref={groupRef} position={[fx, fy, fz]} />;

  return (
    <group ref={groupRef} position={[fx, fy, fz]}>
      {visible && photoUrl && (
        <Html distanceFactor={distanceFactor} center occlude={false}>
          {/* 微型照片卡片 — 仅展示照片缩略图 */}
          <div
            className={`bg-black/90 rounded-md overflow-hidden border border-white/20 shadow-lg transition-all duration-300 motion-safe:animate-pop-in ${
              guestMode
                ? ""
                : "cursor-pointer hover:border-blue-400/60 hover:shadow-[0_0_16px_rgba(59,130,246,0.4)]"
            }`}
            style={{ width: 40, fontSize: 0 }}
            onClick={handleClick}
            onMouseEnter={() => !guestMode && setEarthPaused(true)}
            onMouseLeave={() => !guestMode && setEarthPaused(false)}
          >
            <Image
              src={getSafeImageUrl(photoUrl)}
              unoptimized
              alt={pin.name}
              width={40}
              height={28}
              style={{
                objectFit: "cover",
                display: "block",
                opacity: 0,
                transition: "opacity 0.3s ease-in",
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "1";
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.5";
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
});

const MAX_VISIBLE = 30;
const DOT_THRESHOLD = 0.05;

export function LocationPins() {
  const pins = useEarthStore((s) => s.pins);
  const { camera } = useThree();
  const [visiblePinIds, setVisiblePinIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  useFrame(() => {
    const camDir = camera.position.clone().normalize();
    const state = useEarthStore.getState();
    const ry = state.earthRotation;
    const cosR = Math.cos(ry);
    const sinR = Math.sin(ry);
    // During tour, use the full quaternion for accurate world positions
    const tourQ = state.tourTargetQ;
    const _worldPos = new THREE.Vector3();
    const candidates: { id: string; dot: number }[] = [];

    for (const pin of pins) {
      if (pin.photoCount === 0) continue;
      const [lx, ly, lz] = latLonToVector3(pin.lat, pin.lng, 1.03);

      let wx: number, wy: number, wz: number;
      if (tourQ) {
        // Full quaternion — accounts for both X and Y rotation
        _worldPos.set(lx, ly, lz).applyQuaternion(
          new THREE.Quaternion(tourQ.x, tourQ.y, tourQ.z, tourQ.w)
        );
        wx = _worldPos.x; wy = _worldPos.y; wz = _worldPos.z;
      } else {
        // Y-only rotation (auto-rotate / idle)
        wx = lx * cosR + lz * sinR;
        wy = ly;
        wz = -lx * sinR + lz * cosR;
      }
      const dot = new THREE.Vector3(wx, wy, wz).normalize().dot(camDir);
      if (dot > DOT_THRESHOLD) {
        candidates.push({ id: pin.id, dot });
      }
    }

    candidates.sort((a, b) => b.dot - a.dot);
    const newIds = new Set(candidates.slice(0, MAX_VISIBLE).map((c) => c.id));

    // 仅在集合变化时更新 state，避免每帧触发 React 协调
    const prev = prevIdsRef.current;
    if (
      newIds.size !== prev.size ||
      newIds.values().some((id) => !prev.has(id))
    ) {
      prevIdsRef.current = newIds;
      setVisiblePinIds(newIds);
    }
  });

  return (
    <>
      {pins
        .filter((p) => p.photoCount > 0 && visiblePinIds.has(p.id))
        .map((pin) => (
          <FocusedPhoto key={`fp-${pin.id}`} pin={pin} />
        ))}
    </>
  );
}
