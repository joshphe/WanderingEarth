"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, useGLTF } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { latLonToVector3 } from "@/lib/utils";
import * as THREE from "three";

// ── Constants ──

const LEG_DURATION = 1.8; // seconds per flight leg
const ARC_HEIGHT = 1.4; // control point radius for arc curves

// ── Arc computation ──

function computeArc(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): THREE.QuadraticBezierCurve3 {
  const start = new THREE.Vector3(
    ...latLonToVector3(startLat, startLng, 1.04)
  );
  const end = new THREE.Vector3(...latLonToVector3(endLat, endLng, 1.04));
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const control = mid.normalize().multiplyScalar(ARC_HEIGHT);
  return new THREE.QuadraticBezierCurve3(start, control, end);
}

// ── GLB airplane model ──

function PlaneModel() {
  const { scene } = useGLTF("/models/airplane.glb");
  // Clone to avoid mutating the cached original
  const cloned = useMemo(() => scene.clone(), [scene]);
  return (
    <group scale={[0.06, 0.06, 0.06]}>
      <primitive object={cloned} />
      {/* Glow light */}
      <pointLight intensity={0.8} distance={0.15} color="#60a5fa" />
    </group>
  );
}

// ── Start/End markers ──

function PinMarker({
  lat,
  lng,
  color,
}: {
  lat: number;
  lng: number;
  color: string;
}) {
  const [x, y, z] = latLonToVector3(lat, lng, 1.05);
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.014, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ── Main component ──

export function FlightTour() {
  const pins = useEarthStore((s) => s.pins);
  const tourPhase = useEarthStore((s) => s.tourPhase);
  const { camera } = useThree();

  // Sort pins by createdAt ascending (earliest first)
  const sortedPins = useMemo(() => {
    return [...pins]
      .filter((p) => p.photoCount > 0)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [pins]);

  // Pre-compute all arc curves once sortedPins is stable
  const allArcs = useMemo(() => {
    if (sortedPins.length < 2) return [];
    const arcs: THREE.QuadraticBezierCurve3[] = [];
    for (let i = 0; i < sortedPins.length - 1; i++) {
      const a = sortedPins[i];
      const b = sortedPins[i + 1];
      arcs.push(computeArc(a.lat, a.lng, b.lat, b.lng));
    }
    return arcs;
  }, [sortedPins]);

  // Animation state (refs to avoid per-frame React re-renders)
  const legIndexRef = useRef(0);
  const legProgressRef = useRef(0);
  const planeRef = useRef<THREE.Group>(null);
  const isFlyingRef = useRef(false);
  const isMovingRef = useRef(false); // plane moves along arc (separate from tracking)
  const isSettlingRef = useRef(false); // smooth X→0 transition after tour ends
  const settleTimerRef = useRef(0);
  const SETTLE_DURATION = 0.8; // seconds to blend X rotation back to 0

  // Camera zoom-in on tour start
  const zoomingRef = useRef(false);
  const zoomTimerRef = useRef(0);
  const zoomStartDistRef = useRef(0);
  const ZOOM_DURATION = 1.2;
  const ZOOM_TARGET_DIST = 2.5;

  // Completed arc count (drives rendering)
  const [completedCount, setCompletedCount] = useState(0);

  // ── Lifecycle: respond to tourPhase changes ──

  useEffect(() => {
    if (tourPhase === "flying" && sortedPins.length >= 2) {
      // Reset animation state
      legIndexRef.current = 0;
      legProgressRef.current = 0;
      setCompletedCount(0);
      isMovingRef.current = false;
      isSettlingRef.current = false;
      settleTimerRef.current = 0;

      // Position plane at the first pin
      if (planeRef.current && allArcs.length > 0) {
        planeRef.current.position.copy(allArcs[0].getPoint(0));
      }

      // Set tourTargetY non-null so Earth.tsx knows to skip auto-rotation.
      // Initial centering is handled by the useFrame quaternion tracking.
      const store = useEarthStore.getState();
      store.setTourTargetY(0);
      store.setTourTargetQ({ x: 0, y: 0, z: 0, w: 1 }); // identity quaternion

      // Start tracking immediately
      isFlyingRef.current = true;

      // Phase 2 (0.5s): camera zooms in while Earth holds position
      const zoomTimer = setTimeout(() => {
        const currentDist = camera.position.length();
        if (currentDist > ZOOM_TARGET_DIST + 0.05) {
          zoomStartDistRef.current = currentDist;
          zoomTimerRef.current = 0;
          zoomingRef.current = true;
        }
      }, 500);

      // Phase 3 (2.0s): plane starts flying — Earth already centered, zoom finishing
      const planeTimer = setTimeout(() => {
        isMovingRef.current = true;
      }, 2000);

      return () => {
        clearTimeout(zoomTimer);
        clearTimeout(planeTimer);
      };
    } else if (tourPhase === "idle") {
      // Reset everything
      isFlyingRef.current = false;
      isMovingRef.current = false;
      isSettlingRef.current = false;
      settleTimerRef.current = 0;
      zoomingRef.current = false;
      zoomTimerRef.current = 0;
      legIndexRef.current = 0;
      legProgressRef.current = 0;
      setCompletedCount(0);
      useEarthStore.getState().setTourTargetX(null);
      useEarthStore.getState().setTourTargetY(null);
      useEarthStore.getState().setTourTargetQ(null);
    }
  }, [tourPhase, sortedPins, allArcs, camera]);

  // ── useFrame animation loop ──

  useFrame((_, delta) => {
    if (!isFlyingRef.current) return;
    if (allArcs.length === 0) return;
    if (!planeRef.current) return;

    const legIndex = legIndexRef.current;
    let justFinished = false;

    // ── Camera zoom-in on tour start ──
    if (zoomingRef.current) {
      zoomTimerRef.current += delta;
      const zt = Math.min(zoomTimerRef.current / ZOOM_DURATION, 1.0);
      const eased = zt < 0.5 ? 2 * zt * zt : 1 - Math.pow(-2 * zt + 2, 2) / 2;
      const dist = zoomStartDistRef.current + (ZOOM_TARGET_DIST - zoomStartDistRef.current) * eased;
      camera.position.normalize().multiplyScalar(dist);
      if (zt >= 1.0) zoomingRef.current = false;
    }

    // ── Move plane along arcs (only after camera settles) ──
    if (isMovingRef.current && legIndex < allArcs.length) {
      legProgressRef.current += delta / LEG_DURATION;

      if (legProgressRef.current >= 1.0) {
        setCompletedCount(legIndex + 1);
        legIndexRef.current++;
        legProgressRef.current = 0;

        if (legIndexRef.current >= allArcs.length) {
          justFinished = true;
        } else {
          const nextCurve = allArcs[legIndexRef.current];
          planeRef.current.position.copy(nextCurve.getPoint(0));
        }
      } else {
        const curve = allArcs[legIndex];
        const point = curve.getPoint(legProgressRef.current);
        planeRef.current.position.copy(point);

        const tangent = curve.getTangent(legProgressRef.current).normalize();
        // Align the model's forward direction to the tangent.
        // Default GLB forward is +Z (Three.js convention).
        // If your model faces a different direction, change the first vector:
        //   Blender export: (0, 0, -1) or (0, -1, 0)
        //   Try these common values until the plane points nose-forward.
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(-1, 0, 0),  // model nose faces -X
          tangent
        );
        planeRef.current.quaternion.copy(quat);
      }
    }

    // ── Transition to settle phase when tour finishes ──
    if (justFinished) {
      isMovingRef.current = false;
      isSettlingRef.current = true;
      settleTimerRef.current = 0;
    }

    // ── Settle phase: slerp from full correction toward Y-only ──
    if (isSettlingRef.current) {
      settleTimerRef.current += delta;
      const t = Math.min(settleTimerRef.current / SETTLE_DURATION, 1.0);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const planeLocal = planeRef.current.position;
      const planeLocalDir = planeLocal.clone().normalize();

      const originToCamera = new THREE.Vector3()
        .copy(camera.position)
        .normalize();

      // Full target: azimuth + elevation correction
      const fullTargetQ = new THREE.Quaternion().setFromUnitVectors(planeLocalDir, originToCamera);

      // Y-only target: project onto XZ plane → azimuth correction only
      const planeXZ = new THREE.Vector3(planeLocal.x, 0, planeLocal.z);
      const camXZ = new THREE.Vector3(camera.position.x, 0, camera.position.z);
      const yOnlyQ = (planeXZ.lengthSq() > 0 && camXZ.lengthSq() > 0)
        ? new THREE.Quaternion().setFromUnitVectors(planeXZ.normalize(), camXZ.normalize())
        : new THREE.Quaternion(); // identity fallback

      const blendedQ = new THREE.Quaternion().slerpQuaternions(fullTargetQ, yOnlyQ, eased);

      const store = useEarthStore.getState();
      store.setTourTargetQ({ x: blendedQ.x, y: blendedQ.y, z: blendedQ.z, w: blendedQ.w });

      if (t >= 1.0) {
        isSettlingRef.current = false;
        isFlyingRef.current = false;
        store.setTourTargetX(null);
        store.setTourTargetY(null);
        store.setTourTargetQ(null);
      }
      return;
    }

    // ── Normal tracking: compute ABSOLUTE Earth quaternion ──
    {
      const planeLocalDir = planeRef.current.position.clone().normalize();
      // Align plane to face the CAMERA (origin → camera direction).
      // Camera is at +Z looking at origin, so the visible face is +Z.
      // We need planeWorldDir = +cameraPos, NOT -cameraPos.
      const originToCamera = new THREE.Vector3()
        .copy(camera.position)
        .normalize();

      const targetQ = new THREE.Quaternion().setFromUnitVectors(planeLocalDir, originToCamera);

      const store = useEarthStore.getState();
      store.setTourTargetQ({ x: targetQ.x, y: targetQ.y, z: targetQ.z, w: targetQ.w });
    }
  });

  // ── Render ──

  if (tourPhase === "idle") return null;
  if (sortedPins.length < 2) return null;

  const allDone = completedCount >= allArcs.length;

  return (
    <>
      {/* Completed arc trails */}
      {allArcs.slice(0, completedCount).map((curve, i) => (
        <Line
          key={`arc-${i}`}
          points={curve.getPoints(40)}
          color="#60a5fa"
          lineWidth={2.5}
          transparent
          opacity={0.55}
        />
      ))}

      {/* Current in-progress arc (dashed preview) */}
      {!allDone &&
        legIndexRef.current < allArcs.length &&
        (() => {
          const curve = allArcs[legIndexRef.current];
          return (
            <Line
              key="current-arc"
              points={curve.getPoints(40)}
              color="#60a5fa"
              lineWidth={1.5}
              transparent
              opacity={0.2}
              dashed
              dashSize={0.01}
              gapSize={0.01}
            />
          );
        })()}

      {/* Plane model — group ALWAYS mounted to keep ref alive for settle phase */}
      <group ref={planeRef}>
        {!allDone && <PlaneModel />}
      </group>

      {/* Start marker (green dot at first pin) */}
      {sortedPins.length > 0 && (
        <PinMarker
          lat={sortedPins[0].lat}
          lng={sortedPins[0].lng}
          color="#4ade80"
        />
      )}

      {/* End marker (red dot at last pin) — only after all legs complete */}
      {allDone && sortedPins.length > 1 && (
        <PinMarker
          lat={sortedPins[sortedPins.length - 1].lat}
          lng={sortedPins[sortedPins.length - 1].lng}
          color="#f87171"
        />
      )}
    </>
  );
}
