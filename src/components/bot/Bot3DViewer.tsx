import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCcw, Sparkles } from 'lucide-react';

export type SubsystemKey = 'chassis' | 'wheels' | 'motors' | 'l298n' | 'battery' | 'esp32' | 'wires';

export interface SubsystemInfo {
  name: string;
  code: string;
  category: string;
  color: string;
  desc: string;
  specs: string;
  hotspotOffset: [number, number, number];
  explodeVector: [number, number, number];
}

export const SUBSYSTEMS_DATA: Record<SubsystemKey, SubsystemInfo> = {
  motors: {
    name: 'Motor Mounting & Connection',
    code: 'CP 01',
    category: 'Powertrain',
    color: '#D4621A',
    desc: '12V 300 RPM GA25 metal geared DC motors with planetary gearboxes and precision brass hex couplers.',
    specs: '12V DC | 300 RPM | 15 kg.cm Torque | 4mm D-cut Hex',
    hotspotOffset: [0.75, -0.2, -0.4],
    explodeVector: [0, -0.7, 0],
  },
  l298n: {
    name: 'L298N Motor Driver Setup',
    code: 'CP 02',
    category: 'Electronics',
    color: '#D4621A',
    desc: 'Dual H-Bridge motor driver with multi-fin black anodized heatsink and screw terminal block headers.',
    specs: 'Peak: 2A/channel | Logic: 5V TTL | Heat: Aluminum Fin',
    hotspotOffset: [0.35, 0.45, 0.4],
    explodeVector: [0.45, 0.95, 0.45],
  },
  wires: {
    name: 'ESP32 Logic Wiring',
    code: 'CP 03',
    category: 'Wiring',
    color: '#F4AE52',
    desc: 'Color-coded Dupont logic ribbon jumpers, thick 14AWG silicone 12V power leads, and rubber anti-chafe grommets.',
    specs: 'Logic: 28AWG Dupont | Power: 14AWG Silicone | Common Ground Rail',
    hotspotOffset: [0, 0.65, 0.15],
    explodeVector: [0, 1.85, 0],
  },
  esp32: {
    name: 'Firmware & Wi-Fi / BLE',
    code: 'CP 04 / 06',
    category: 'Telemetry',
    color: '#F4AE52',
    desc: 'ESP32-WROOM-32 Wi-Fi / BLE microcontroller with metal RF shield, USB-UART bridge, and 30-pin GPIO.',
    specs: 'Dual Tensilica 240MHz | 802.11 b/g/n + BLE 4.2 | 30-pin GPIO',
    hotspotOffset: [0, 0.5, -0.55],
    explodeVector: [0.3, 1.35, -0.65],
  },
  battery: {
    name: '3S Battery Power Integration',
    code: 'CP 05',
    category: 'Power',
    color: '#F4AE52',
    desc: '11.1V 3S Li-Ion 2200mAh pack with authentic XT60 high-current gold pins and JST-XH balance lead.',
    specs: '3S1P 18650 | 2200mAh (24.4Wh) | XT60 Fused Connector',
    hotspotOffset: [-0.25, 0.55, 0.1],
    explodeVector: [-0.35, 1.25, 0.35],
  },
  chassis: {
    name: 'Polarity & Chassis Maiden Run',
    code: 'CP 07',
    category: 'Structural',
    color: '#F4AE52',
    desc: 'Bent aluminum U-channel chassis plate with front bullbar, side motor mount flanges, and aero top deck.',
    specs: '6061-T6 Alum + ABS Deck | 140x220mm | M3 Hex Socket',
    hotspotOffset: [0, -0.1, 0.7],
    explodeVector: [0, -0.25, 0],
  },
  wheels: {
    name: 'Competition Wheels (x4)',
    code: 'Propulsion',
    category: 'Propulsion',
    color: '#FEF3E2',
    desc: 'Deep-dish competition white rims with 6 cutout spokes, beadlock rivets, and 20-lug chevron rubber tires.',
    specs: 'Dia: 65mm | Aggressive 20-Lug Chevron | 12mm Hex Hub',
    hotspotOffset: [1.05, -0.1, 0.65],
    explodeVector: [0, -0.95, 0],
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
  const [explodeFactor, setExplodeFactor] = useState<number>(0.2);
  const [hoveredHotspot, setHoveredHotspot] = useState<SubsystemKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hotspotPositions, setHotspotPositions] = useState<HotspotScreenPos[]>([]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const botGroupRef = useRef<THREE.Group | null>(null);
  const modelPartsRef = useRef<Partial<Record<SubsystemKey, THREE.Object3D>>>({});
  const initialPositionsRef = useRef<Partial<Record<SubsystemKey, THREE.Vector3>>>({});

  // 1. Initialize Scene, Transparent Background, Lights, Camera & Loader
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Completely transparent Three.js Scene (no dark square background)
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup - zoomed closer to make bot prominent and centered
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.2, 2.3, 3.2);
    cameraRef.current = camera;

    // WebGL Renderer with full alpha transparency
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls with damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0); // centered target
    controls.minDistance = 2.0;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controlsRef.current = controls;

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xF4AE52, 1.8);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xD4621A, 0.7);
    fillLight.position.set(0, -3, 2);
    scene.add(fillLight);

    // Soft ambient contact ground shadow disc (seamless on cream background)
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x251306,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.58;
    scene.add(shadowPlane);

    // Bot Root
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

        // Calculate bounding box & center geometry perfectly
        const box = new THREE.Box3().setFromObject(botModel);
        const center = new THREE.Vector3();
        box.getCenter(center);
        botModel.position.x = -center.x;
        botModel.position.y = -center.y + 0.15;
        botModel.position.z = -center.z;

        botModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        // Discover named subsystem nodes
        const parts: Partial<Record<SubsystemKey, THREE.Object3D>> = {
          motors: botModel.getObjectByName('DC_Motors') || undefined,
          l298n: botModel.getObjectByName('L298N_Driver') || undefined,
          wires: botModel.getObjectByName('Wires_Harness') || undefined,
          esp32: botModel.getObjectByName('ESP32_WROOM') || undefined,
          battery: botModel.getObjectByName('Battery_Pack') || undefined,
          chassis: botModel.getObjectByName('Chassis') || undefined,
          wheels: botModel.getObjectByName('Wheels') || undefined,
        };

        modelPartsRef.current = parts;

        const initPos: Partial<Record<SubsystemKey, THREE.Vector3>> = {};
        Object.entries(parts).forEach(([k, part]) => {
          if (part) {
            initPos[k as SubsystemKey] = part.position.clone();
          }
        });
        initialPositionsRef.current = initPos;

        botRoot.add(botModel);
      },
      undefined,
      (err) => {
        console.warn('GLB load error:', err);
        setIsLoading(false);
      }
    );

    // Animation & 3D Projection Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // Project 3D hotspot coordinates to 2D screen pixels for interactive dots
      if (container && camera) {
        const cWidth = container.clientWidth;
        const cHeight = container.clientHeight;
        const positions: HotspotScreenPos[] = [];

        Object.entries(SUBSYSTEMS_DATA).forEach(([k, data]) => {
          const part = modelPartsRef.current[k as SubsystemKey];
          const v = new THREE.Vector3();

          if (part) {
            part.getWorldPosition(v);
            v.x += data.hotspotOffset[0] * 0.4;
            v.y += data.hotspotOffset[1] * 0.4;
            v.z += data.hotspotOffset[2] * 0.4;
          } else {
            v.set(...data.hotspotOffset);
          }

          v.project(camera);

          const screenX = ((v.x + 1) * 0.5) * cWidth;
          const screenY = ((-v.y + 1) * 0.5) * cHeight;
          const isVisible = v.z < 1.0 && screenX > 10 && screenX < cWidth - 10 && screenY > 10 && screenY < cHeight - 10;

          positions.push({
            key: k as SubsystemKey,
            x: screenX,
            y: screenY,
            visible: isVisible,
          });
        });

        setHotspotPositions(positions);
      }
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // 2. React to Explode Factor and Active Subsystem Changes
  useEffect(() => {
    const parts = modelPartsRef.current;
    const inits = initialPositionsRef.current;

    Object.entries(SUBSYSTEMS_DATA).forEach(([k, data]) => {
      const part = parts[k as SubsystemKey];
      const orig = inits[k as SubsystemKey];
      if (!part || !orig) return;

      const isSelected = activeSubsystem === k;
      const factor = isSelected ? Math.max(explodeFactor, 0.55) : explodeFactor;

      part.position.set(
        orig.x + data.explodeVector[0] * factor,
        orig.y + data.explodeVector[1] * factor,
        orig.z + data.explodeVector[2] * factor
      );
    });
  }, [explodeFactor, activeSubsystem]);

  const handleResetCamera = () => {
    setExplodeFactor(0);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(3.2, 2.3, 3.2);
      controlsRef.current.target.set(0, 0, 0);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none">
      {/* Seamless Floating 3D Canvas - No dark square/circle background */}
      <div className="relative w-full aspect-square max-w-[480px] max-h-[480px] flex items-center justify-center">
        {/* 3D WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FEF3E2]/60 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#D4621A] border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-mono text-[#251306]">Loading 3D Model...</span>
          </div>
        )}

        {/* Interactive 3D Dots ONLY (Zero text written on top of the model) */}
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
              >
                {/* Minimal Sleek Dot: NO bulky buttons, NO text overlay */}
                <div className="relative flex items-center justify-center">
                  <span
                    className={`absolute rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'w-5 h-5 bg-[#D4621A]/50 animate-ping'
                        : isHovered
                        ? 'w-4 h-4 bg-[#F4AE52]/40 animate-ping'
                        : 'w-3 h-3 bg-[#D4621A]/20 animate-pulse'
                    }`}
                  />
                  <span
                    className={`rounded-full transition-all duration-200 shadow-md ${
                      isSelected
                        ? 'w-3 h-3 bg-[#D4621A] ring-2 ring-white scale-125'
                        : isHovered
                        ? 'w-2.5 h-2.5 bg-[#D4621A] ring-1 ring-[#FEF3E2] scale-110'
                        : 'w-2 h-2 bg-[#D4621A]'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exploded View Slider (Amber Gold & Burnt Rust Accents) */}
      <div className="mt-2 w-full max-w-[420px] flex items-center justify-between gap-4 px-4 py-2.5 rounded-full bg-white/80 border border-[#F4AE52]/50 shadow-sm">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#251306] font-bold flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3 h-3 text-[#D4621A]" />
          EXPLODE:
        </span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={explodeFactor}
          onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4621A] bg-[#251306]/15 focus:outline-none"
        />

        <span className="text-[11px] font-mono font-bold text-[#D4621A] w-9 text-right shrink-0">
          {Math.round(explodeFactor * 100)}%
        </span>

        <button
          type="button"
          onClick={handleResetCamera}
          className="text-[#251306]/60 hover:text-[#D4621A] transition-colors shrink-0"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Subsystem Hardware Spec Card below the 3D model */}
      {activeSubsystem && SUBSYSTEMS_DATA[activeSubsystem] && (
        <div className="mt-2 w-full max-w-[420px] px-4 py-2 rounded-xl bg-white/70 backdrop-blur-sm border border-[#F4AE52]/30 shadow-xs text-center">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#D4621A] font-bold">
            {SUBSYSTEMS_DATA[activeSubsystem].category} SPEC:
          </span>
          <p className="text-[11px] font-mono text-[#251306] font-medium mt-0.5">
            {SUBSYSTEMS_DATA[activeSubsystem].specs}
          </p>
        </div>
      )}
    </div>
  );
};
