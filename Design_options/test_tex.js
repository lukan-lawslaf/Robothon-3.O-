import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';

const PORT = 8769;
const html = `<!DOCTYPE html>
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
  import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,64,64);
  ctx.fillStyle = '#ffff00'; ctx.fillRect(16,16,32,32);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  exporter.parse(scene, (res) => {
    console.log("GLB ArrayBuffer byteLength:", res.byteLength);
    fetch('/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob([res])
    });
  }, (err) => console.error("Export error:", err), { binary: true });
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/result') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      console.log('Exported GLB with canvas texture! Bytes:', buf.length);
      res.writeHead(200); res.end('OK');
      server.close();
      process.exit(0);
    });
  }
});

server.listen(PORT, () => {
  spawn('C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-sandbox', 'http://127.0.0.1:' + PORT + '/'
  ]);
});
