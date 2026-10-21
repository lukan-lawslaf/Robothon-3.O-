import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8770;
const outputFile = path.join(__dirname, 'robothon_3_bot.glb');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Detailed GLB Generator</title>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <div id="status">Generating high-detail 3D model...</div>
  <script type="module">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

    console.log("Starting high-detail assembly...");

    // Helper: Canvas Textures
    function createYellowDeckTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Base yellow
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 1024, 1024);

      // Subtle surface noise/texture
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let i = 0; i < 5000; i++) {
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
      }

      // Hazard chevrons on Left and Right borders (width 80px)
      ctx.fillStyle = '#18181b';
      for (let y = -100; y < 1124; y += 40) {
        // Left chevron
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(70, y + 50);
        ctx.lineTo(70, y + 75);
        ctx.lineTo(0, y + 25);
        ctx.closePath();
        ctx.fill();

        // Right chevron
        ctx.beginPath();
        ctx.moveTo(1024, y);
        ctx.lineTo(954, y + 50);
        ctx.lineTo(954, y + 75);
        ctx.lineTo(1024, y + 25);
        ctx.closePath();
        ctx.fill();
      }

      // Border lines
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 6;
      ctx.strokeRect(70, 20, 884, 984);

      // Outer chamfer guides
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 40, 844, 944);

      // Header Banner (Front / Top)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(160, 50, 704, 70);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ FRONT // ROBOTHON 3.0 COMPETITION BOT ▲', 512, 98);

      // Main Center Graphics
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 68px "Segoe UI", Arial, sans-serif';
      ctx.fillText('ROBOTHON 3.0', 512, 450);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
      ctx.fillText('HIGH-TORQUE 4WD EXPLORATION & RESCUE PLATFORM', 512, 490);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText('CHASSIS SPEC: CH-REV-3.2  |  WEIGHT: 1.85 KG  |  12V DC DUAL DRIVE', 512, 520);

      // Subsystem Zone Boxes
      // Front Zone: L298N
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(200, 140, 624, 220);
      ctx.setLineDash([]);
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText('[ ZONE A: L298N MOTOR CONTROLLER // DUAL H-BRIDGE ]', 512, 170);

      // Mid Zone: Battery Bay
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(200, 560, 624, 160);
      ctx.setLineDash([]);
      ctx.fillText('[ ZONE B: 3S 11.1V 2200mAh Li-Ion POWER BAY ]', 512, 590);

      // Rear Zone: MCU
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(200, 740, 624, 220);
      ctx.setLineDash([]);
      ctx.fillText('[ ZONE C: ESP32-WROOM-32 Wi-Fi / BLE CONTROLLER ]', 512, 770);

      // Mounting hole circles on texture
      const holes = [
        [120, 70], [904, 70],
        [120, 512], [904, 512],
        [120, 954], [904, 954]
      ];
      holes.forEach(([hx, hy]) => {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(hx, hy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      return tex;
    }

    function createBatteryLabelTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Metallic silver-blue background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 256);

      // Top blue header bar
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(10, 10, 492, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LITHIUM-ION RECHARGEABLE PACK', 256, 42);

      // Capacity & Voltage
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 36px Arial, sans-serif';
      ctx.fillText('11.1V  2200mAh  24.4Wh', 256, 105);

      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('CONFIGURATION: 3S1P  |  DISCHARGE RATE: 30C PEAK', 256, 135);

      // Caution stripe
      ctx.fillStyle = '#eab308';
      ctx.fillRect(30, 160, 452, 28);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText('⚠ CAUTION: USE COMPATIBLE 3S BALANCE CHARGER ONLY', 256, 180);

      // Bottom compliance icons text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText('CE  RoHS  [♻ Li-Ion 18650]  MADE FOR ROBOTHON 3.0', 256, 225);

      return new THREE.CanvasTexture(canvas);
    }

    function createTireSidewallTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 512, 512);

      // Draw concentric rubber rings
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(256, 256, 220, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 175, 0, Math.PI * 2);
      ctx.stroke();

      // Circular embossed sidewall text
      ctx.save();
      ctx.translate(256, 256);
      ctx.fillStyle = '#71717a';
      ctx.font = 'bold 20px Arial, sans-serif';
      const text = "ROBOTHON ALL-TERRAIN ◆ 65mm GRIP MAX ◆ 4WD TRACTION ◆ ";
      const angleStep = (Math.PI * 2) / text.length;
      for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.rotate(i * angleStep);
        ctx.fillText(text[i], 0, -195);
        ctx.restore();
      }
      ctx.restore();

      return new THREE.CanvasTexture(canvas);
    }

    function createBreadboardTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 512, 256);

      // Red and Blue power lines
      ctx.fillStyle = '#ef4444'; // Red (+)
      ctx.fillRect(15, 20, 482, 4);
      ctx.fillRect(15, 232, 482, 4);

      ctx.fillStyle = '#3b82f6'; // Blue (-)
      ctx.fillRect(15, 32, 482, 4);
      ctx.fillRect(15, 220, 482, 4);

      // Center trough
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(15, 122, 482, 12);

      // Pin holes
      ctx.fillStyle = '#334155';
      for (let x = 30; x < 482; x += 15) {
        // Top section: 5 rows
        for (let y = 48; y <= 108; y += 15) {
          ctx.fillRect(x, y, 6, 6);
        }
        // Bottom section: 5 rows
        for (let y = 145; y <= 205; y += 15) {
          ctx.fillRect(x, y, 6, 6);
        }
      }

      // Title
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROBOTHON MINI PROTO-BOARD', 256, 132);

      return new THREE.CanvasTexture(canvas);
    }

    function createMotorLabelTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(0, 0, 512, 128);

      // Brushed texture lines
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 128; i += 3) {
        ctx.fillRect(0, i, 512, 1);
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 24px Arial, sans-serif';
      ctx.fillText('ROBOTHON 12V DC MOTOR', 20, 42);

      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillStyle = '#b91c1c';
      ctx.fillText('300 RPM  |  15 kg.cm TORQUE', 20, 72);

      ctx.font = '14px monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText('MODEL: GA25-370-12300  •  CE / RoHS', 20, 102);

      // Barcode graphic
      for (let x = 380; x < 490; x += 5) {
        if (Math.random() > 0.3) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, 25, Math.random() > 0.5 ? 3 : 2, 80);
        }
      }

      return new THREE.CanvasTexture(canvas);
    }

    // Material Library
    const deckTexture = createYellowDeckTexture();
    const batteryTexture = createBatteryLabelTexture();
    const tireTexture = createTireSidewallTexture();
    const breadboardTexture = createBreadboardTexture();
    const motorTexture = createMotorLabelTexture();

    const matChassisMetal = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      metalness: 0.75,
      roughness: 0.35
    });

    const matYellowDeck = new THREE.MeshStandardMaterial({
      map: deckTexture,
      roughness: 0.45,
      metalness: 0.15
    });

    const matTire = new THREE.MeshStandardMaterial({
      color: 0x17171a,
      roughness: 0.92,
      metalness: 0.05
    });

    const matTireSidewall = new THREE.MeshStandardMaterial({
      map: tireTexture,
      roughness: 0.88,
      metalness: 0.05
    });

    const matWhiteRim = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1
    });

    const matGoldHex = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25
    });

    const matSteel = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.88,
      roughness: 0.2
    });

    const matMotorCan = new THREE.MeshStandardMaterial({
      map: motorTexture,
      metalness: 0.8,
      roughness: 0.28
    });

    const matBattery = new THREE.MeshStandardMaterial({
      map: batteryTexture,
      roughness: 0.4,
      metalness: 0.2
    });

    const matBreadboard = new THREE.MeshStandardMaterial({
      map: breadboardTexture,
      roughness: 0.35,
      metalness: 0.05
    });

    const matXt60 = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.35,
      metalness: 0.1
    });

    const matStrap = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.05
    });

    const matScrew = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.15
    });

    const matBrassStandoff = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.3
    });

    // Helper: Add hex cap screw
    function createScrewMesh() {
      const screwGroup = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), matScrew);
      screwGroup.add(head);
      const innerHex = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 6), matChassisMetal);
      screwGroup.add(innerHex);
      return screwGroup;
    }

    // Helper: Add wire
    function createWire(subGroup, points, hexColor, radius = 0.012) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const geo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
      const mat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.45, metalness: 0.1 });
      const wire = new THREE.Mesh(geo, mat);
      subGroup.add(wire);
      return wire;
    }

    // Root Bot Group
    const botRoot = new THREE.Group();
    botRoot.name = "Robothon_3_Bot";

    const subsystems = {
      chassis: { name: "Chassis", group: new THREE.Group() },
      wheels: { name: "Wheels", group: new THREE.Group() },
      motors: { name: "DC_Motors", group: new THREE.Group() },
      l298n: { name: "L298N_Driver", group: new THREE.Group() },
      battery: { name: "Battery_Pack", group: new THREE.Group() },
      esp32: { name: "ESP32_WROOM", group: new THREE.Group() },
      wires: { name: "Wires_Harness", group: new THREE.Group() }
    };

    Object.entries(subsystems).forEach(([key, sub]) => {
      sub.group.name = sub.name;
      botRoot.add(sub.group);
    });

    // 1. CHASSIS SYSTEM
    // Main lower plate
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 2.2), matChassisMetal);
    subsystems.chassis.group.add(basePlate);

    // Front Bullbar / Angled Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.16), matChassisMetal);
    bumper.position.set(0, 0.02, 1.15);
    subsystems.chassis.group.add(bumper);

    [-0.72, 0.72].forEach(x => {
      const bumperGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.22), matTire);
      bumperGuard.position.set(x, 0.02, 1.16);
      subsystems.chassis.group.add(bumperGuard);
    });

    // Side downward motor mounting flanges
    [-0.68, 0.68].forEach(x => {
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 2.08), matChassisMetal);
      flange.position.set(x, -0.17, 0);
      subsystems.chassis.group.add(flange);
    });

    // Rear Tow / Handle Bar
    const rearBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.08), matChassisMetal);
    rearBar.position.set(0, 0.02, -1.14);
    subsystems.chassis.group.add(rearBar);

    // Yellow Competition Aero Top Deck
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.025, 2.16), matYellowDeck);
    topDeck.position.y = 0.033;
    subsystems.chassis.group.add(topDeck);

    // Screws along the chassis perimeter
    const screwCoords = [
      [-0.64, 0.05,  1.02], [ 0.64, 0.05,  1.02],
      [-0.64, 0.05,  0.00], [ 0.64, 0.05,  0.00],
      [-0.64, 0.05, -1.02], [ 0.64, 0.05, -1.02],
      [ 0.00, 0.05,  1.02], [ 0.00, 0.05, -1.02]
    ];
    screwCoords.forEach(([sx, sy, sz]) => {
      const sc = createScrewMesh();
      sc.position.set(sx, sy, sz);
      subsystems.chassis.group.add(sc);
    });

    // Rocker Power Switch on top deck
    const switchBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.18), matChassisMetal);
    switchBase.position.set(0.54, 0.06, -0.18);
    subsystems.chassis.group.add(switchBase);

    const switchRocker = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, emissive: 0x7f1d1d, emissiveIntensity: 0.5 })
    );
    switchRocker.position.set(0.54, 0.085, -0.18);
    switchRocker.rotation.x = 0.2;
    subsystems.chassis.group.add(switchRocker);

    // 4-Segment LED Battery Meter next to switch
    const ledColors = [0x22c55e, 0x22c55e, 0xeab308, 0xef4444];
    ledColors.forEach((col, idx) => {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 })
      );
      led.position.set(0.54, 0.055, -0.32 + idx * 0.035);
      subsystems.chassis.group.add(led);
    });

    // Piezo Buzzer on left deck
    const buzzer = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 24), matChassisMetal);
    buzzer.position.set(-0.54, 0.07, -0.18);
    subsystems.chassis.group.add(buzzer);

    const buzzerHole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.062, 16), matTire);
    buzzerHole.position.set(-0.54, 0.071, -0.18);
    subsystems.chassis.group.add(buzzerHole);

    // 2 & 3. 4WD WHEELS & HIGH-TORQUE DC MOTORS
    const wheelPositions = [
      { x: -0.96, z:  0.68, side: -1, name: "FL" },
      { x:  0.96, z:  0.68, side:  1, name: "FR" },
      { x: -0.96, z: -0.68, side: -1, name: "RL" },
      { x:  0.96, z: -0.68, side:  1, name: "RR" }
    ];

    wheelPositions.forEach(pos => {
      // MOTOR ASSEMBLY
      const motorAssy = new THREE.Group();
      motorAssy.name = "Motor_" + pos.name;
      motorAssy.position.set(pos.side * 0.42, -0.18, pos.z);

      // Motor cylindrical can
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.44, 32), matMotorCan);
      can.rotation.z = Math.PI / 2;
      motorAssy.add(can);

      // Rear end-cap with solder tabs
      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.04, 24), matChassisMetal);
      endCap.rotation.z = Math.PI / 2;
      endCap.position.x = -pos.side * 0.23;
      motorAssy.add(endCap);

      // Suppression ceramic capacitor
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }));
      cap.position.set(-pos.side * 0.26, 0.06, 0);
      motorAssy.add(cap);

      // Metal gearbox housing
      const gearbox = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.18, 32), matSteel);
      gearbox.rotation.z = Math.PI / 2;
      gearbox.position.x = pos.side * 0.23;
      motorAssy.add(gearbox);

      // Motor output shaft (D-shaft)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 16), matSteel);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = pos.side * 0.42;
      motorAssy.add(shaft);

      // Brass precision hex coupling
      const hexCoupling = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 6), matGoldHex);
      hexCoupling.rotation.z = Math.PI / 2;
      hexCoupling.position.x = pos.side * 0.40;
      motorAssy.add(hexCoupling);

      // Set screw in hex coupling
      const grubScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.10, 8), matScrew);
      grubScrew.position.set(pos.side * 0.40, 0.08, 0);
      motorAssy.add(grubScrew);

      // Steel L-bracket mount to chassis flange
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.28), matChassisMetal);
      bracket.position.set(pos.side * 0.25, 0.06, 0);
      motorAssy.add(bracket);

      subsystems.motors.group.add(motorAssy);

      // WHEEL ASSEMBLY
      const wheelAssy = new THREE.Group();
      wheelAssy.name = "Wheel_" + pos.name;
      wheelAssy.position.set(pos.x, -0.18, pos.z);

      // Main Tire Body
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.28, 32), matTire);
      tire.rotation.z = Math.PI / 2;
      wheelAssy.add(tire);

      // Sidewall disc with printed branding text
      const sidewall = new THREE.Mesh(new THREE.CylinderGeometry(0.371, 0.371, 0.02, 32), matTireSidewall);
      sidewall.rotation.z = Math.PI / 2;
      sidewall.position.x = pos.side * 0.135;
      wheelAssy.add(sidewall);

      // 20 Aggressive Off-Road Chevron Tread Lugs
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        // Dual V-shaped chevron lugs
        [-0.05, 0.05].forEach((zOff, lugIdx) => {
          const lug = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.045), matTire);
          lug.position.set(zOff, Math.cos(angle) * 0.375, Math.sin(angle) * 0.375);
          lug.rotation.x = angle;
          lug.rotation.y = (lugIdx === 0 ? 0.3 : -0.3);
          wheelAssy.add(lug);
        });
      }

      // Deep-Dish Rim with outer lip
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.29, 32), matWhiteRim);
      rim.rotation.z = Math.PI / 2;
      wheelAssy.add(rim);

      // 6 Circular Cutout Spoke Accents
      for (let s = 0; s < 6; s++) {
        const spokeAngle = (s / 6) * Math.PI * 2;
        const spokeCutout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.30, 16), matChassisMetal);
        spokeCutout.rotation.z = Math.PI / 2;
        spokeCutout.position.set(
          pos.side * 0.02,
          Math.cos(spokeAngle) * 0.17,
          Math.sin(spokeAngle) * 0.17
        );
        wheelAssy.add(spokeCutout);
      }

      // Center Hub with M4 Locknut
      const hubNut = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.33, 6), matSteel);
      hubNut.rotation.z = Math.PI / 2;
      wheelAssy.add(hubNut);

      // Center Axle Pin
      const axlePin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 12), matChassisMetal);
      axlePin.rotation.z = Math.PI / 2;
      wheelAssy.add(axlePin);

      subsystems.wheels.group.add(wheelAssy);
    });

    // 4. BATTERY PACK (3S Li-Ion Pack + XT60 + Balance Lead + Strap)
    const batteryAssy = new THREE.Group();
    batteryAssy.name = "Battery_Assembly";
    batteryAssy.position.set(0, 0.16, -0.05);

    // 3 Individual 18650 Cylinders visible in pack
    [-0.22, 0, 0.22].forEach(xOff => {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 24), matBattery);
      cell.rotation.x = Math.PI / 2;
      cell.position.set(xOff, 0, 0);
      batteryAssy.add(cell);
    });

    // Wrap cover
    const batteryBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.23, 0.66), matBattery);
    batteryAssy.add(batteryBody);

    // Yellow XT60 Connector at the front
    const xt60 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), matXt60);
    xt60.position.set(0.18, 0.12, 0.38);
    batteryAssy.add(xt60);

    // Gold pins in XT60
    [-0.03, 0.03].forEach(px => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 12), matGoldHex);
      pin.position.set(0.18 + px, 0.12, 0.48);
      batteryAssy.add(pin);
    });

    // 4-Pin JST-XH Balance Connector on side
    const jstXh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.14), matWhiteRim);
    jstXh.position.set(-0.25, 0.12, 0.36);
    batteryAssy.add(jstXh);

    // Woven Velcro Tie-Down Strap with buckle
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.25, 0.14), matStrap);
    strap.position.set(0, 0.01, 0);
    batteryAssy.add(strap);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.16), matChassisMetal);
    buckle.position.set(0, 0.14, 0);
    batteryAssy.add(buckle);

    subsystems.battery.group.add(batteryAssy);

    // 5. ESP32 BREADBOARD PLATFORM
    const espBaseAssy = new THREE.Group();
    espBaseAssy.name = "ESP32_Mounting_Base";
    espBaseAssy.position.set(0, 0.07, -0.68);

    // Detailed Breadboard
    const breadboard = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, 0.46), matBreadboard);
    espBaseAssy.add(breadboard);

    subsystems.esp32.group.add(espBaseAssy);

    // 6. L298N STANDOFFS BASE
    const l298BaseAssy = new THREE.Group();
    l298BaseAssy.name = "L298N_Standoffs";
    l298BaseAssy.position.set(0, 0.04, 0.58);

    // 4 Brass Standoffs under L298N PCB
    [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]].forEach(([sx, sz]) => {
      const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6), matBrassStandoff);
      standoff.position.set(sx, 0.03, sz);
      l298BaseAssy.add(standoff);

      const topScrew = createScrewMesh();
      topScrew.position.set(sx, 0.065, sz);
      l298BaseAssy.add(topScrew);
    });

    subsystems.l298n.group.add(l298BaseAssy);

    // 7. WIRING & HARNESS SYSTEM
    // DuPont logic jumper harness (ESP32 -> L298N)
    const jumperCols = [0xef4444, 0x3b82f6, 0xeab308, 0x22c55e, 0xa855f7, 0xf97316];
    jumperCols.forEach((col, idx) => {
      const xOff = (idx - 2.5) * 0.045;
      createWire(subsystems.wires.group, [
        [xOff, 0.12, -0.58],
        [xOff * 1.5, 0.38 + (idx % 2) * 0.04, -0.25],
        [xOff * 1.6, 0.38 + (idx % 2) * 0.04,  0.15],
        [xOff * 0.8, 0.16, 0.42]
      ], col, 0.011);

      // Black Dupont connector plugs at ends
      const plugA = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), matChassisMetal);
      plugA.position.set(xOff, 0.10, -0.58);
      subsystems.wires.group.add(plugA);

      const plugB = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), matChassisMetal);
      plugB.position.set(xOff * 0.8, 0.12, 0.42);
      subsystems.wires.group.add(plugB);
    });

    // Heavy Power Cable: XT60 -> Switch -> L298N
    createWire(subsystems.wires.group, [
      [0.18, 0.24, 0.34],
      [0.35, 0.20, 0.22],
      [0.54, 0.09, -0.08]
    ], 0xdc2626, 0.022); // Red +12V to switch

    createWire(subsystems.wires.group, [
      [0.54, 0.09, -0.05],
      [0.45, 0.15,  0.25],
      [0.10, 0.12,  0.72]
    ], 0xdc2626, 0.022); // Red switch to L298N terminal

    createWire(subsystems.wires.group, [
      [0.18, 0.22, 0.34],
      [0.25, 0.16, 0.45],
      [0.02, 0.12, 0.72]
    ], 0x111827, 0.022); // Black GND to L298N terminal

    // Motor Power Leads through chassis grommets
    // Left Motors
    createWire(subsystems.wires.group, [
      [-0.24, 0.12, 0.68],
      [-0.52, 0.06, 0.68],
      [-0.52, -0.16, 0.68]
    ], 0xdc2626, 0.016);
    createWire(subsystems.wires.group, [
      [-0.24, 0.12, 0.62],
      [-0.54, 0.06, -0.68],
      [-0.52, -0.16, -0.68]
    ], 0x111827, 0.016);

    // Right Motors
    createWire(subsystems.wires.group, [
      [ 0.24, 0.12, 0.68],
      [ 0.52, 0.06, 0.68],
      [ 0.52, -0.16, 0.68]
    ], 0xdc2626, 0.016);
    createWire(subsystems.wires.group, [
      [ 0.24, 0.12, 0.62],
      [ 0.54, 0.06, -0.68],
      [ 0.52, -0.16, -0.68]
    ], 0x111827, 0.016);

    // Rubber chassis wire pass-through grommets
    [[-0.52, 0.68], [-0.52, -0.68], [0.52, 0.68], [0.52, -0.68]].forEach(([gx, gz]) => {
      const grommet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), matTire);
      grommet.position.set(gx, 0.035, gz);
      subsystems.chassis.group.add(grommet);
    });

    // LOAD AUTHENTIC CAD MODELS: L298N & ESP32-WROOM
    const loader = new GLTFLoader();

    function loadModel(url) {
      return new Promise((resolve) => {
        loader.load(url, (gltf) => resolve(gltf), undefined, (err) => {
          console.warn("Failed to load " + url, err);
          resolve(null);
        });
      });
    }

    async function finishAssembly() {
      const [l298Gltf, espGltf] = await Promise.all([
        loadModel('/l298n.glb'),
        loadModel('/esp32.glb')
      ]);

      if (l298Gltf) {
        console.log("Integrating authentic L298N model...");
        const lBox = new THREE.Box3().setFromObject(l298Gltf.scene);
        const lCenter = new THREE.Vector3();
        lBox.getCenter(lCenter);

        // Center on X and Z, align bottom Y to 0
        l298Gltf.scene.position.set(-lCenter.x, -lBox.min.y, -lCenter.z);

        const lWrapper = new THREE.Group();
        lWrapper.name = "L298N_CAD_Model";
        lWrapper.add(l298Gltf.scene);
        lWrapper.scale.set(0.68, 0.68, 0.68);
        lWrapper.position.set(0, 0.07, 0.58);
        subsystems.l298n.group.add(lWrapper);
      }

      if (espGltf) {
        console.log("Integrating authentic ESP32-WROOM model...");
        const eBox = new THREE.Box3().setFromObject(espGltf.scene);
        const eCenter = new THREE.Vector3();
        eBox.getCenter(eCenter);

        // Center all axes
        espGltf.scene.position.set(-eCenter.x, -eBox.min.y, -eCenter.z);

        const espWrapper = new THREE.Group();
        espWrapper.name = "ESP32_CAD_Model";
        espWrapper.add(espGltf.scene);
        // Raw ESP32 board is ~0.049 length. Scale ~12.5 gives ~0.61 length on breadboard
        espWrapper.scale.set(12.5, 12.5, 12.5);
        // Orient with antenna facing forward, micro-USB facing rear
        espWrapper.rotation.y = Math.PI / 2;
        espWrapper.position.set(0, 0.10, -0.68);
        subsystems.esp32.group.add(espWrapper);
      }

      console.log("Assembly completed! Exporting GLB...");
      document.getElementById('status').textContent = "Exporting GLB...";

      const exporter = new GLTFExporter();
      exporter.parse(
        botRoot,
        async (result) => {
          console.log("GLTFExporter parsed successfully! Byte length:", result.byteLength);
          document.getElementById('status').textContent = "Saving to disk (" + result.byteLength + " bytes)...";
          const blob = new Blob([result], { type: 'application/octet-stream' });
          await fetch('/save-glb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob
          });
          document.getElementById('status').textContent = "Model saved successfully!";
        },
        (err) => {
          console.error("Export error:", err);
          document.getElementById('status').textContent = "Export error: " + err;
        },
        { binary: true }
      );
    }

    finishAssembly();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.url === '/l298n.glb') {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(fs.readFileSync(path.join(__dirname, 'l298n.glb')));
  } else if (req.url === '/esp32.glb') {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(fs.readFileSync(path.join(__dirname, 'esp32.glb')));
  } else if (req.method === 'POST' && req.url === '/save-glb') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputFile, buffer);
      console.log(`Successfully saved ${buffer.length} bytes to ${outputFile}`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  const chromePath = "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe";
  const browserProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `http://127.0.0.1:${PORT}/`
  ]);

  browserProc.on('error', (err) => console.error('Browser spawn error:', err));

  setTimeout(() => {
    if (!fs.existsSync(outputFile)) {
      console.error('Timeout waiting for GLB generation.');
      browserProc.kill();
      server.close();
      process.exit(1);
    } else {
      browserProc.kill();
    }
  }, 25000);
});
