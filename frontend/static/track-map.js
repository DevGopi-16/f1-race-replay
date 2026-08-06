/* track-map.js — 3D animated track map, powered by Three.js
   Loaded dynamically from a CDN at runtime; no build step required. */

let _threeLoadPromise = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (_threeLoadPromise) return _threeLoadPromise;
  _threeLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/three@0.128.0/build/three.min.js";
    script.onload = () => resolve(window.THREE);
    script.onerror = () => reject(new Error("Failed to load three.js"));
    document.head.appendChild(script);
  });
  return _threeLoadPromise;
}

// One active render loop per container — switching drivers/views cancels
// the previous loop and disposes its WebGL context instead of stacking
// multiple contexts (browsers cap how many can exist at once).
const _activeLoops = new Map();

function disposeObject3D(obj) {
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        if (m.emissiveMap) m.emissiveMap.dispose();
        m.dispose();
      });
    }
  });
}

function stopTrackMapLoop(containerId) {
  const handle = _activeLoops.get(containerId);
  if (!handle) return;
  cancelAnimationFrame(handle.rafId);
  window.removeEventListener("resize", handle.onResize);
  if (handle.scene) disposeObject3D(handle.scene);
  if (handle.renderer) {
    handle.renderer.dispose();
    if (handle.renderer.domElement && handle.renderer.domElement.parentElement) {
      handle.renderer.domElement.remove();
    }
  }
  _activeLoops.delete(containerId);
}

async function loadTrackMap(year, gp, sessionType, driverCode, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  stopTrackMapLoop(containerId);
  container.innerHTML = '<div class="track-map-loading">Loading telemetry…</div>';

  let data;
  try {
    const res = await fetch(`/api/track-map/${year}/${gp}/${sessionType}/${driverCode}`);
    data = await res.json();
  } catch (err) {
    container.innerHTML = `<div class="track-map-error">No telemetry available</div>`;
    return;
  }

  if (!data || data.error || !data.points || !data.points.length) {
    container.innerHTML = `<div class="track-map-error">No telemetry available</div>`;
    return;
  }

  let THREE;
  try {
    THREE = await loadThree();
  } catch (err) {
    console.error("[track-map] three.js failed to load:", err);
    container.innerHTML = `<div class="track-map-error">3D view unavailable</div>`;
    return;
  }

  // Container may have been swapped out (user navigated away) while
  // three.js was loading over the network — bail out if so.
  if (!document.getElementById(containerId)) return;

  renderTrackMap3D(THREE, data, container, containerId);
}

function speedToColor(speed, min, max) {
  const t = Math.max(0, Math.min(1, (speed - min) / (max - min || 1)));
  const r = Math.round(30 + t * 20);
  const g = Math.round(60 + t * 180);
  const b = Math.round(120 + t * 60);
  return { r, g, b };
}

function buildSpeedTexture(THREE, points, minSpeed, maxSpeed) {
  const width = Math.max(points.length, 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < width; i++) {
    const p = points[Math.min(i, points.length - 1)];
    const c = speedToColor(p.speed, minSpeed, maxSpeed);
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
    ctx.fillRect(i, 0, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function renderTrackMap3D(THREE, data, container, containerId) {
  const { points, max_speed, min_speed, lap_time } = data;

  container.innerHTML = `
    <div class="track-map-header">
      <span class="track-map-title">FASTEST LAP</span>
      <span class="track-map-time">${lap_time}</span>
    </div>
    <div class="track-map-canvas-wrap"></div>
    <div class="track-map-legend">
      <span>${min_speed} km/h</span>
      <div class="track-map-gradient"></div>
      <span>${max_speed} km/h</span>
    </div>
  `;

  const canvasWrap = container.querySelector(".track-map-canvas-wrap");
  const width = canvasWrap.clientWidth || 300;
  const height = canvasWrap.clientHeight || 220;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  canvasWrap.appendChild(renderer.domElement);

  // Map flat (x, y) telemetry points onto the XZ ground plane.
  const vertices = points.map((p) => new THREE.Vector3(p.x - 500, 0, p.y - 500));
  const curve = new THREE.CatmullRomCurve3(vertices, true, "catmullrom", 0.2);

  const tubeSegments = Math.max(points.length * 2, 200);
  const tubeGeometry = new THREE.TubeGeometry(curve, tubeSegments, 6, 8, true);

  const speedTexture = buildSpeedTexture(THREE, points, min_speed, max_speed);
  const tubeMaterial = new THREE.MeshStandardMaterial({
    map: speedTexture,
    emissiveMap: speedTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.1,
  });
  const trackMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(trackMesh);

  const grid = new THREE.GridHelper(1400, 28, 0x2a3f3c, 0x162220);
  grid.position.y = -8;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0x445555, 0.9));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(200, 300, 150);
  scene.add(dirLight);

  const carGeo = new THREE.SphereGeometry(9, 16, 16);
  const carMat = new THREE.MeshStandardMaterial({
    color: 0x50f0b4,
    emissive: 0x50f0b4,
    emissiveIntensity: 1.2,
  });
  const carMesh = new THREE.Mesh(carGeo, carMat);
  scene.add(carMesh);

  const glowGeo = new THREE.SphereGeometry(16, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x50f0b4,
    transparent: true,
    opacity: 0.25,
  });
  carMesh.add(new THREE.Mesh(glowGeo, glowMat));

  const box = new THREE.Box3().setFromObject(trackMesh);
  const boxCenter = box.getCenter(new THREE.Vector3());
  const boxSize = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(boxSize.x, boxSize.z);
  const camDistance = maxDim * 0.9;

  let angle = 0;
  const orbitSpeed = 0.0018;

  function positionCamera() {
    camera.position.set(
      boxCenter.x + camDistance * Math.cos(angle),
      camDistance * 0.55,
      boxCenter.z + camDistance * Math.sin(angle)
    );
    camera.lookAt(boxCenter.x, 0, boxCenter.z);
  }
  positionCamera();

  const lapDurationMs = 12000;
  const startTime = performance.now();

  function onResize() {
    if (!document.body.contains(canvasWrap)) {
      stopTrackMapLoop(containerId);
      return;
    }
    const w = canvasWrap.clientWidth || width;
    const h = canvasWrap.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  function animate(now) {
    if (!document.body.contains(canvasWrap)) {
      stopTrackMapLoop(containerId);
      return;
    }
    const rafId = requestAnimationFrame(animate);
    _activeLoops.set(containerId, { rafId, renderer, scene, onResize });

    angle += orbitSpeed;
    positionCamera();

    const elapsed = (now - startTime) % lapDurationMs;
    const progress = elapsed / lapDurationMs;
    carMesh.position.copy(curve.getPointAt(progress));

    renderer.render(scene, camera);
  }
  const firstRafId = requestAnimationFrame(animate);
  _activeLoops.set(containerId, { rafId: firstRafId, renderer, scene, onResize });
}

window.loadTrackMap = loadTrackMap;
