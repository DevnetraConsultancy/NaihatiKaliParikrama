"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useI18n } from "@/components/LanguageProvider";
import {
  CarIcon,
  CompassIcon,
  MapIcon,
  MapPinIcon,
  MinusIcon,
  NavigationIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  TempleIcon,
  TrainIcon,
  WalkIcon,
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

const ALL_PANDALS = (pandalsSeed.pandals ?? []) as Pandal3D[];

// Bounding box of Naihati pandals
const MIN_LAT = 22.869;
const MAX_LAT = 22.893;
const MIN_LNG = 88.404; // River Hooghly on the west
const MAX_LNG = 88.435; // Kalyani Expressway on the east

function geoTo3D(lat: number, lng: number): [number, number] {
  const normX = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG); // 0 (west) to 1 (east)
  const normZ = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT); // 0 (north) to 1 (south)
  const x = (normX - 0.5) * 17; // -8.5 to +8.5
  const z = (normZ - 0.5) * 17; // -8.5 to +8.5
  return [x, z];
}

/**
 * Creates a procedural geological rock strata texture for the cutaway sides
 * of the 3D terrain block, matching the realistic sediment layers on 3d-mapper.com
 */
function createStrataTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const bands = [
    { y: 0, h: 25, color: "#453229" },   // Topsoil
    { y: 25, h: 35, color: "#8a482b" },  // Terracotta clay
    { y: 60, h: 45, color: "#b5693d" },  // Warm sandstone
    { y: 105, h: 20, color: "#d99b66" }, // Silt & quartz
    { y: 125, h: 50, color: "#7a371c" }, // Deep ferruginous red
    { y: 175, h: 30, color: "#9e5330" }, // Weathered sediment
    { y: 205, h: 51, color: "#362218" }, // Basal dark bedrock
  ];

  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.fillRect(0, b.y, 512, b.h);

    // Subtle horizontal bedding lines
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, b.y + b.h - 2, 512, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(0, b.y + 1, 512, 1);
  }

  // Add subtle organic grain
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, Math.random() * 8 + 2, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export default function Naihati3DMapHero() {
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pinMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  const [selectedPandal, setSelectedPandal] = useState<Pandal3D | null>(
    ALL_PANDALS.find((p) => p.slug === "naihati-boromaa-kali-puja") ?? ALL_PANDALS[0] ?? null
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isRotating, setIsRotating] = useState(true);

  // ------------------------------------------------------------- 3D Scene Init
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Isometric elevation (45 deg)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(16, 17, 21);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and high pixel ratio
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

    // 4. Smooth OrbitControls (rotate, zoom, pan like 3d-mapper.com)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go beneath the terrain
    controls.minDistance = 10;
    controls.maxDistance = 46;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ea, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(22, 35, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Warm golden fill light from the west (river reflections)
    const riverLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    riverLight.position.set(-20, 15, -10);
    scene.add(riverLight);

    // 6. Build the 3D Cutaway Terrain Block (20x20 surface, 3.2 depth)
    const strataTexture = createStrataTexture();
    const textureLoader = new THREE.TextureLoader();
    const topTexture = textureLoader.load("/naihati-3d-model.webp");
    topTexture.generateMipmaps = true;
    topTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const blockWidth = 20;
    const blockDepth = 20;
    const blockHeight = 3.2;

    const sideMat = new THREE.MeshStandardMaterial({
      map: strataTexture,
      roughness: 0.9,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTexture,
      roughness: 0.75,
      metalness: 0.1,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: 0x1a120c,
      roughness: 0.95,
    });

    // Box materials order: [right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)]
    const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    const blockGeo = new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth);
    const terrainBlock = new THREE.Mesh(blockGeo, materials);
    terrainBlock.position.y = -blockHeight / 2;
    terrainBlock.receiveShadow = true;
    scene.add(terrainBlock);

    // 7. Base ground shadow ring
    const groundGeo = new THREE.PlaneGeometry(36, 36);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -blockHeight - 0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // 8. 3D Floating Clouds
    const cloudGeo = new THREE.SphereGeometry(0.85, 8, 8);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      transparent: true,
      opacity: 0.88,
    });
    const cloudsGroup = new THREE.Group();

    const cloud1 = new THREE.Mesh(cloudGeo, cloudMat);
    cloud1.scale.set(1.6, 0.6, 1.1);
    cloud1.position.set(-6, 3.8, -4);
    cloud1.castShadow = true;
    cloudsGroup.add(cloud1);

    const cloud2 = new THREE.Mesh(cloudGeo, cloudMat);
    cloud2.scale.set(2.0, 0.7, 1.3);
    cloud2.position.set(5, 4.5, 3);
    cloud2.castShadow = true;
    cloudsGroup.add(cloud2);

    const cloud3 = new THREE.Mesh(cloudGeo, cloudMat);
    cloud3.scale.set(1.4, 0.5, 0.9);
    cloud3.position.set(-2, 5.2, 5);
    cloud3.castShadow = true;
    cloudsGroup.add(cloud3);
    scene.add(cloudsGroup);

    // 9. Floating Festive Hot Air Balloon / Sky Lantern
    const balloonGroup = new THREE.Group();
    const balloonGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const balloonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
    });
    const balloonMesh = new THREE.Mesh(balloonGeo, balloonMat);
    balloonMesh.scale.set(1, 1.25, 1);
    balloonMesh.castShadow = true;
    balloonGroup.add(balloonMesh);
    balloonGroup.position.set(0, 4.2, -6);
    scene.add(balloonGroup);

    // 10. Generate 3D Pandal Pins across the 28 locations
    const pinMeshes = new Map<string, THREE.Group>();

    for (const pandal of ALL_PANDALS) {
      const [x, z] = geoTo3D(pandal.lat, pandal.lng);
      const isDivine = pandal.slug === "naihati-boromaa-kali-puja" || pandal.featured;

      const pinGroup = new THREE.Group();
      pinGroup.position.set(x, 0.05, z);
      pinGroup.userData = { pandal };

      if (isDivine) {
        // --- DIVINE BORO MAA PIN ---
        // 1. Golden Base ring
        const baseGeo = new THREE.RingGeometry(0.2, 0.65, 16);
        const baseMat = new THREE.MeshBasicMaterial({
          color: 0xf5c76a,
          side: THREE.DoubleSide,
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.rotation.x = -Math.PI / 2;
        pinGroup.add(baseMesh);

        // 2. Tall Golden Temple Stem
        const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
        const stemMat = new THREE.MeshStandardMaterial({
          color: 0xf5c76a,
          metalness: 0.8,
          roughness: 0.2,
        });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.8;
        stem.castShadow = true;
        pinGroup.add(stem);

        // 3. Ornate Crown Crest / Golden Medallion
        const crownGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const crownMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.8,
          metalness: 0.9,
          roughness: 0.15,
        });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = 1.95;
        crown.castShadow = true;
        pinGroup.add(crown);

        // 4. Trishul / Divine Spike Top
        const spikeGeo = new THREE.ConeGeometry(0.18, 0.7, 8);
        const spikeMat = new THREE.MeshStandardMaterial({
          color: 0xffe6a8,
          emissive: 0xf5c76a,
          emissiveIntensity: 0.9,
        });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.y = 2.65;
        pinGroup.add(spike);

        // 5. Divine Sunburst Halo Ring
        const haloGeo = new THREE.TorusGeometry(0.85, 0.06, 8, 24);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.y = 1.95;
        halo.name = "divineHalo";
        pinGroup.add(halo);

        // 6. Warm PointLight
        const pLight = new THREE.PointLight(0xf5c76a, 2.5, 6);
        pLight.position.set(0, 2.2, 0);
        pinGroup.add(pLight);
      } else {
        // --- STANDARD PANDAL PIN ---
        const pinColor =
          pandal.category === "heritage"
            ? 0xf5c76a
            : pandal.category === "large"
            ? 0xff5f7e
            : 0x3dd6c0;

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.45;
        stem.castShadow = true;
        pinGroup.add(stem);

        // Pin Head Sphere
        const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: 0.5,
          roughness: 0.3,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.05;
        head.castShadow = true;
        pinGroup.add(head);
      }

      scene.add(pinGroup);
      pinMeshes.set(pandal.slug, pinGroup);
    }
    pinMeshesRef.current = pinMeshes;

    // 11. Raycaster for touching/clicking 3D pins
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClickOrTouch = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
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

    // 12. Animation loop
    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle cloud drift
      cloud1.position.x = -6 + Math.sin(elapsed * 0.4) * 0.8;
      cloud2.position.z = 3 + Math.cos(elapsed * 0.35) * 0.9;
      cloud3.position.x = -2 + Math.cos(elapsed * 0.5) * 0.6;

      // Floating lantern bob
      balloonGroup.position.y = 4.2 + Math.sin(elapsed * 1.5) * 0.3;

      // Rotate divine halo around Boro Maa
      const boroMaaGroup = pinMeshes.get("naihati-boromaa-kali-puja");
      if (boroMaaGroup) {
        const halo = boroMaaGroup.getObjectByName("divineHalo");
        if (halo) {
          halo.rotation.z = elapsed * 1.2;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 13. Responsive Resize
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

  // Reset 3D camera view
  const handleResetView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(16, 17, 21);
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

  const toggleAutoRotate = () => {
    if (!controlsRef.current) return;
    const nextState = !isRotating;
    controlsRef.current.autoRotate = nextState;
    setIsRotating(nextState);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-[#18092a] via-[#0f061b] to-[#07050e] shadow-2xl shadow-black/80">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, #f5c76a 0%, #c8102e 50%, transparent 75%)" }}
        aria-hidden="true"
      />

      {/* Top Banner & Category Filter Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2.5 backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
          </span>
          <span className="text-[12.5px] font-bold tracking-wide text-gold">
            {lang === "bn" ? "নৈহাটি ৩ডি ইন্টারেক্টিভ ম্যাপ" : "Naihati 3D Interactive Map"}
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
      <div className="relative aspect-[16/11] w-full touch-none select-none sm:aspect-[16/9] min-h-[340px]">
        {/* 3D WebGL Canvas Container */}
        <div ref={containerRef} className="size-full cursor-grab active:cursor-grabbing" />

        {/* ---------------- Geographic Overlay Labels ---------------- */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {/* Hooghly River Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-950/80 px-2.5 py-1 shadow-md backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-sky-200">
              {lang === "bn" ? "হুগলী নদী (গঙ্গার ঘাট)" : "Hooghly River & Ferry Ghat"}
            </span>
          </div>

          {/* Railway Track Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 shadow-md backdrop-blur-md">
            <TrainIcon size={12} className="stroke-emerald-300" />
            <span className="text-[10px] font-semibold text-emerald-200">
              {lang === "bn" ? "নৈহাটি জংশন ও রেলপথ" : "Naihati Jn & Rail Track"}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute top-3 right-3 z-10">
          {/* Kalyani Expressway Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-950/85 px-2.5 py-1 shadow-md backdrop-blur-md">
            <CarIcon size={12} className="stroke-amber-300" />
            <span className="text-[10px] font-semibold text-amber-200">
              {lang === "bn" ? "কল্যাণী এক্সপ্রেসওয়ে" : "Kalyani Expressway"}
            </span>
          </div>
        </div>

        {/* 3D Touch Hint Pill */}
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-10">
          <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10.5px] text-white/70 backdrop-blur-sm">
            {lang === "bn"
              ? "ঘোরাতে ১ আঙুল · জুম করতে ২ আঙুল"
              : "Drag to rotate · Pinch to zoom in 3D"}
          </span>
        </div>

        {/* 3D Camera Floating Control Buttons */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleResetView}
            className="liquid-press grid size-8 place-items-center rounded-xl border border-white/20 bg-ink/80 text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            title="Reset 3D camera"
            aria-label="Reset 3D camera"
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
