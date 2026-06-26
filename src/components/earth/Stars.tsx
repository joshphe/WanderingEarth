"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Color,
  AdditiveBlending,
} from "three";

/** 创建单层星空 */
function createStarLayer(count: number, minR: number, maxR: number) {
  const geo = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const tintChoices = [
    new Color("#ffffff"), // 纯白
    new Color("#aaccff"), // 蓝白
    new Color("#d4c8ff"), // 紫白
    new Color("#ffe8cc"), // 暖白
    new Color("#c8e8ff"), // 青白
  ];

  for (let i = 0; i < count; i++) {
    const r = minR + Math.random() * (maxR - minR);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const tint = tintChoices[Math.floor(Math.random() * tintChoices.length)];
    // 随机微调亮度 0.7 ~ 1.0
    const brightness = 0.7 + Math.random() * 0.3;
    colors[i * 3] = tint.r * brightness;
    colors[i * 3 + 1] = tint.g * brightness;
    colors[i * 3 + 2] = tint.b * brightness;
  }

  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geo;
}

export function Stars() {
  const layer1Ref = useRef<Points>(null);
  const layer2Ref = useRef<Points>(null);
  const layer3Ref = useRef<Points>(null);

  // 三层星空：密集小星 + 稀疏中星 + 少量亮星
  const layer1Geo = useMemo(() => createStarLayer(2000, 5, 12), []);
  const layer2Geo = useMemo(() => createStarLayer(600, 8, 16), []);
  const layer3Geo = useMemo(() => createStarLayer(80, 6, 14), []);

  useFrame(() => {
    if (layer1Ref.current) {
      layer1Ref.current.rotation.y += 0.0001;
      layer1Ref.current.rotation.x += 0.00005;
    }
    if (layer2Ref.current) {
      layer2Ref.current.rotation.y += 0.00015;
      layer2Ref.current.rotation.x += 0.00008;
    }
    if (layer3Ref.current) {
      layer3Ref.current.rotation.y += 0.0002;
      layer3Ref.current.rotation.x += 0.0001;
    }
  });

  return (
    <>
      {/* 层1: 密集小星 */}
      <points ref={layer1Ref} geometry={layer1Geo}>
        <pointsMaterial
          size={0.012}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      {/* 层2: 稀疏中星 */}
      <points ref={layer2Ref} geometry={layer2Geo}>
        <pointsMaterial
          size={0.025}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      {/* 层3: 少量亮星 */}
      <points ref={layer3Ref} geometry={layer3Geo}>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}
