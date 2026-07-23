async function loadTrackMap(year, gp, sessionType, driverCode, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="track-map-loading">Loading telemetry…</div>';

  const res = await fetch(`/api/track-map/${year}/${gp}/${sessionType}/${driverCode}`);
  const data = await res.json();

  if (data.error) {
    container.innerHTML = `<div class="track-map-error">No telemetry available</div>`;
    return;
  }

  renderTrackMap(data, container);
}

function speedToColor(speed, min, max) {
  const t = (speed - min) / (max - min);
  // blue (slow) -> teal -> green (fast), matches your app's accent color
  const r = Math.round(30 + t * 20);
  const g = Math.round(60 + t * 180);
  const b = Math.round(120 + t * 60);
  return `rgb(${r},${g},${b})`;
}

function renderTrackMap(data, container) {
  const { points, max_speed, min_speed, lap_time, driver } = data;

  let segments = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const color = speedToColor(p1.speed, min_speed, max_speed);
    segments += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="6" stroke-linecap="round" />`;
  }

  container.innerHTML = `
    <div class="track-map-header">
      <span class="track-map-title">FASTEST LAP</span>
      <span class="track-map-time">${lap_time}</span>
    </div>
    <svg viewBox="0 0 1000 1000" class="track-map-svg">
      ${segments}
    </svg>
    <div class="track-map-legend">
      <span>${min_speed} km/h</span>
      <div class="track-map-gradient"></div>
      <span>${max_speed} km/h</span>
    </div>
  `;
}