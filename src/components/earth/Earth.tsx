"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { type Mesh } from "three";

export function Earth({ children }: { children?: ReactNode }) {
  const earthRef = useRef<Mesh>(null);

  // NASA Blue Marble 地球纹理 (使用 drei 的 useTexture)
  const colorMap = useTexture("/textures/earth.jpg");

  // 缓慢自转（悬浮照片 / 飞行中 / 展开卡片时暂停）
  // 巡演时跟踪飞机位置保持可见
  useFrame(() => {
    if (!earthRef.current) return;
    const state = useEarthStore.getState();
    const { setEarthRotation } = state;
    const overlayFrozen =
      state.earthPaused || !!state.expandedMemory || !!state.pendingExpandedMemory;

    if (overlayFrozen) return; // overlay 打开时完全冻结

    if (state.tourPhase === "flying" && state.tourTargetY !== null) {
      // 巡演中：绝对旋转值，FlightTour 每帧计算离当前 Y 最近的等效角度
      earthRef.current.rotation.x = state.tourTargetX ?? 0;
      earthRef.current.rotation.y = state.tourTargetY;
      setEarthRotation(earthRef.current.rotation.y);
    } else {
      // 正常自转 / 等待巡演开始：X 轴始终归零，避免残留值干扰
      earthRef.current.rotation.x = 0;
      earthRef.current.rotation.y += 0.0003;
      setEarthRotation(earthRef.current.rotation.y);
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        roughness={0.6}
        metalness={0.05}
        emissive={"#1a3a5c"}
        emissiveIntensity={0.35}
      />
      {children}
    </mesh>
  );
}
