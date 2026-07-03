"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Earth } from "./Earth";
import { Atmosphere } from "./Atmosphere";
import { Stars } from "./Stars";
import { LocationPins } from "./LocationPins";
import { FlightTour } from "./FlightTour";
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
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      className="absolute inset-0 z-0"
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{
          antialias: false,
          alpha: true,
          preserveDrawingBuffer: false,
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
            <FlightTour />
          </Earth>
          <Atmosphere />
        </Suspense>

        <Stars />
        <CameraController />
      </Canvas>
    </motion.div>
  );
}
