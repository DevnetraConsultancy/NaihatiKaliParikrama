"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useI18n } from "@/components/LanguageProvider";
import { useGeolocation } from "@/lib/hooks";
import {
  CompassIcon,
  MapIcon,
  MinusIcon,
  NavigationIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  TempleIcon,
} from "@/components/Icons";
import pandalsSeed from "@/data/pandals.seed.json";

export interface Pandal3D {
  slug: string;
  name_en: string;
  name_bn: string;
  category: "heritage" | "large" | "popular";
  area_bn: string;
  lat: number;
  lng: number;
  featured?: boolean;
}

export interface Custom3DMarker {
  id: string;
  lat: number;
  lng: number;
  title_bn: string;
  title_en: string;
  kind?: string;
}

const ALL_PANDALS = (pandalsSeed.pandals ?? []) as Pandal3D[];

/**
 * Exact geographic bounds of the stitched high-definition Naihati map
 * (1792 x 2304 pixels from OpenStreetMap cartography)
 */
export const MAP_BOUNDS = {
  west: 88.4014892578125,
  east: 88.43994140625,
  north: 22.91286328803374,
  south: 22.867317960075596,
};

const MAP_WIDTH = 20;
const MAP_DEPTH = 25.714; // exact 1792 x 2304 aspect ratio
const BLOCK_THICKNESS = 1.6;

/**
 * Projects any real-world (lat, lng) to the 3D terrain diorama coordinate space
 */
export function geoTo3D(lat: number, lng: number): [number, number] {
  const normX = (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
  const normZ = (lat - MAP_BOUNDS.south) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
  const x = (normX - 0.5) * MAP_WIDTH;
  const z = -(normZ - 0.5) * MAP_DEPTH;
  return [x, z];
}

/**
 * Elegant dark architectural side strata texture for the museum diorama slab
 */
function createSideStrataTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark slate base
  ctx.fillStyle = "#16131c";
  ctx.fillRect(0, 0, 512, 128);

  // Subtle architectural terracotta / granite strata lines
  const lines = [
    { y: 8, h: 4, c: "#281a17" },
    { y: 24, h: 6, c: "#3a221b" },
    { y: 45, h: 5, c: "#201824" },
    { y: 68, h: 7, c: "#341d18" },
    { y: 92, h: 5, c: "#1b1722" },
    { y: 110, h: 6, c: "#2a1e1a" },
  ];
  for (const l of lines) {
    ctx.fillStyle = l.c;
    ctx.fillRect(0, l.y, 512, l.h);
    ctx.fillStyle = "rgba(245, 199, 106, 0.05)";
    ctx.fillRect(0, l.y, 512, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Builds the 3D pin featuring the circular Maa Kali portrait medallion
 */
function createPandalPin(
  pandal: Pandal3D,
  kaliTexture: THREE.Texture,
  boroMaaTexture: THREE.Texture
): THREE.Group {
  const isDivine = pandal.slug === "naihati-boromaa-kali-puja" || pandal.featured;
  const pinGroup = new THREE.Group();
  pinGroup.userData = { pandal };

  const [x, z] = geoTo3D(pandal.lat, pandal.lng);
  pinGroup.position.set(x, 0.05, z);

  // 1. Golden base ring on the terrain
  const baseRadius = isDivine ? 0.65 : 0.38;
  const baseGeo = new THREE.RingGeometry(0.08, baseRadius, 20);
  const baseMat = new THREE.MeshBasicMaterial({
    color: isDivine ? 0xf5c76a : 0xffe6a8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.rotation.x = -Math.PI / 2;
  pinGroup.add(baseMesh);

  // 2. Slender golden spire stem
  const stemHeight = isDivine ? 1.7 : 1.25;
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, stemHeight, 8);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xf5c76a,
    metalness: 0.85,
    roughness: 0.25,
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemHeight / 2;
  stem.castShadow = true;
  pinGroup.add(stem);

  // 3. Billboarded Medallion Head (always faces the user's camera)
  const billboard = new THREE.Group();
  billboard.position.y = stemHeight + (isDivine ? 0.55 : 0.4);
  pinGroup.add(billboard);
  pinGroup.userData.billboard = billboard;

  const headRadius = isDivine ? 0.65 : 0.45;

  // Front face: circular portrait of Maa Kali
  const frontGeo = new THREE.CircleGeometry(headRadius, 32);
  const frontMat = new THREE.MeshBasicMaterial({
    map: isDivine ? boroMaaTexture : kaliTexture,
    side: THREE.FrontSide,
  });
  const frontMesh = new THREE.Mesh(frontGeo, frontMat);
  billboard.add(frontMesh);

  // Outer golden bezel ring
  const ringGeo = new THREE.RingGeometry(headRadius * 0.96, headRadius * 1.15, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: isDivine ? 0xffe6a8 : 0xf5c76a,
    emissive: isDivine ? 0xd97706 : 0x78350f,
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.2,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.z = 0.005;
  billboard.add(ringMesh);

  // Solid gold backing
  const backGeo = new THREE.CircleGeometry(headRadius * 1.15, 32);
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xb8860b,
    metalness: 0.8,
    roughness: 0.3,
    side: THREE.BackSide,
  });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  billboard.add(backMesh);

  if (isDivine) {
    // 4. DIVINE BORO MAA SPECIAL FEATURES:
    // Ornate Golden Mukut (Crown)
    const crownGroup = new THREE.Group();
    crownGroup.position.y = headRadius * 1.05;

    // Center tall crown pinnacle
    const centerPinnacle = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.72, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        metalness: 0.9,
      })
    );
    centerPinnacle.position.y = 0.36;
    crownGroup.add(centerPinnacle);

    // Left crown pinnacle
    const leftPinnacle = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.46, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8 })
    );
    leftPinnacle.position.set(-0.25, 0.23, 0);
    crownGroup.add(leftPinnacle);

    // Right crown pinnacle
    const rightPinnacle = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.46, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8 })
    );
    rightPinnacle.position.set(0.25, 0.23, 0);
    crownGroup.add(rightPinnacle);

    // Ruby gem crest
    const ruby = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    ruby.position.set(0, 0.22, 0.08);
    crownGroup.add(ruby);

    billboard.add(crownGroup);

    // Radiating Golden Sunburst Halo Ring
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(headRadius * 1.45, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe6a8 })
    );
    halo.name = "divineHalo";
    billboard.add(halo);

    // Heavenly warm point light
    const spot = new THREE.PointLight(0xf5c76a, 3.2, 7);
    spot.position.set(0, 0.5, 0.4);
    billboard.add(spot);
  }

  return pinGroup;
}

/**
 * Builds the live 3D User GPS Location Beacon
 */
function createUserBeacon(): THREE.Group {
  const group = new THREE.Group();
  group.name = "userBeacon";

  // 1. Pulsing surface ripple ring
  const rippleGeo = new THREE.RingGeometry(0.2, 0.75, 24);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.name = "userRipple";
  group.add(ripple);

  // 2. GPS Core Sphere
  const coreGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8,
    metalness: 0.3,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.35;
  group.add(core);

  // 3. Slender stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  );
  stem.position.y = 0.35;
  group.add(stem);

  // 4. Floating "YOU" badge billboard
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#2563eb";
    ctx.roundRect(4, 4, 120, 40, 20);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("আপনি", 64, 25);
  }
  const badgeTex = new THREE.CanvasTexture(canvas);
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex }));
  badge.scale.set(1.4, 0.55, 1);
  badge.position.y = 1.05;
  group.add(badge);

  return group;
}

export interface Naihati3DMapHeroProps {
  customMarkers?: Custom3DMarker[];
}

export default function Naihati3DMapHero({ customMarkers = [] }: Naihati3DMapHeroProps) {
  const { lang } = useI18n();
  const geo = useGeolocation(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pinMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const userBeaconRef = useRef<THREE.Group | null>(null);

  const [compassAngle, setCompassAngle] = useState(0);
  const [selectedPandal, setSelectedPandal] = useState<Pandal3D | null>(
    ALL_PANDALS.find((p) => p.slug === "naihati-boromaa-kali-puja") ?? ALL_PANDALS[0] ?? null
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // ------------------------------------------------------------- 3D Scene Init
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Isometric elevated view facing North-East
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 24, 26);
    cameraRef.current = camera;

    // 3. Renderer with high pixel ratio and sharp antialiasing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Smooth OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go beneath the slab
    controls.minDistance = 9;
    controls.maxDistance = 46;
    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf5, 1.8);
    sunLight.position.set(15, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // River fill light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fillLight.position.set(-20, 15, -10);
    scene.add(fillLight);

    // 6. BUILD THE CRYSTAL-CLEAR ENTIRE NAIHATI MAP DIORAMA SLAB
    const textureLoader = new THREE.TextureLoader();
    const mapTexture = textureLoader.load("/naihati-osm-hd.webp");
    mapTexture.generateMipmaps = true;
    mapTexture.minFilter = THREE.LinearMipmapLinearFilter;
    mapTexture.magFilter = THREE.LinearFilter;
    if (renderer.capabilities.getMaxAnisotropy) {
      mapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const sideTexture = createSideStrataTexture();

    // Box Materials: [right, left, top, bottom, front, back]
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTexture,
      roughness: 0.9,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: mapTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a12,
      roughness: 0.95,
    });

    const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    const slabGeo = new THREE.BoxGeometry(MAP_WIDTH, BLOCK_THICKNESS, MAP_DEPTH);
    const slabMesh = new THREE.Mesh(slabGeo, materials);
    slabMesh.position.y = -BLOCK_THICKNESS / 2;
    slabMesh.receiveShadow = true;
    scene.add(slabMesh);

    // Thin golden decorative frame line around the top border
    const frameGeo = new THREE.EdgesGeometry(slabGeo);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0xf5c76a,
      linewidth: 1,
      transparent: true,
      opacity: 0.65,
    });
    const frameLine = new THREE.LineSegments(frameGeo, frameMat);
    frameLine.position.y = -BLOCK_THICKNESS / 2;
    scene.add(frameLine);

    // Drop shadow plane underneath
    const groundGeo = new THREE.PlaneGeometry(MAP_WIDTH * 1.5, MAP_DEPTH * 1.5);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -BLOCK_THICKNESS - 0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // 7. Load Textures for Maa Kali & Boro Maa Pins
    const kaliTexture = textureLoader.load("/kali-pin.jpg");
    const boroMaaTexture = textureLoader.load("/boro-maa-emblem.png");

    // 8. Generate 3D Pandal Pins across all 28 locations
    const pinMeshes = new Map<string, THREE.Group>();
    for (const pandal of ALL_PANDALS) {
      const pinGroup = createPandalPin(pandal, kaliTexture, boroMaaTexture);
      scene.add(pinGroup);
      pinMeshes.set(pandal.slug, pinGroup);
    }
    pinMeshesRef.current = pinMeshes;

    // 9. Add User Location Beacon
    const userBeacon = createUserBeacon();
    userBeacon.visible = false;
    scene.add(userBeacon);
    userBeaconRef.current = userBeacon;

    // 10. Pointer Tap / Click Raycasting for Pandals
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClickOrTouch = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allObjects: THREE.Object3D[] = [];
      for (const group of pinMeshes.values()) {
        group.traverse((c) => {
          if (c instanceof THREE.Mesh) allObjects.push(c);
        });
      }

      const intersects = raycaster.intersectObjects(allObjects, false);
      if (intersects.length > 0) {
        let parent = intersects[0].object.parent;
        while (parent && !parent.userData?.pandal) {
          parent = parent.parent;
        }
        if (parent?.userData?.pandal) {
          setSelectedPandal(parent.userData.pandal as Pandal3D);
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      handleClickOrTouch(e.clientX, e.clientY);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    // 11. Animation Loop: Billboards face camera + Halo rotation + Compass angle
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Billboards always face the user's camera
      for (const group of pinMeshes.values()) {
        if (group.userData?.billboard) {
          group.userData.billboard.quaternion.copy(camera.quaternion);
        }
      }

      // Rotate Boro Maa divine halo
      const boroMaaGroup = pinMeshes.get("naihati-boromaa-kali-puja");
      if (boroMaaGroup) {
        const halo = boroMaaGroup.getObjectByName("divineHalo");
        if (halo) {
          halo.rotation.z = elapsed * 1.2;
        }
      }

      // Animate User Beacon pulse
      if (userBeacon.visible) {
        const ripple = userBeacon.getObjectByName("userRipple");
        if (ripple) {
          const s = 1 + (Math.sin(elapsed * 3) + 1) * 0.25;
          ripple.scale.set(s, s, s);
        }
      }

      // Calculate azimuth angle for dynamic Compass North indicator
      const angle = Math.atan2(
        camera.position.x - controls.target.x,
        camera.position.z - controls.target.z
      );
      setCompassAngle(angle);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 12. Responsive Resize
    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      pinMeshes.clear();
      scene.clear();
    };
  }, []);

  // Update Live User GPS Location on the 3D map
  useEffect(() => {
    const beacon = userBeaconRef.current;
    if (!beacon) return;

    if (geo.position) {
      const [ux, uz] = geoTo3D(geo.position.lat, geo.position.lng);
      beacon.position.set(ux, 0.05, uz);
      beacon.visible = true;
    } else {
      beacon.visible = false;
    }
  }, [geo.position]);

  // Filter 3D pins visibility by category
  useEffect(() => {
    for (const [slug, group] of pinMeshesRef.current.entries()) {
      const pandal = group.userData?.pandal as Pandal3D | undefined;
      if (!pandal) continue;
      const isVisible =
        activeCategory === "all" ||
        pandal.category === activeCategory ||
        pandal.slug === "naihati-boromaa-kali-puja";
      group.visible = isVisible;
    }
  }, [activeCategory]);

  // Reset 3D camera to true North isometric view
  const handleResetToNorth = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(0, 24, 26);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const handleZoom = (direction: "in" | "out") => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const factor = direction === "in" ? 0.8 : 1.25;
    camera.position.multiplyScalar(factor);
    controls.update();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-[#18092a] via-[#0f061b] to-[#07050e] shadow-2xl shadow-black/80">
      {/* Top Banner & Category Filter Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2.5 backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
          </span>
          <span className="text-[12.5px] font-bold tracking-wide text-gold">
            {lang === "bn" ? "নৈহাটি সমগ্র পরিক্রমা ম্যাপ" : "Naihati 3D Parikrama Map"}
          </span>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "all", bn: "সব (২৮)", en: "All (28)" },
            { id: "heritage", bn: "ঐতিহ্যবাহী", en: "Heritage" },
            { id: "large", bn: "বড় বাজেট", en: "Large" },
            { id: "popular", bn: "জনপ্রিয়", en: "Popular" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`liquid-press rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors ${
                activeCategory === cat.id
                  ? "bg-gold text-ink"
                  : "border border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              {lang === "bn" ? cat.bn : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------- Three.js 3D Interactive Canvas -------------------- */}
      <div className="relative aspect-[16/11] w-full touch-none select-none sm:aspect-[16/9] min-h-[350px]">
        {/* 3D WebGL Canvas Container */}
        <div ref={containerRef} className="size-full cursor-grab active:cursor-grabbing" />

        {/* ---------------- Sleek Professional Compass North Indicator ---------------- */}
        <div className="absolute top-3 left-3 z-20">
          <button
            type="button"
            onClick={handleResetToNorth}
            className="liquid-press flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md transition-all hover:border-gold/60 hover:bg-black/80"
            title="Click to reset North"
            aria-label="Compass pointing North"
          >
            {/* Dynamic rotating compass needle */}
            <div
              className="size-5 transition-transform duration-75"
              style={{ transform: `rotate(${-compassAngle}rad)` }}
            >
              <svg viewBox="0 0 24 24" className="size-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10.5" stroke="#f5c76a" strokeWidth="1.2" opacity="0.6" />
                {/* Red North Needle */}
                <polygon points="12,3 15,12 12,10 9,12" fill="#ef4444" />
                {/* White South Needle */}
                <polygon points="12,21 15,12 12,10 9,12" fill="#e2e8f0" opacity="0.85" />
                <circle cx="12" cy="12" r="1.5" fill="#f5c76a" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-white/90 tracking-wider">N</span>
          </button>
        </div>

        {/* 3D Camera Floating Control Buttons */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleResetToNorth}
            className="liquid-press grid size-8 place-items-center rounded-xl border border-white/20 bg-ink/80 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            title="Reset North view"
            aria-label="Reset North view"
          >
            <RotateCcwIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom("in")}
            className="liquid-press grid size-8 place-items-center rounded-xl border border-white/20 bg-ink/80 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <PlusIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom("out")}
            className="liquid-press grid size-8 place-items-center rounded-xl border border-white/20 bg-ink/80 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <MinusIcon size={14} />
          </button>
        </div>

        {/* ---------------- Selected Pandal Quick Card ---------------- */}
        {selectedPandal ? (
          <div className="absolute right-3 bottom-3 left-3 z-30 rounded-2xl border border-gold/45 bg-[#0e071a]/95 p-3 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-gold" />
                  <span className="truncate text-[13.5px] font-bold text-white">
                    {lang === "bn" ? selectedPandal.name_bn : selectedPandal.name_en}
                  </span>
                  {selectedPandal.slug === "naihati-boromaa-kali-puja" ? (
                    <span className="rounded-full border border-gold/50 bg-gold/20 px-1.5 py-0.2 text-[9.5px] font-bold text-gold">
                      {lang === "bn" ? "ঐতিহাসিক বড়মা" : "Divine Boro Maa"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] text-white/70">
                      {selectedPandal.category}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/60">
                  {lang === "bn" ? selectedPandal.area_bn : selectedPandal.name_en}
                </p>
              </div>

              <Link
                href={`/map?pandal=${selectedPandal.slug}&route=1`}
                className="liquid-press shrink-0 flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-2 text-[12px] font-bold text-ink shadow-lg shadow-gold/30 hover:bg-gold/90 transition-transform active:scale-95"
              >
                <NavigationIcon size={13} className="stroke-ink" />
                <span>{lang === "bn" ? "পথ দেখাও" : "Route"}</span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* -------------------- Quick Access Action Bar -------------------- */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/50 p-3">
        <Link
          href="/map"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl bg-gold py-2.5 px-2 text-ink shadow-lg shadow-gold/25 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <MapIcon size={17} className="stroke-ink" />
          <span className="text-[12px] font-bold leading-tight">
            {lang === "bn" ? "লাইভ ম্যাপ" : "Live Map"}
          </span>
        </Link>

        <Link
          href="/pandals"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10 transition-transform active:scale-95"
        >
          <TempleIcon size={17} className="stroke-white/80" />
          <span className="text-[12px] font-medium leading-tight">
            {lang === "bn" ? "২৮টি প্যান্ডেল" : "28 Pandals"}
          </span>
        </Link>

        <Link
          href="/help"
          className="liquid-press flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/5 py-2.5 px-2 text-white/90 hover:bg-white/10 transition-transform active:scale-95"
        >
          <ShieldAlertIcon size={17} className="stroke-white/80" />
          <span className="text-[12px] font-medium leading-tight">
            {lang === "bn" ? "সাহায্য ও জরুরি" : "Help & Safety"}
          </span>
        </Link>
      </div>
    </div>
  );
}
