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
  useFrame(() => {
    const store = useEarthStore.getState();
    const paused = store.earthPaused || store.expandedMemory || store.pendingExpandedMemory;
    if (earthRef.current && !paused) {
      earthRef.current.rotation.y += 0.0003;
    }
    // 同步旋转角
    if (earthRef.current) {
      store.setEarthRotation(earthRef.current.rotation.y);
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
