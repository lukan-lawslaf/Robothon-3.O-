import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8765;
const outputFile = path.join(__dirname, 'robothon_3_bot.glb');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GLB Exporter</title>
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
  <div id="status">Generating 3D model...</div>
  <script type="module">
    import * as THREE from 'three';
    import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

    console.log("Three.js loaded, building model...");

    // Root Bot Group
    const botRoot = new THREE.Group();
    botRoot.name = "Robothon_3_Bot";

    // Subsystem metadata
    const subsystems = {
      chassis: {
        name: "Chassis",
        group: new THREE.Group()
      },
      wheels: {
        name: "Wheels",
        group: new THREE.Group()
      },
      motors: {
        name: "DC_Motors",
        group: new THREE.Group()
      },
      l298n: {
        name: "L298N_Driver",
        group: new THREE.Group()
      },
      battery: {
        name: "Battery_Pack",
        group: new THREE.Group()
      },
      esp32: {
        name: "ESP32_WROOM",
        group: new THREE.Group()
      },
      wires: {
        name: "Wires_Harness",
        group: new THREE.Group()
      }
    };

    Object.entries(subsystems).forEach(([key, sub]) => {
      sub.group.name = sub.name;
      botRoot.add(sub.group);
    });

    // Materials
    const matBlackMetal = new THREE.MeshStandardMaterial({ color: 0x1e242b, metalness: 0.6, roughness: 0.4 });
    const matYellowDeck = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.1 });
    const matSilver = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.25 });
    const matWhiteRim = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const matRedPCB = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35 });
    const matBlueTerm = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
    const matDarkPCB = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
    const matDuctTape = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.45, roughness: 0.35 });

    // 1. CHASSIS
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 2.2), matBlackMetal);
    basePlate.name = "Chassis_BasePlate";
    subsystems.chassis.group.add(basePlate);

    [-0.68, 0.68].forEach((x, idx) => {
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 2.0), matBlackMetal);
      flange.position.set(x, -0.16, 0);
      flange.name = "Chassis_Flange_" + (idx === 0 ? "Left" : "Right");
      subsystems.chassis.group.add(flange);
    });

    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.02, 2.16), matYellowDeck);
    topDeck.position.y = 0.03;
    topDeck.name = "Chassis_YellowDeck";
    subsystems.chassis.group.add(topDeck);

    // 2 & 3. WHEELS & DC MOTORS (4WD)
    const wheelPositions = [
      { x: -0.95, z:  0.68, side: -1, name: "FL" },
      { x:  0.95, z:  0.68, side:  1, name: "FR" },
      { x: -0.95, z: -0.68, side: -1, name: "RL" },
      { x:  0.95, z: -0.68, side:  1, name: "RR" }
    ];

    wheelPositions.forEach(pos => {
      // Motor assembly
      const motorAssy = new THREE.Group();
      motorAssy.name = "Motor_" + pos.name;
      motorAssy.position.set(pos.side * 0.42, -0.18, pos.z);

      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 24), matSilver);
      can.rotation.z = Math.PI / 2;
      motorAssy.add(can);

      const gearbox = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 24), matSilver);
      gearbox.rotation.z = Math.PI / 2;
      gearbox.position.x = pos.side * 0.22;
      motorAssy.add(gearbox);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 16), matSilver);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = pos.side * 0.38;
      motorAssy.add(shaft);

      const hexNut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 6), matSilver);
      hexNut.rotation.z = Math.PI / 2;
      hexNut.position.x = pos.side * 0.36;
      motorAssy.add(hexNut);

      subsystems.motors.group.add(motorAssy);

      // Wheel assembly
      const wheelAssy = new THREE.Group();
      wheelAssy.name = "Wheel_" + pos.name;
      wheelAssy.position.set(pos.x, -0.18, pos.z);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 32), matTire);
      tire.rotation.z = Math.PI / 2;
      wheelAssy.add(tire);

      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const tread = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.025, 0.04), matTire);
        tread.position.set(0, Math.cos(angle) * 0.36, Math.sin(angle) * 0.36);
        tread.rotation.x = angle;
        wheelAssy.add(tread);
      }

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.29, 24), matWhiteRim);
      rim.rotation.z = Math.PI / 2;
      wheelAssy.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 16), matBlackMetal);
      hub.rotation.z = Math.PI / 2;
      wheelAssy.add(hub);

      subsystems.wheels.group.add(wheelAssy);
    });

    // 4. L298N MOTOR DRIVER
    const l298nAssy = new THREE.Group();
    l298nAssy.name = "L298N_Assembly";
    l298nAssy.position.set(0, 0.08, 0.68);

    const l298nPcb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.55), matRedPCB);
    l298nAssy.add(l298nPcb);

    const heatsink = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.18), matDarkPCB);
    heatsink.position.set(0, 0.12, -0.02);
    l298nAssy.add(heatsink);

    const termLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), matBlueTerm);
    termLeft.position.set(-0.21, 0.07, 0);
    l298nAssy.add(termLeft);

    const termRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), matBlueTerm);
    termRight.position.set(0.21, 0.07, 0);
    l298nAssy.add(termRight);

    const termFront = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.1), matBlueTerm);
    termFront.position.set(-0.04, 0.07, 0.21);
    l298nAssy.add(termFront);

    subsystems.l298n.group.add(l298nAssy);

    // 5. BATTERY PACK
    const batteryAssy = new THREE.Group();
    batteryAssy.name = "Battery_Assembly";
    batteryAssy.position.set(0, 0.15, -0.02);

    const batteryBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.52), matDuctTape);
    batteryAssy.add(batteryBody);

    const barrelJack = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 16), matDarkPCB);
    barrelJack.rotation.z = Math.PI / 4;
    barrelJack.position.set(0.2, 0.16, 0.15);
    batteryAssy.add(barrelJack);

    subsystems.battery.group.add(batteryAssy);

    // 6. ESP32-WROOM + MINI BREADBOARD
    const espAssy = new THREE.Group();
    espAssy.name = "ESP32_Assembly";
    espAssy.position.set(0, 0.08, -0.72);

    const breadboard = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.46), matWhiteRim);
    espAssy.add(breadboard);

    const espPcb = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 0.30), matDarkPCB);
    espPcb.position.y = 0.06;
    espAssy.add(espPcb);

    const rfShield = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.20), matSilver);
    rfShield.position.set(-0.12, 0.085, 0);
    espAssy.add(rfShield);

    const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.1), matSilver);
    usbPort.position.set(0.27, 0.075, 0);
    espAssy.add(usbPort);

    subsystems.esp32.group.add(espAssy);

    // 7. WIRES & JUMPER HARNESS
    function addWire(points, hexColor, radius = 0.014) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const geo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
      const mat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.4 });
      subsystems.wires.group.add(new THREE.Mesh(geo, mat));
    }

    const jumperColors = [0xef4444, 0x3b82f6, 0xeab308, 0x22c55e, 0xa855f7, 0xf97316];
    jumperColors.forEach((col, idx) => {
      const offset = (idx - 2.5) * 0.05;
      addWire([
        [offset, 0.14, -0.62],
        [offset * 1.4, 0.48 + (idx % 2) * 0.05, -0.05],
        [offset * 0.6, 0.15, 0.48]
      ], col, 0.012);
    });

    addWire([[0.15, 0.20, 0.15], [0.25, 0.32, 0.45], [-0.08, 0.14, 0.88]], 0xdc2626, 0.02);
    addWire([[0.05, 0.20, 0.15], [0.12, 0.30, 0.45], [0.02, 0.14, 0.88]], 0x111827, 0.02);
    addWire([[-0.22, 0.12, 0.68], [-0.52, 0.06, 0.68], [-0.52, -0.15, 0.68]], 0xdc2626, 0.015);
    addWire([[ 0.22, 0.12, 0.68], [ 0.52, 0.06, 0.68], [ 0.52, -0.15, 0.68]], 0xdc2626, 0.015);
    addWire([[-0.22, 0.12, 0.62], [-0.55, 0.06, -0.68], [-0.52, -0.15, -0.68]], 0x111827, 0.015);
    addWire([[ 0.22, 0.12, 0.62], [ 0.55, 0.06, -0.68], [ 0.52, -0.15, -0.68]], 0x111827, 0.015);

    // Export GLB
    const exporter = new GLTFExporter();
    exporter.parse(
      botRoot,
      async (result) => {
        console.log("GLTFExporter parsed successfully, byteLength:", result.byteLength);
        const blob = new Blob([result], { type: 'model/gltf-binary' });
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
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/export.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
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

  // Launch Chrome or Edge headless
  const chromePath = fs.existsSync("C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe")
    ? "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe"
    : "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe";

  console.log(`Launching browser: ${chromePath}`);
  const browserProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `http://127.0.0.1:${PORT}/export.html`
  ]);

  browserProc.on('error', (err) => {
    console.error('Failed to spawn browser:', err);
  });

  setTimeout(() => {
    if (!fs.existsSync(outputFile)) {
      console.error('Timeout waiting for GLB generation.');
      browserProc.kill();
      server.close();
      process.exit(1);
    } else {
      browserProc.kill();
    }
  }, 15000);
});
