import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCcw, Box, Crosshair, Sliders, Maximize2, Layers } from 'lucide-react';

export type SubsystemKey = 'chassis' | 'wheels' | 'motors' | 'l298n' | 'battery' | 'esp32' | 'wires';

export interface SubsystemInfo {
  name: string;
  code: string;
  category: string;
  color: string;
  desc: string;
  specs: string;
  hotspotOffset: [number, number, number];
}

export const SUBSYSTEMS_DATA: Record<SubsystemKey, SubsystemInfo> = {
  motors: {
    name: 'Motor Mounting & Connection',
    code: 'CP 01',
    category: 'Powertrain',
    color: '#ea580c',
    desc: '12V 300 RPM GA25 metal geared DC motors with planetary gearboxes and precision brass hex couplers.',
    specs: '12V DC | 300 RPM | 15 kg.cm Torque | 4mm D-cut Hex',
    hotspotOffset: [0.75, -0.2, -0.4],
  },
  l298n: {
    name: 'L298N Motor Driver Setup',
    code: 'CP 02',
    category: 'Electronics',
    color: '#ea580c',
    desc: 'Dual H-Bridge motor driver with multi-fin black anodized heatsink and screw terminal block headers.',
    specs: 'Peak: 2A/channel | Logic: 5V TTL | Heat: Aluminum Fin',
    hotspotOffset: [0.35, 0.45, 0.4],
  },
  wires: {
    name: 'ESP32 Logic Wiring',
    code: 'CP 03',
    category: 'Wiring',
    color: '#ea580c',
    desc: 'Color-coded Dupont logic ribbon jumpers, thick 14AWG silicone 12V power leads, and rubber anti-chafe grommets.',
    specs: 'Logic: 28AWG Dupont | Power: 14AWG Silicone | Common Ground Rail',
    hotspotOffset: [0, 0.70, 0.1],
  },
  esp32: {
    name: 'Firmware & Wi-Fi / BLE',
    code: 'CP 04 / 06',
    category: 'Telemetry',
    color: '#ea580c',
    desc: 'ESP32-WROOM-32 Wi-Fi / BLE microcontroller with metal RF shield, USB-UART bridge, and 30-pin GPIO.',
    specs: 'Dual Tensilica 240MHz | 802.11 b/g/n + BLE 4.2 | 30-pin GPIO',
    hotspotOffset: [-0.1, 0.5, -0.55],
  },
  battery: {
    name: '3S Battery Power Integration',
    code: 'CP 05',
    category: 'Power',
    color: '#ea580c',
    desc: '11.1V 3S Li-Ion 2200mAh pack with authentic XT60 high-current gold pins and JST-XH balance lead.',
    specs: '3S1P 18650 | 2200mAh (24.4Wh) | XT60 Fused Connector',
    hotspotOffset: [-0.25, 0.55, 0.1],
  },
  chassis: {
    name: 'Polarity & Chassis Maiden Run',
    code: 'CP 07',
    category: 'Structural',
    color: '#ea580c',
    desc: 'Bent aluminum U-channel chassis plate with front bullbar, side motor mount flanges, and aero top deck.',
    specs: '6061-T6 Alum + ABS Deck | 140x220mm | M3 Hex Socket',
    hotspotOffset: [0, -0.1, 0.7],
  },
  wheels: {
    name: 'Competition Wheels (x4)',
    code: 'Propulsion',
    category: 'Propulsion',
    color: '#f97316',
    desc: 'Deep-dish competition white rims with 6 cutout spokes, beadlock rivets, and 20-lug chevron rubber tires.',
    specs: 'Dia: 65mm | Aggressive 20-Lug Chevron | 12mm Hex Hub',
    hotspotOffset: [1.05, -0.1, 0.65],
  },
};

interface HotspotScreenPos {
  key: SubsystemKey;
  x: number;
  y: number;
  visible: boolean;
}

interface Bot3DViewerProps {
  activeSubsystem?: SubsystemKey | null;
  onSelectSubsystem?: (key: SubsystemKey) => void;
  highlightedMilestone?: number;
}

export const Bot3DViewer: React.FC<Bot3DViewerProps> = ({
  activeSubsystem,
  onSelectSubsystem,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [hoveredHotspot, setHoveredHotspot] = useState<SubsystemKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  const [hotspotPositions, setHotspotPositions] = useState<HotspotScreenPos[]>([]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const botGroupRef = useRef<THREE.Group | null>(null);
  const modelPartsRef = useRef<Partial<Record<SubsystemKey, THREE.Object3D>>>({});

  // 1. Initialize Scene, Camera, Renderer & Load GLTF
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const stage = stageRef.current;

    // Robust size detection: stageRef has aspect-4/3 min-h-[460px]
    let width = stage?.clientWidth || container.clientWidth || 640;
    let height = stage?.clientHeight || container.clientHeight || 480;
    if (height <= 0) height = Math.round(width * 0.75) || 480;
    if (width <= 0) width = 640;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup - zoomed for optimal isometric view
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.2, 3.0, 4.0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 9.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controlsRef.current = controls;

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xea580c, 2.0);
    rimLight.position.set(-6, 4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfdba74, 1.2);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // Ground shadow plane
    const shadowGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.65;
    scene.add(shadowPlane);

    // Root Group
    const botRoot = new THREE.Group();
    scene.add(botRoot);
    botGroupRef.current = botRoot;

    // Load robothon_3_bot.glb
    const loader = new GLTFLoader();
    loader.load(
      '/robothon_3_bot.glb',
      (gltf) => {
        setIsLoading(false);
        const botModel = gltf.scene;

        // Perfectly center geometry at (0, 0, 0)
        const box = new THREE.Box3().setFromObject(botModel);
        const center = new THREE.Vector3();
        box.getCenter(center);
        botModel.position.sub(center);
        botModel.position.y += 0.20;

        botModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        // Map the 7 distinct subsystem groups
        const mappedParts: Partial<Record<SubsystemKey, THREE.Object3D>> = {};
        botModel.traverse((obj) => {
          const name = (obj.name || '').toLowerCase();
          if ((name.includes('dc_motor') || name === 'motors' || name === 'dc_motors') && !mappedParts.motors) {
            mappedParts.motors = obj;
          } else if ((name.includes('l298n') || name.includes('driver')) && !mappedParts.l298n) {
            mappedParts.l298n = obj;
          } else if ((name.includes('esp32') || name.includes('wroom')) && !mappedParts.esp32) {
            mappedParts.esp32 = obj;
          } else if ((name.includes('battery') || name.includes('batt')) && !mappedParts.battery) {
            mappedParts.battery = obj;
          } else if ((name.includes('wire') || name.includes('harness')) && !mappedParts.wires) {
            mappedParts.wires = obj;
          } else if ((name.includes('wheel') || name.includes('tire')) && !mappedParts.wheels) {
            mappedParts.wheels = obj;
          } else if ((name.includes('chassis') || name.includes('frame')) && !mappedParts.chassis) {
            mappedParts.chassis = obj;
          }
        });

        modelPartsRef.current = mappedParts;
        botRoot.add(botModel);
      },
      undefined,
      (err) => {
        console.error('Failed to load 3D model:', err);
        setIsLoading(false);
      }
    );

    // Continuous render loop + 2D hotspot projections
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      const newPositions: HotspotScreenPos[] = [];
      const tempVec = new THREE.Vector3();

      const curWidth = stage?.clientWidth || container.clientWidth || 640;
      const curHeight = stage?.clientHeight || container.clientHeight || 480;

      (Object.keys(SUBSYSTEMS_DATA) as SubsystemKey[]).forEach((key) => {
        const info = SUBSYSTEMS_DATA[key];
        const offset = info.hotspotOffset;
        const part = modelPartsRef.current[key];

        tempVec.set(offset[0], offset[1], offset[2]);
        if (part) {
          tempVec.add(part.position);
        }

        if (botGroupRef.current) {
          tempVec.applyMatrix4(botGroupRef.current.matrixWorld);
        }

        tempVec.project(camera);

        const halfWidth = curWidth / 2;
        const halfHeight = curHeight / 2;
        const screenX = tempVec.x * halfWidth + halfWidth;
        const screenY = -(tempVec.y * halfHeight) + halfHeight;
        const isVisible =
          tempVec.z < 1 &&
          isFinite(screenX) &&
          isFinite(screenY) &&
          screenX > 25 &&
          screenX < curWidth - 25 &&
          screenY > 25 &&
          screenY < curHeight - 25;

        newPositions.push({
          key,
          x: screenX,
          y: screenY,
          visible: isVisible,
        });
      });

      setHotspotPositions(newPositions);
      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver for rock-solid reactive canvas sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 20 && h > 20) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });

    if (stage) resizeObserver.observe(stage);
    else resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // 2. Handle Explode View Factor dynamically
  useEffect(() => {
    const parts = modelPartsRef.current;
    if (!parts) return;

    const explode = explodeFactor;

    if (parts.l298n) parts.l298n.position.set(0, 1.15 * explode, 0.70 * explode);
    if (parts.battery) parts.battery.position.set(0, 1.45 * explode, 0);
    if (parts.esp32) parts.esp32.position.set(0, 1.20 * explode, -0.85 * explode);
    if (parts.wires) parts.wires.position.set(0, 2.10 * explode, 0);
    if (parts.motors) parts.motors.position.set(0, -0.80 * explode, 0);
    if (parts.chassis) parts.chassis.position.set(0, -0.45 * explode, 0);
    if (parts.wheels) parts.wheels.position.set(0, -0.30 * explode, 0);
  }, [explodeFactor]);

  const handleSetView = (mode: '3d' | 'top' | 'side') => {
    setViewMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;
    if (mode === '3d') {
      cameraRef.current.position.set(4.2, 3.0, 4.0);
    } else if (mode === 'top') {
      cameraRef.current.position.set(0, 5.2, 0.001);
    } else if (mode === 'side') {
      cameraRef.current.position.set(5.2, 0.5, 0);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    setExplodeFactor(0);
    handleSetView('3d');
  };

  const toggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative w-full rounded-3xl bg-[#141210] border border-[#2a221b] overflow-hidden shadow-2xl aspect-4/3 min-h-[460px] select-none"
    >
      {/* 3D WebGL Canvas Layer - Fills entire container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Overlay: Segmented View Selector + Fullscreen */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Segmented Pill */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-[#1e1915]/85 backdrop-blur-md border border-[#332820] shadow-md">
          <button
            type="button"
            onClick={() => handleSetView('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === '3d'
                ? 'bg-[#2a170a] border border-[#ea580c]/70 text-[#ea580c] shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetView('top')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'top'
                ? 'bg-[#2a170a] border border-[#ea580c]/70 text-[#ea580c] shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Top View</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetView('side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'side'
                ? 'bg-[#2a170a] border border-[#ea580c]/70 text-[#ea580c] shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Side View</span>
          </button>
        </div>

        {/* Right Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="pointer-events-auto w-8 h-8 rounded-xl bg-[#1e1915]/85 backdrop-blur-md border border-[#332820] text-stone-400 hover:text-white flex items-center justify-center transition-all shadow-md"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141210]/80 backdrop-blur-sm z-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#ea580c] border-t-transparent animate-spin mb-2" />
          <span className="text-xs font-mono text-stone-300">Loading 3D Autonomous Bot...</span>
        </div>
      )}

      {/* Minimal Concentric Orange Hotspot Dots */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {hotspotPositions.map(({ key, x, y, visible }) => {
          if (!visible) return null;
          const isHovered = hoveredHotspot === key;
          const isSelected = activeSubsystem === key;

          return (
            <div
              key={key}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-auto flex items-center justify-center cursor-pointer"
              onClick={() => onSelectSubsystem && onSelectSubsystem(key)}
              onMouseEnter={() => setHoveredHotspot(key)}
              onMouseLeave={() => setHoveredHotspot(null)}
              title={SUBSYSTEMS_DATA[key].name}
            >
              <div className="relative flex items-center justify-center">
                {(isSelected || isHovered) && (
                  <span className="absolute w-7 h-7 rounded-full bg-[#ea580c]/30 animate-ping pointer-events-none" />
                )}
                <span
                  className={`rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                    isSelected
                      ? 'w-6 h-6 border-2 border-white bg-[#ea580c] ring-2 ring-[#ea580c]/60 scale-110'
                      : isHovered
                      ? 'w-5 h-5 border-2 border-white bg-[#ea580c] scale-105'
                      : 'w-5 h-5 border-2 border-white/90 bg-[#ea580c]'
                  }`}
                >
                  <span
                    className={`rounded-full bg-white transition-all ${
                      isSelected ? 'w-2 h-2' : 'w-1.5 h-1.5'
                    }`}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Overlay: Explode view slider + percentage + reset */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#1c1611]/90 backdrop-blur-md border border-[#332820] shadow-lg">
        <div className="flex items-center gap-2 text-stone-300 shrink-0">
          <Layers className="w-4 h-4 text-stone-300" />
          <span className="text-xs font-medium text-stone-200">Explode view</span>
        </div>

        <div className="flex-1 max-w-xs mx-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={explodeFactor}
            onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#ea580c] bg-stone-700/80 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono font-bold text-[#ea580c] w-9 text-right">
            {Math.round(explodeFactor * 100)}%
          </span>
          <button
            type="button"
            onClick={handleResetCamera}
            className="text-stone-400 hover:text-white transition-colors p-1"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
