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

// Exact Bounding Box from User's maps3d.io JSON configuration
export const NAIHATI_BBOX = {
  minLng: 88.40478,
  maxLng: 88.43769,
  minLat: 22.87005,
  maxLat: 22.90839,
};

// Exact 17-point custom boundary polygon of Naihati from the user's maps3d.io JSON
export const NAIHATI_POLYGON: [number, number][] = [
  [88.40478, 22.90702],
  [88.40926, 22.90839],
  [88.41207, 22.90839],
  [88.41482, 22.90784],
  [88.41961, 22.90621],
  [88.42728, 22.90401],
  [88.43769, 22.90077],
  [88.43248, 22.87005],
  [88.40979, 22.88127],
  [88.41091, 22.88494],
  [88.41139, 22.88823],
  [88.41113, 22.89198],
  [88.41018, 22.89502],
  [88.40801, 22.90011],
  [88.40639, 22.90348],
  [88.40551, 22.9052],
  [88.40478, 22.90702],
];

const MAP_WIDTH = 22;
const MAP_DEPTH = 22;
const BLOCK_THICKNESS = 2.8;

/**
 * Projects real-world Latitude & Longitude to 3D Space (X, Z) on top of the slab
 */
function geoTo3D(lat: number, lng: number): [number, number] {
  const normX = (lng - NAIHATI_BBOX.minLng) / (NAIHATI_BBOX.maxLng - NAIHATI_BBOX.minLng);
  const normZ = (lat - NAIHATI_BBOX.minLat) / (NAIHATI_BBOX.maxLat - NAIHATI_BBOX.minLat);
  const x = (normX - 0.5) * MAP_WIDTH;
  const z = (normZ - 0.5) * MAP_DEPTH;
  return [x, z];
}

/**
 * Generates the layered terracotta bedrock strata for the cutaway sides of the slab,
 * matching maps3d.io "terracotta_verydark" material
 */
function createStrataTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const bands = [
    { y: 0, h: 22, color: "#453229" },   // Topsoil
    { y: 22, h: 36, color: "#7a371c" },  // Deep ferruginous terracotta
    { y: 58, h: 42, color: "#8a482b" },  // Terracotta clay
    { y: 100, h: 28, color: "#b5693d" }, // Sandstone
    { y: 128, h: 22, color: "#d99b66" }, // Silt & quartz
    { y: 150, h: 46, color: "#682c16" }, // Dark terracotta bedrock
    { y: 196, h: 60, color: "#361b11" }, // Basal basement rock
  ];

  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.fillRect(0, b.y, 512, b.h);

    // Horizontal sedimentary bedding lines
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, b.y + b.h - 2, 512, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, b.y + 1, 512, 1);
  }

  // Natural organic grain
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, Math.random() * 9 + 2, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates the high-resolution dynamic top surface texture representing Naihati:
 * - Green ground base (#4d8c4a)
 * - Curving Hooghly River on the west (#3B9FD9)
 * - Ponds & Dighis across Naihati
 * - Eastern Railway corridor passing through Naihati Junction Station
 * - Kalyani Expressway on the east (#a6071f)
 * - Arterial street networks (#a6071f) and urban settlement clusters (#726e68)
 */
function createNaihatiTopMapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Lush Green Land Cover (Base: #4d8c4a as in JSON)
  ctx.fillStyle = "#3e6c38";
  ctx.fillRect(0, 0, 1024, 1024);

  // Organic soil & vegetation variation
  ctx.fillStyle = "#4a7d43";
  for (let i = 0; i < 50; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    ctx.fillRect(gx, gy, Math.random() * 80 + 30, Math.random() * 60 + 20);
  }

  // 2. Hooghly River on the West (u: 0 to ~0.24, flowing curved along the western boundary)
  ctx.fillStyle = "#1e3a8a"; // deep blue base
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(240, 0);
  ctx.bezierCurveTo(220, 260, 290, 520, 200, 750);
  ctx.bezierCurveTo(170, 850, 150, 940, 130, 1024);
  ctx.lineTo(0, 1024);
  ctx.closePath();
  ctx.fill();

  // Vibrant water gradient (#3B9FD9 from user JSON)
  const riverGrad = ctx.createLinearGradient(0, 0, 260, 0);
  riverGrad.addColorStop(0, "#1d4ed8");
  riverGrad.addColorStop(0.65, "#3b82f6");
  riverGrad.addColorStop(1, "#38bdf8");
  ctx.fillStyle = riverGrad;
  ctx.fill();

  // Sandy riverside border / Ghats
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = 5;
  ctx.stroke();

  // 3. Ponds & Water Bodies (Local Dighis in Naihati: #3B9FD9)
  const ponds = [
    { x: 340, y: 320, rx: 30, ry: 20 },
    { x: 420, y: 220, rx: 25, ry: 18 },
    { x: 520, y: 440, rx: 34, ry: 24 },
    { x: 380, y: 580, rx: 26, ry: 18 },
    { x: 620, y: 310, rx: 28, ry: 20 },
    { x: 480, y: 720, rx: 32, ry: 22 },
    { x: 680, y: 640, rx: 38, ry: 26 },
    { x: 740, y: 420, rx: 30, ry: 20 },
    { x: 310, y: 790, rx: 24, ry: 16 },
    { x: 580, y: 840, rx: 35, ry: 24 },
  ];
  ctx.fillStyle = "#38bdf8";
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 2.5;
  for (const p of ponds) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 4. Urban Settlements & Building Footprints (#726e68 from JSON)
  ctx.fillStyle = "rgba(114, 110, 104, 0.75)";
  ctx.strokeStyle = "rgba(40, 36, 32, 0.4)";
  ctx.lineWidth = 1;
  for (let gx = 250; gx < 850; gx += 22) {
    for (let gy = 120; gy < 920; gy += 18) {
      if (Math.random() > 0.42) {
        ctx.fillRect(gx + (Math.random() * 6 - 3), gy + (Math.random() * 6 - 3), 14, 10);
        ctx.strokeRect(gx, gy, 14, 10);
      }
    }
  }

  // 5. Eastern Railway Tracks passing through Naihati Junction Station
  const railX = 490;
  // Railway embankment
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(railX - 8, 0, 16, 1024);

  // Cross-ties (sleepers)
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 8) {
    ctx.beginPath();
    ctx.moveTo(railX - 7, y);
    ctx.lineTo(railX + 7, y);
    ctx.stroke();
  }

  // Double steel tracks (shining silver)
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(railX - 3.5, 0);
  ctx.lineTo(railX - 3.5, 1024);
  ctx.moveTo(railX + 3.5, 0);
  ctx.lineTo(railX + 3.5, 1024);
  ctx.stroke();

  // Naihati Junction Station platform hub
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(railX - 18, 480, 36, 65);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(railX - 18, 480, 36, 65);

  // 6. Kalyani Expressway (Wide arterial highway on the East: #a6071f)
  const hwyX = 890;
  ctx.strokeStyle = "#a6071f";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(hwyX - 40, 0);
  ctx.bezierCurveTo(hwyX - 10, 300, hwyX + 15, 600, hwyX, 1024);
  ctx.stroke();

  // Highway yellow center divider
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 7. Arterial Red Roads (#a6071f connecting Ferry Ghat, Boro Maa, Station, Expressway)
  ctx.strokeStyle = "#a6071f";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Arbinda Road (Ferry Ghat -> Station -> Boro Maa Temple)
  ctx.beginPath();
  ctx.moveTo(210, 490);
  ctx.lineTo(railX, 510);
  ctx.lineTo(hwyX, 560);
  ctx.stroke();

  // Ghoshpara Road
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(330, 0);
  ctx.bezierCurveTo(340, 300, 360, 600, 320, 1024);
  ctx.stroke();

  // Secondary local connector streets
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#821626";
  for (let r = 160; r < 960; r += 70) {
    ctx.beginPath();
    ctx.moveTo(250 + Math.random() * 40, r);
    ctx.lineTo(railX - 10, r + (Math.random() * 30 - 15));
    ctx.moveTo(railX + 10, r);
    ctx.lineTo(hwyX - 20, r + (Math.random() * 30 - 15));
    ctx.stroke();
  }

  // 8. Soft satellite underlay blend for realistic aerial realism
  const img = new (window as any).Image();
  img.src = "/naihati-3d-model.webp";
  img.onload = () => {
    ctx.globalAlpha = 0.28;
    ctx.drawImage(img, 0, 0, 1024, 1024);
    ctx.globalAlpha = 1.0;
    texture.needsUpdate = true;
  };

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Builds the 3D Pin featuring the circular Maa Kali portrait medallion:
 * - Maa Kali portrait disc facing camera
 * - Golden filigree frame
 * - Radiant Golden Mukut (Crown) & glowing sunburst aura for Naihati Boro Maa
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

  // 1. Golden Base Lotus Ring on terrain
  const baseRadius = isDivine ? 0.65 : 0.38;
  const baseGeo = new THREE.RingGeometry(0.08, baseRadius, 16);
  const baseMat = new THREE.MeshBasicMaterial({
    color: isDivine ? 0xf5c76a : 0xffe6a8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.rotation.x = -Math.PI / 2;
  pinGroup.add(baseMesh);

  // 2. Slender Golden Spire Stem
  const stemHeight = isDivine ? 1.7 : 1.2;
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
  billboard.position.y = stemHeight + (isDivine ? 0.55 : 0.38);
  pinGroup.add(billboard);
  pinGroup.userData.billboard = billboard;

  const headRadius = isDivine ? 0.65 : 0.44;

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
      new THREE.ConeGeometry(0.18, 0.7, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        metalness: 0.9,
      })
    );
    centerPinnacle.position.y = 0.35;
    crownGroup.add(centerPinnacle);

    // Left crown pinnacle
    const leftPinnacle = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8 })
    );
    leftPinnacle.position.set(-0.25, 0.22, 0);
    crownGroup.add(leftPinnacle);

    // Right crown pinnacle
    const rightPinnacle = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8 })
    );
    rightPinnacle.position.set(0.25, 0.22, 0);
    crownGroup.add(rightPinnacle);

    // Ruby gem crest
    const ruby = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    ruby.position.set(0, 0.2, 0.08);
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
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go beneath terrain
    controls.minDistance = 8;
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
    scene.add(sunLight);

    // Warm golden fill light from the west (river reflections)
    const riverLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    riverLight.position.set(-20, 15, -10);
    scene.add(riverLight);

    // 6. BUILD THE EXACT NAIHATI POLYGON 3D CUTAWAY SLAB
    const shape = new THREE.Shape();
    for (let i = 0; i < NAIHATI_POLYGON.length; i++) {
      const [lng, lat] = NAIHATI_POLYGON[i];
      const [x, z] = geoTo3D(lat, lng);
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: BLOCK_THICKNESS,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.15,
    };

    const terrainGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate so top face is horizontal on X-Z plane, extruding downwards into -Y
    terrainGeom.rotateX(Math.PI / 2);

    // Normalize top face UVs across the bounding box so the map texture aligns precisely
    const pos = terrainGeom.attributes.position;
    const uvs = terrainGeom.attributes.uv;
    const halfW = MAP_WIDTH / 2;
    const halfD = MAP_DEPTH / 2;
    const topGroup = terrainGeom.groups[0];
    if (topGroup) {
      for (let i = topGroup.start; i < topGroup.start + topGroup.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const u = (x + halfW) / MAP_WIDTH;
        const v = (z + halfD) / MAP_DEPTH;
        uvs.setXY(i, u, v);
      }
      uvs.needsUpdate = true;
    }

    // Textures
    const strataTexture = createStrataTexture();
    const topTexture = createNaihatiTopMapTexture();

    const topMat = new THREE.MeshStandardMaterial({
      map: topTexture,
      roughness: 0.75,
      metalness: 0.1,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: strataTexture,
      roughness: 0.9,
      metalness: 0.05,
    });

    const terrainMesh = new THREE.Mesh(terrainGeom, [topMat, sideMat]);
    terrainMesh.position.y = 0;
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 7. Base Drop Shadow Ring underneath the custom polygon
    const groundGeo = new THREE.PlaneGeometry(38, 38);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -BLOCK_THICKNESS - 0.05;
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

    // 9. Floating Festive Sky Lantern
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

    // 10. Load Textures for Kali Mata & Boro Maa Pins
    const textureLoader = new THREE.TextureLoader();
    const kaliTexture = textureLoader.load("/kali-pin.jpg");
    const boroMaaTexture = textureLoader.load("/boro-maa-emblem.png");

    // 11. Generate 3D Pandal Pins across all 28 locations with Maa Kali Medallions
    const pinMeshes = new Map<string, THREE.Group>();

    for (const pandal of ALL_PANDALS) {
      const pinGroup = createPandalPin(pandal, kaliTexture, boroMaaTexture);
      scene.add(pinGroup);
      pinMeshes.set(pandal.slug, pinGroup);
    }
    pinMeshesRef.current = pinMeshes;

    // 12. Interactive Pointer Tap / Click Raycasting
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

    // 13. Animation loop: Billboards face camera + Halo rotation + Clouds
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle cloud drift
      cloud1.position.x = -6 + Math.sin(elapsed * 0.4) * 0.8;
      cloud2.position.z = 3 + Math.cos(elapsed * 0.35) * 0.9;
      cloud3.position.x = -2 + Math.cos(elapsed * 0.5) * 0.6;

      // Floating lantern bob
      balloonGroup.position.y = 4.2 + Math.sin(elapsed * 1.5) * 0.3;

      // Rotate all Maa Kali medallions so they directly face the user's camera
      for (const group of pinMeshes.values()) {
        if (group.userData?.billboard) {
          group.userData.billboard.quaternion.copy(camera.quaternion);
        }
      }

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

    // 14. Responsive Resize
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
            {lang === "bn" ? "নৈহাটি ৩ডি ইন্টারেক্টিভ মডেল" : "Naihati 3D Interactive Model"}
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
