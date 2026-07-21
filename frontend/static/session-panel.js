// Each `path` is a stylized circuit silhouette (not geo-accurate) —
// swap these for real coordinates from backend/src/track_geometry.py
// (e.g. an endpoint that returns normalized SVG path data per circuit).
const RACES = [
  {
    id: 'gb',
    name: 'British Grand Prix',
    circuit: 'Silverstone Circuit',
    flag: '🇬🇧',
    date: '07 JUL 2024',
    session: 'trophy',
    path: 'M40,70 C40,45 60,30 85,32 C105,34 100,50 118,48 C138,46 140,25 165,28 C185,31 190,50 175,62 C160,74 150,58 135,66 C120,74 122,90 100,92 C75,95 60,95 45,85 C40,82 40,76 40,70 Z'
  },
  {
    id: 'at',
    name: 'Austrian Grand Prix',
    circuit: 'Red Bull Ring',
    flag: '🇦🇹',
    date: '30 JUN 2024',
    session: 'sprint',
    path: 'M60,100 C50,85 55,60 75,50 C95,40 100,55 115,45 C130,35 125,20 150,22 C170,24 175,42 160,55 C148,66 140,60 130,68 C120,76 125,90 108,98 C90,106 72,112 60,100 Z'
  },
  {
    id: 'ca',
    name: 'Canadian Grand Prix',
    circuit: 'Circuit Gilles Villeneuve',
    flag: '🇨🇦',
    date: '09 JUN 2024',
    session: 'standard',
    path: 'M50,50 C60,35 90,32 100,45 C108,56 95,60 100,72 C106,86 130,80 140,65 C150,50 150,90 130,100 C108,111 95,95 80,100 C62,106 45,95 42,78 C40,66 44,58 50,50 Z'
  },
  {
    id: 'es',
    name: 'Spanish Grand Prix',
    circuit: 'Circuit de Barcelona-Catalunya',
    flag: '🇪🇸',
    date: '23 JUN 2024',
    session: 'sprint',
    path: 'M45,55 C42,40 58,30 75,34 C90,38 85,50 98,52 C112,54 118,40 132,42 C148,44 155,58 148,70 C140,84 125,72 112,78 C100,84 102,96 85,98 C65,100 48,92 44,75 C42,68 44,60 45,55 Z'
  },
  {
    id: 'mc',
    name: 'Monaco Grand Prix',
    circuit: 'Monte Carlo',
    flag: '🇲🇨',
    date: '26 MAY 2024',
    session: 'standard',
    path: 'M35,60 C35,45 50,38 62,44 C72,49 68,58 78,60 C92,63 95,45 112,44 C130,43 145,50 148,62 C151,75 138,80 128,74 C118,68 122,58 108,58 C96,58 92,70 78,72 C64,74 55,80 45,74 C38,70 35,66 35,60 Z'
  },
  {
    id: 'it2',
    name: 'Emilia Romagna GP',
    circuit: 'Imola Circuit',
    flag: '🇮🇹',
    date: '19 MAY 2024',
    session: 'standard',
    path: 'M40,68 C38,52 55,42 70,46 C85,50 78,60 90,64 C104,68 108,50 125,48 C142,46 155,54 158,66 C161,80 148,88 135,82 C124,77 128,66 115,64 C102,62 96,74 82,78 C68,82 55,84 46,78 C42,76 40,72 40,68 Z'
  },
  {
    id: 'us2',
    name: 'Miami Grand Prix',
    circuit: 'Miami International Circuit',
    flag: '🇺🇸',
    date: '05 MAY 2024',
    session: 'sprint',
    path: 'M42,60 C40,44 58,36 74,40 C88,44 84,54 96,56 C110,58 112,42 130,42 C146,42 152,54 146,64 C140,74 130,66 120,70 C110,74 114,86 98,88 C82,90 66,90 52,82 C44,78 43,68 42,60 Z'
  },
  {
    id: 'jp',
    name: 'Japanese Grand Prix',
    circuit: 'Suzuka Circuit',
    flag: '🇯🇵',
    date: '07 APR 2024',
    session: 'cancelled',
    path: 'M45,50 C60,40 75,45 78,58 C81,70 65,68 68,80 C71,92 95,94 105,82 C112,73 100,68 108,58 C116,48 140,46 150,58 C158,68 148,80 135,76 C126,73 128,62 118,60 C108,58 105,72 92,76 C78,80 62,78 52,68 C44,60 42,55 45,50 Z'
  }
];

function badgeFor(session){
  switch(session){
    case 'trophy':    return '<span class="session-badge badge-trophy">🏆</span>';
    case 'sprint':    return '<span class="session-badge badge-sprint">S</span>';
    case 'cancelled': return '<span class="session-badge badge-cancelled">✕</span>';
    default:          return '<span class="session-badge badge-standard">R</span>';
  }
}

function trackSvg(d){
  return `<svg viewBox="0 0 190 130" preserveAspectRatio="xMidYMid meet"><path d="${d}"/></svg>`;
}

function render(){
  const grid = document.getElementById('raceGrid');
  grid.innerHTML = RACES.map((r, i) => `
    <div class="race-card${i === 0 ? ' selected' : ''}"
         data-id="${r.id}"
         role="option"
         aria-selected="${i === 0}"
         tabindex="0">
      <div class="race-card-head">
        <div>
          <p class="race-name">${r.name}</p>
          <p class="circuit-name">${r.circuit}</p>
        </div>
        <div class="flag">${r.flag}</div>
      </div>
      <div class="track-wrap">${trackSvg(r.path)}</div>
      <div class="race-card-foot">
        <span class="race-date">${r.date}</span>
        <span class="session-tag">RACE ${badgeFor(r.session)}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.race-card').forEach(card => {
    const select = () => {
      grid.querySelectorAll('.race-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-selected', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-selected', 'true');
      // Hook point: fire your own event / call your backend here.
      // e.g. fetch(`/api/session/${card.dataset.id}`).then(...)
      window.dispatchEvent(new CustomEvent('race-selected', { detail: card.dataset.id }));
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
  });
}

render();

// Example listener (remove — just shows how app.js would consume this):
window.addEventListener('race-selected', e => console.log('Selected race:', e.detail));