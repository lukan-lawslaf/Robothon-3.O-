import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Plus, RotateCcw, Maximize2 } from 'lucide-react';

export type SubsystemKey = 'chassis' | 'wheels' | 'motors' | 'l298n' | 'battery' | 'esp32' | 'wires';

interface SubsystemInfo {
  name: string;
  category: string;
  color: string;
  desc: string;
  specs: string;
  hotspot: { x: number; y: number; z: number }; // 3D coordinates
  explodeOffset: [number, number, number];
}

export const SUBSYSTEMS_DATA: Record<SubsystemKey, SubsystemInfo> = {
  chassis: {
    name: 'Chassis & Deck',
    category: 'Structural',
    color: '#F4AE52',
    desc: 'Bent aluminum U-channel chassis plate with front bullbar, side motor mount flanges, and aero top deck.',
    specs: '6061-T6 Alum + ABS Deck | 140x220mm | M3 Hex Socket',
    hotspot: { x: 0, y: -0.15, z: 0.8 },
    explodeOffset: [0, -0.45, 0],
  },
  wheels: {
    name: 'Wheels (x4)',
    category: 'Propulsion',
    color: '#FEF3E2',
    desc: 'Deep-dish competition white rims with 6 cutout spokes, beadlock rivets, and 20-lug chevron rubber tires.',
    specs: 'Dia: 65mm | Aggressive 20-Lug Chevron | 12mm Hex Hub',
    hotspot: { x: 1.1, y: 0, z: 0.6 },
    explodeOffset: [0, 0, 0],
  },
  motors: {
    name: 'DC Motors (x4)',
    category: 'Powertrain',
    color: '#D4621A',
    desc: '12V 300 RPM GA25 metal geared DC motors with planetary gearboxes and precision brass hex couplers.',
    specs: '12V DC | 300 RPM | 15 kg.cm Torque | 4mm D-cut',
    hotspot: { x: 0.75, y: -0.3, z: -0.4 },
    explodeOffset: [0, -0.80, 0],
  },
  l298n: {
    name: 'L298N Driver',
    category: 'Electronics',
    color: '#D4621A',
    desc: 'Dual H-Bridge motor driver with multi-fin black anodized heatsink and screw terminal block headers.',
    specs: 'Peak: 2A/channel | Logic: 5V TTL | Heat: Aluminum Fin',
    hotspot: { x: 0, y: 0.45, z: 0.5 },
    explodeOffset: [0, 1.15, 0.70],
  },
  battery: {
    name: '3S Battery Pack',
    category: 'Power',
    color: '#F4AE52',
    desc: '11.1V 3S Li-Ion 2200mAh pack with authentic XT60 high-current gold pins and JST-XH balance lead.',
    specs: '3S1P 18650 | 2200mAh (24.4Wh) | XT60 Connector',
    hotspot: { x: 0, y: 0.55, z: 0 },
    explodeOffset: [0, 1.45, 0],
  },
  esp32: {
    name: 'ESP32-WROOM',
    category: 'Telemetry',
    color: '#F4AE52',
    desc: 'ESP32-WROOM-32 Wi-Fi / BLE microcontroller with metal RF shield, USB-UART bridge, and 30-pin GPIO.',
    specs: 'Dual Tensilica 240MHz | 802.11 b/g/n + BLE 4.2 | 30-pin',
    hotspot: { x: 0, y: 0.5, z: -0.6 },
    explodeOffset: [0, 1.20, -0.85],
  },
  wires: {
    name: 'Wiring Harness',
    category: 'Wiring',
    color: '#FEF3E2',
    desc: 'Color-coded Dupont logic ribbon jumpers, thick 14AWG silicone 12V power leads, and rubber anti-chafe grommets.',
    specs: 'Logic: 28AWG Dupont | Power: 14AWG Silicone | Rubber Grommets',
    hotspot: { x: 0, y: 0.7, z: 0.2 },
    explodeOffset: [0, 2.10, 0],
  },
};

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
  const [explodeFactor, setExplodeFactor] = useState<number>(0.25);
  const [hoveredHotspot, setHoveredHotspot] = useState<SubsystemKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const botGroupRef = useRef<THREE.Group | null>(null);
  const subsystemGroupsRef = useRef<Record<string, THREE.Group>>({});

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2A1A0E); // Deep Espresso
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.2, 3.2, 4.2);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.2, 0);
    controls.maxDistance = 10;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // 4. Lighting matching DESIGN.md
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xF4AE52, 1.4); // Amber Gold
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xD4621A, 0.8); // Burnt Rust
    fillLight.position.set(0, -3, 0);
    scene.add(fillLight);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0xF4AE52, 0x3D2414);
    grid.position.y = -0.58;
    scene.add(grid);

    // 5. Bot Group
    const botRoot = new THREE.Group();
    scene.add(botRoot);
    botGroupRef.current = botRoot;

    // Initialize subsystem sub-groups
    const subGroups: Record<string, THREE.Group> = {};
    Object.keys(SUBSYSTEMS_DATA).forEach((k) => {
      const g = new THREE.Group();
      g.name = k;
      botRoot.add(g);
      subGroups[k] = g;
    });
    subsystemGroupsRef.current = subGroups;

    // 6. Load GLTF Model (/robothon_3_bot.glb)
    const loader = new GLTFLoader();
    loader.load(
      '/robothon_3_bot.glb',
      (gltf) => {
        setIsLoading(false);
        // Distribute loaded meshes into respective subsystem groups based on name
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        // Add model to bot group
        botRoot.add(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn('GLB load fallback to procedural model:', err);
        setIsLoading(false);
        // Procedural Fallback Meshes
        buildProceduralBot(subGroups);
      }
    );

    // Procedural Fallback Builder
    function buildProceduralBot(groups: Record<string, THREE.Group>) {
      // Chassis
      const chassisGeo = new THREE.BoxGeometry(1.6, 0.12, 2.4);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0xF4AE52, metalness: 0.6, roughness: 0.3 });
      const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
      groups.chassis.add(chassisMesh);

      // 4 Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1A110A, roughness: 0.8 });
      const wheelPos: [number, number, number][] = [
        [-0.95, 0, 0.75],
        [0.95, 0, 0.75],
        [-0.95, 0, -0.75],
        [0.95, 0, -0.75],
      ];
      wheelPos.forEach((p) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(...p);
        groups.wheels.add(w);
      });

      // L298N
      const l298Geo = new THREE.BoxGeometry(0.7, 0.4, 0.7);
      const l298Mat = new THREE.MeshStandardMaterial({ color: 0xD4621A, roughness: 0.4 });
      const l298Mesh = new THREE.Mesh(l298Geo, l298Mat);
      l298Mesh.position.set(0, 0.25, 0.5);
      groups.l298n.add(l298Mesh);

      // Battery
      const batGeo = new THREE.BoxGeometry(0.9, 0.3, 0.5);
      const batMat = new THREE.MeshStandardMaterial({ color: 0x2A1A0E, roughness: 0.5 });
      const batMesh = new THREE.Mesh(batGeo, batMat);
      batMesh.position.set(0, 0.2, 0);
      groups.battery.add(batMesh);

      // ESP32
      const espGeo = new THREE.BoxGeometry(0.5, 0.15, 0.6);
      const espMat = new THREE.MeshStandardMaterial({ color: 0x3D2414, metalness: 0.8 });
      const espMesh = new THREE.Mesh(espGeo, espMat);
      espMesh.position.set(0, 0.2, -0.6);
      groups.esp32.add(espMesh);
    }

    // 7. Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
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

  // Update explosion offset when slider or active subsystem changes
  useEffect(() => {
    const groups = subsystemGroupsRef.current;
    Object.entries(SUBSYSTEMS_DATA).forEach(([k, data]) => {
      const g = groups[k];
      if (!g) return;
      const isSelected = activeSubsystem === k;
      const factor = isSelected ? Math.max(explodeFactor, 0.65) : explodeFactor;
      g.position.set(
        data.explodeOffset[0] * factor,
        data.explodeOffset[1] * factor,
        data.explodeOffset[2] * factor
      );
    });
  }, [explodeFactor, activeSubsystem]);

  const handleResetCamera = () => {
    setExplodeFactor(0);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.2, 3.2, 4.2);
      controlsRef.current.target.set(0, 0.2, 0);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* 1. Circular Outer Frame (3px solid #F4AE52, VEYRA & Wireframe Contract) */}
      <div
        className="relative w-full aspect-square max-w-[460px] max-h-[460px] rounded-full overflow-hidden shadow-2xl flex items-center justify-center"
        style={{
          border: '3px solid #F4AE52',
          boxShadow: '0 0 35px rgba(244,174,82,0.2), inset 0 0 25px rgba(0,0,0,0.6)',
          backgroundColor: '#2A1A0E',
        }}
      >
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2A1A0E]/80 backdrop-blur-sm z-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#D4621A] border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-mono text-[#F4AE52]">Loading 3D Assembly...</span>
          </div>
        )}

        {/* 2. VEYRA 48px Hotspot Overlay Targets */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Chassis Hotspot */}
          <button
            type="button"
            onClick={() => onSelectSubsystem && onSelectSubsystem('chassis')}
            onMouseEnter={() => setHoveredHotspot('chassis')}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="pointer-events-auto absolute top-[72%] left-[48%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F4AE52] hover:bg-[#D4621A] text-[#2A1A0E] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title="Chassis & Deck"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* L298N Driver Hotspot */}
          <button
            type="button"
            onClick={() => onSelectSubsystem && onSelectSubsystem('l298n')}
            onMouseEnter={() => setHoveredHotspot('l298n')}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="pointer-events-auto absolute top-[36%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title="L298N Motor Driver"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Battery Hotspot */}
          <button
            type="button"
            onClick={() => onSelectSubsystem && onSelectSubsystem('battery')}
            onMouseEnter={() => setHoveredHotspot('battery')}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="pointer-events-auto absolute top-[44%] left-[42%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F4AE52] hover:bg-[#D4621A] text-[#2A1A0E] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title="3S Battery Pack"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* ESP32 Hotspot */}
          <button
            type="button"
            onClick={() => onSelectSubsystem && onSelectSubsystem('esp32')}
            onMouseEnter={() => setHoveredHotspot('esp32')}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="pointer-events-auto absolute top-[38%] left-[28%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F4AE52] hover:bg-[#D4621A] text-[#2A1A0E] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title="ESP32-WROOM"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Wheels Hotspot */}
          <button
            type="button"
            onClick={() => onSelectSubsystem && onSelectSubsystem('wheels')}
            onMouseEnter={() => setHoveredHotspot('wheels')}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="pointer-events-auto absolute top-[62%] left-[78%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FEF3E2] hover:bg-[#F4AE52] text-[#2A1A0E] flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title="Wheels & Traction"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Hovered Hotspot Label Card */}
        {hoveredHotspot && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2A1A0E]/90 border border-[#F4AE52]/40 text-xs font-mono text-[#F4AE52] shadow-xl pointer-events-none z-20">
            {SUBSYSTEMS_DATA[hoveredHotspot].name}
          </div>
        )}
      </div>

      {/* 3. Compact Pill Dock (Explode Slider & Reset View) */}
      <div
        className="mt-4 px-5 py-2.5 rounded-full flex items-center gap-4 text-xs font-mono shadow-xl z-20"
        style={{
          background: 'rgba(42, 26, 14, 0.95)',
          border: '1.5px solid rgba(254, 243, 226, 0.18)',
        }}
      >
        <span className="text-[#8C7360] uppercase tracking-wider text-[10px]">
          Explode:
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={explodeFactor}
          onChange={(e) => setExplodeFactor(Number(e.target.value))}
          className="w-28 sm:w-36 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D4621A] bg-[#3D2414]"
        />
        <span className="text-[#F4AE52] font-mono min-w-[36px]">
          {Math.round(explodeFactor * 100)}%
        </span>

        <button
          onClick={handleResetCamera}
          title="Reset View"
          className="p-1 rounded-full text-[#FEF3E2]/60 hover:text-[#FEF3E2] hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
