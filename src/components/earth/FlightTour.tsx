"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEarthStore } from "@/lib/store";
import { latLonToVector3 } from "@/lib/utils";
import * as THREE from "three";

// ── Constants ──

const LEG_DURATION = 1.8; // seconds per flight leg
const ARC_HEIGHT = 1.4; // control point radius for arc curves

// ── Helpers ──

/** Compute the absolute Y rotation closest to `currentY` that is
 *  visually equivalent to `rawDesiredY` (within [-π, π] after normalization).
 *  This avoids spinning — max one-frame change is π (180°). */
function nearestEquivalentY(rawDesiredY: number, currentY: number): number {
  // Normalize raw desired to [-π, π]
  let d = rawDesiredY;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const n = Math.round((currentY - d) / (2 * Math.PI));
  return d + n * 2 * Math.PI;
}

/** Compute the absolute Earth rotation target (X, Y) that centers a point
 *  at the given local position on screen (camera-aligned). */
function computeTarget(
  lx: number, ly: number, lz: number,
  camX: number, camY: number, camZ: number,
  currentEarthY: number
): { targetX: number; targetY: number } {
  const camAz = Math.atan2(camX, camZ);
  const camEl = Math.atan2(camY, Math.sqrt(camX * camX + camZ * camZ));
  const localAz = Math.atan2(lx, lz);
  const localEl = Math.atan2(ly, Math.sqrt(lx * lx + lz * lz));
  return {
    targetX: camEl - localEl,
    targetY: nearestEquivalentY(camAz - localAz, currentEarthY),
  };
}

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

// ── Simple geometric plane model ──

function PlaneModel() {
  return (
    <group scale={[0.7, 0.7, 0.7]}>
      {/* Fuselage — cone pointing along +Z */}
      <mesh position={[0, 0, 0.03]}>
        <coneGeometry args={[0.015, 0.05, 6]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      {/* Wings */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[0.04, 0.002, 0.012]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>
      {/* Tail fin */}
      <mesh position={[0, 0.008, -0.015]}>
        <boxGeometry args={[0.001, 0.01, 0.008]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>
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

      // Compute initial absolute Earth rotation — snaps the first pin to
      // screen center in one frame (max rotation: π / 180°)
      const first = sortedPins[0];
      const [lx, ly, lz] = latLonToVector3(first.lat, first.lng, 1.04);
      const store = useEarthStore.getState();
      const camDir = camera.position.clone().normalize();
      const target = computeTarget(
        lx, ly, lz,
        camDir.x, camDir.y, camDir.z,
        store.earthRotation
      );
      store.setTourTargetX(target.targetX);
      store.setTourTargetY(target.targetY);

      // Start tracking immediately (Earth rotates to center the first pin).
      // No camera fly-to — the Earth tracking handles centering itself.
      // Camera fly-to uses earthRotation which is stale at this point
      // (Earth.tsx hasn't applied the new rotation yet), causing wrong
      // fly targets on subsequent tours.
      isFlyingRef.current = true;

      // Start moving the plane after camera settles
      const timer = setTimeout(() => {
        isMovingRef.current = true;
      }, 1500);

      return () => clearTimeout(timer);
    } else if (tourPhase === "idle") {
      // Reset everything
      isFlyingRef.current = false;
      isMovingRef.current = false;
      isSettlingRef.current = false;
      settleTimerRef.current = 0;
      legIndexRef.current = 0;
      legProgressRef.current = 0;
      setCompletedCount(0);
      useEarthStore.getState().setTourTargetX(null);
      useEarthStore.getState().setTourTargetY(null);
    }
  }, [tourPhase, sortedPins, allArcs, camera]);

  // ── useFrame animation loop ──

  // Reusable temp vector for camera direction
  const _camDir = new THREE.Vector3();

  useFrame((_, delta) => {
    if (!isFlyingRef.current) return;
    if (allArcs.length === 0) return;
    if (!planeRef.current) return;

    const legIndex = legIndexRef.current;
    let justFinished = false;

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
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
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

    // ── Settle phase: smoothly blend rotation.x back to 0 ──
    if (isSettlingRef.current) {
      settleTimerRef.current += delta;
      const t = Math.min(settleTimerRef.current / SETTLE_DURATION, 1.0);
      // ease-in-out quad
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      _camDir.copy(camera.position).normalize();
      const pos = planeRef.current.position;
      const store = useEarthStore.getState();
      const target = computeTarget(
        pos.x, pos.y, pos.z,
        _camDir.x, _camDir.y, _camDir.z,
        store.earthRotation
      );
      // Blend X toward 0 while keeping Y tracking the plane
      store.setTourTargetX(target.targetX * (1 - eased));
      store.setTourTargetY(target.targetY);

      if (t >= 1.0) {
        // Settle complete: stop tracking → Earth auto-rotates,
        // OrbitControls re-enable. tourPhase stays "flying" so
        // arcs persist until user clicks Stop.
        isSettlingRef.current = false;
        isFlyingRef.current = false;
        store.setTourTargetX(null);
        store.setTourTargetY(null);
      }
      return;
    }

    // ── Normal tracking: set absolute Earth rotation to center the plane ──
    _camDir.copy(camera.position).normalize();
    const pos = planeRef.current.position;
    const store = useEarthStore.getState();
    const target = computeTarget(
      pos.x, pos.y, pos.z,
      _camDir.x, _camDir.y, _camDir.z,
      store.earthRotation
    );
    store.setTourTargetX(target.targetX);
    store.setTourTargetY(target.targetY);
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

      {/* Plane model */}
      {!allDone && (
        <group ref={planeRef}>
          <PlaneModel />
        </group>
      )}

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
