import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8767;

const htmlContent = `<!DOCTYPE html>
<html>
<head>
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
<canvas id="c" width="400" height="300"></canvas>
<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

  const loader = new GLTFLoader();

  loader.load('/esp32.glb', (gltf) => {
    // Traverse children to find parts
    const parts = [];
    gltf.scene.traverse(c => {
      if (c.isMesh) {
        const box = new THREE.Box3().setFromObject(c);
        const s = new THREE.Vector3(); box.getSize(s);
        const ctr = new THREE.Vector3(); box.getCenter(ctr);
        parts.push({ name: c.name, size: s.toArray(), center: ctr.toArray() });
      }
    });

    loader.load('/l298n.glb', (lGltf) => {
      const lParts = [];
      lGltf.scene.traverse(c => {
        if (c.isMesh) {
          const box = new THREE.Box3().setFromObject(c);
          const s = new THREE.Vector3(); box.getSize(s);
          const ctr = new THREE.Vector3(); box.getCenter(ctr);
          lParts.push({ name: c.name, size: s.toArray(), center: ctr.toArray() });
        }
      });

      fetch('/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espParts: parts.slice(0, 10), lParts: lParts.slice(0, 10) })
      });
    });
  });
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.url === '/esp32.glb') {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(fs.readFileSync(path.join(__dirname, 'esp32.glb')));
  } else if (req.url === '/l298n.glb') {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(fs.readFileSync(path.join(__dirname, 'l298n.glb')));
  } else if (req.method === 'POST' && req.url === '/details') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('MODEL DETAILS:');
      console.log(JSON.stringify(JSON.parse(body), null, 2));
      res.writeHead(200);
      res.end('OK');
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
  }
});

server.listen(PORT, () => {
  const chromePath = "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe";
  spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', `http://127.0.0.1:${PORT}/`]);
});
