"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Earth } from "./Earth";
import { Atmosphere } from "./Atmosphere";
import { Stars } from "./Stars";
import { LocationPins } from "./LocationPins";
import { CameraController } from "./CameraController";
function FallbackEarth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#1a3a5c" wireframe />
    </mesh>
  );
}

export function EarthCanvas() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{
          antialias: false,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        onCreated={(state) => {
          state.gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 3, 5]} intensity={2.0} />
        <directionalLight position={[-3, -1, -5]} intensity={0.9} />

        <Suspense fallback={<FallbackEarth />}>
          <Earth>
            <LocationPins />
          </Earth>
          <Atmosphere />
        </Suspense>

        <Stars />
        <CameraController />
      </Canvas>
    </div>
  );
}
