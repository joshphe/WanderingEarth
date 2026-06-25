"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { latLonToVector3 } from "@/lib/utils";
import * as THREE from "three";

export function CameraController() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const flyToTarget = useEarthStore((s) => s.flyToTarget);
  const setFlyToTarget = useEarthStore((s) => s.setFlyToTarget);
  const expandedMemory = useEarthStore((s) => s.expandedMemory);
  const pendingExpandedMemory = useEarthStore((s) => s.pendingExpandedMemory);
  const setExpandedMemory = useEarthStore((s) => s.setExpandedMemory);
  const setPendingExpandedMemory = useEarthStore((s) => s.setPendingExpandedMemory);

  // 飞行中或有 overlay 时冻结交互
  const frozen = !!expandedMemory || !!pendingExpandedMemory;

  // 飞行动画
  const worldTarget = useRef(new THREE.Vector3());
  const isFlying = useRef(false);
  const startPos = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const duration = 1.2;

  useEffect(() => {
    if (flyToTarget) {
      // 飞行开始时锁定目标：pin 在当前地球旋转角下的世界坐标
      const [lx, ly, lz] = latLonToVector3(flyToTarget.lat, flyToTarget.lng, 1.5);
      const ry = useEarthStore.getState().earthRotation;
      const cosR = Math.cos(ry);
      const sinR = Math.sin(ry);
      // Three.js makeRotationY: wx = lx*cos + lz*sin, wz = -lx*sin + lz*cos
      worldTarget.current.set(
        lx * cosR + lz * sinR,
        ly,
        -lx * sinR + lz * cosR
      );
      startPos.current.copy(camera.position);
      progress.current = 0;
      isFlying.current = true;
      setFlyToTarget(null);
    }
  }, [flyToTarget, camera, setFlyToTarget]);

  useFrame((_, delta) => {
    if (isFlying.current) {
      progress.current += delta / duration;
      if (progress.current >= 1) {
        camera.position.copy(worldTarget.current);
        isFlying.current = false;
        // 飞行结束 → 弹出 overlay
        const pending = useEarthStore.getState().pendingExpandedMemory;
        if (pending) {
          setPendingExpandedMemory(null);
          setExpandedMemory(pending);
        }
      } else {
        const t = progress.current;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.lerpVectors(startPos.current, worldTarget.current, ease);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={!frozen}
      enablePan={false}
      enableRotate={!frozen}
      minDistance={1.5}
      maxDistance={5}
      zoomSpeed={0.8}
      rotateSpeed={0.5}
      autoRotate={!frozen}
      autoRotateSpeed={0.2}
    />
  );
}
