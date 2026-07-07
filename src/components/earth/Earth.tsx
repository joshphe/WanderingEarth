"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { type Mesh, Quaternion, Euler } from "three";

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

    if (state.tourPhase === "flying" && state.tourTargetY !== null && state.tourTargetQ !== null) {
      // 巡演中：每帧直接 SET 绝对目标四元数，不增量叠加，消除 feedback loop
      const q = new Quaternion(
        state.tourTargetQ.x,
        state.tourTargetQ.y,
        state.tourTargetQ.z,
        state.tourTargetQ.w
      );
      earthRef.current.quaternion.copy(q);
      // Extract world-Y rotation correctly even when quaternion has X/Z components
      const euler = new Euler().setFromQuaternion(q, "YXZ");
      setEarthRotation(euler.y);
    } else {
      // 正常自转：以 store 的 earthRotation 为权威源，设置纯 Y 旋转
      const newY = state.earthRotation + 0.0003;
      earthRef.current.rotation.set(0, newY, 0);
      setEarthRotation(newY);
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
