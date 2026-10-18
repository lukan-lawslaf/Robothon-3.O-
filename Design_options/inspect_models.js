import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8766;

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
<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

  const loader = new GLTFLoader();

  function analyze(name, url) {
    return new Promise((resolve) => {
      loader.load(url, (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const materials = [];
        gltf.scene.traverse(c => {
          if (c.material) {
            materials.push({
              name: c.material.name,
              color: c.material.color ? c.material.color.getHexString() : null,
              hasMap: !!c.material.map
            });
          }
        });

        resolve({
          name,
          box: { min: box.min.toArray(), max: box.max.toArray() },
          size: size.toArray(),
          center: center.toArray(),
          materialsCount: materials.length,
          sampleMaterials: materials.slice(0, 5)
        });
      }, undefined, (err) => resolve({ name, error: err.message }));
    });
  }

  async function run() {
    const esp = await analyze('esp32', '/esp32.glb');
    const l298 = await analyze('l298n', '/l298n.glb');
    await fetch('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esp, l298 })
    });
  }
  run();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.url === '/esp32.glb') {
    const file = fs.readFileSync(path.join(__dirname, 'esp32.glb'));
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(file);
  } else if (req.url === '/l298n.glb') {
    const file = fs.readFileSync(path.join(__dirname, 'l298n.glb'));
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    res.end(file);
  } else if (req.method === 'POST' && req.url === '/report') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('ANALYSIS RESULT:');
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
