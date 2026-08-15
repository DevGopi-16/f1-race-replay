/* track-map.js — minimal 3D animated track map, sector-colored, powered by
   Three.js. Loaded dynamically from a CDN at runtime; no build step needed. */

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

const _activeLoops = new Map();

function disposeObject3D(obj) {
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
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

  if (!document.getElementById(containerId)) return;

  renderTrackMap3D(THREE, data, container, containerId);
}

// Fixed-resolution resample so geometry complexity — and therefore frame
// smoothness — never depends on how many raw telemetry points the lap has.
function resamplePoints(THREE, rawPoints, count) {
  const verts = rawPoints.map((p) => new THREE.Vector3(p.x - 500, 0, p.y - 500));
  const curve = new THREE.CatmullRomCurve3(verts, true, "catmullrom", 0.2);
  const spaced = curve.getSpacedPoints(count);
  return { curve, spacedPoints: spaced };
}

// Solid three-band texture (red / blue / yellow) mapped along the tube's
// length via its U coordinate — gives clean sector-colored bands with no
// text, no gradient blending between sectors.
const SECTOR_COLORS = ["#ff3b3b", "#3b82ff", "#ffd23b"];

function buildSectorTexture(THREE, resolution) {
  const width = Math.max(resolution, 3);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const third = width / 3;
  ctx.fillStyle = SECTOR_COLORS[0];
  ctx.fillRect(0, 0, Math.ceil(third), 1);
  ctx.fillStyle = SECTOR_COLORS[1];
  ctx.fillRect(Math.floor(third), 0, Math.ceil(third), 1);
  ctx.fillStyle = SECTOR_COLORS[2];
  ctx.fillRect(Math.floor(third * 2), 0, width - Math.floor(third * 2), 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function renderTrackMap3D(THREE, data, container, containerId) {
  const { lap_time } = data;
  const points = data.points;

  container.innerHTML = `
    <div class="track-map-header">
      <span class="track-map-title">FASTEST LAP</span>
      <span class="track-map-time">${lap_time}</span>
    </div>
    <div class="track-map-canvas-wrap"></div>
    <div class="track-map-legend">
      <span class="track-map-sector-dot" style="background:${SECTOR_COLORS[0]};"></span>
      <span class="track-map-sector-dot" style="background:${SECTOR_COLORS[1]};"></span>
      <span class="track-map-sector-dot" style="background:${SECTOR_COLORS[2]};"></span>
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

  const SAMPLE_COUNT = 220;
  const { curve, spacedPoints } = resamplePoints(THREE, points, SAMPLE_COUNT);

  const box = new THREE.Box3();
  spacedPoints.forEach((p) => box.expandByPoint(p));
  const boxCenter = box.getCenter(new THREE.Vector3());
  const boxSize = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(boxSize.x, boxSize.z);

  const tubeRadius = Math.max(maxDim * 0.006, 4);
  const sectorTexture = buildSectorTexture(THREE, SAMPLE_COUNT);

  const tubeGeometry = new THREE.TubeGeometry(curve, SAMPLE_COUNT, tubeRadius, 8, true);
  const tubeMaterial = new THREE.MeshBasicMaterial({ map: sectorTexture });
  const trackMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(trackMesh);

  // Soft outer glow — a slightly larger, low-opacity duplicate tube, same
  // sector colors.
  const glowGeometry = new THREE.TubeGeometry(curve, SAMPLE_COUNT, tubeRadius * 2.6, 8, true);
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: sectorTexture,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glowMesh);

  scene.add(new THREE.AmbientLight(0x445555, 1.0));

  const carGeo = new THREE.SphereGeometry(tubeRadius * 1.8, 16, 16);
  const carMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const carMesh = new THREE.Mesh(carGeo, carMat);
  scene.add(carMesh);

  const TRAIL_LEN = 9;
  const trailMeshes = [];
  for (let i = 0; i < TRAIL_LEN; i++) {
    const t = i / TRAIL_LEN;
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35 * (1 - t),
    });
    const trailMesh = new THREE.Mesh(new THREE.SphereGeometry(tubeRadius * 1.4 * (1 - t * 0.6), 8, 8), trailMat);
    scene.add(trailMesh);
    trailMeshes.push(trailMesh);
  }
  const carHistory = [];

  const camDistance = maxDim * 0.85;
  let angle = 0;
  const orbitSpeed = 0.0016;
  const camPos = new THREE.Vector3(
    boxCenter.x + camDistance * Math.cos(angle),
    camDistance * 0.5,
    boxCenter.z + camDistance * Math.sin(angle)
  );
  const camTarget = new THREE.Vector3(boxCenter.x, 0, boxCenter.z);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  const lapDurationMs = 11000;
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
    const targetPos = new THREE.Vector3(
      boxCenter.x + camDistance * Math.cos(angle),
      camDistance * 0.5,
      boxCenter.z + camDistance * Math.sin(angle)
    );
    camPos.lerp(targetPos, 0.06);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    const elapsed = (now - startTime) % lapDurationMs;
    const progress = elapsed / lapDurationMs;
    const carPos = curve.getPointAt(progress);
    carMesh.position.copy(carPos);

    carHistory.unshift(carPos.clone());
    if (carHistory.length > TRAIL_LEN) carHistory.pop();
    trailMeshes.forEach((mesh, i) => {
      const p = carHistory[i];
      if (p) mesh.position.copy(p);
    });

    renderer.render(scene, camera);
  }
  const firstRafId = requestAnimationFrame(animate);
  _activeLoops.set(containerId, { rafId: firstRafId, renderer, scene, onResize });
}

window.loadTrackMap = loadTrackMap;
