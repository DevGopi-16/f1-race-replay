// // session-panel.js — Sessions browser (full calendar, real backend data)
// // Fetches every event on the schedule for a given year from /api/schedule/{year}
// // and renders it as a glassmorphism card grid, each with a unique animated
// // circuit silhouette and a live mouse-driven 3D tilt. Clicking a card jumps
// // into the picker flow and loads that session's replay.

// const FLAG_EMOJI_SP = {
//   "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "United States": "🇺🇸",
//   "Canada": "🇨🇦", "Monaco": "🇲🇨", "Spain": "🇪🇸", "Austria": "🇦🇹",
//   "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱",
//   "Italy": "🇮🇹", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬", "Mexico": "🇲🇽",
//   "Brazil": "🇧🇷", "Qatar": "🇶🇦", "United Arab Emirates": "🇦🇪",
//   "Saudi Arabia": "🇸🇦", "Bahrain": "🇧🇭",
// };

// const KNOWN_TRACK_PATHS = {
//   bahrain:
//     'M30,60 L60,60 C70,60 70,45 80,45 L120,45 C130,45 130,60 140,60 L165,60 C172,60 172,72 165,72 L100,72 C92,72 92,85 82,85 L45,85 C35,85 35,72 42,72 L30,72 Z',
//   saudiarabia:
//     'M25,70 C25,55 40,55 45,65 C50,75 60,60 65,50 C70,40 85,40 88,50 C92,62 105,58 108,45 C111,32 130,32 135,42 C142,55 160,50 165,62 C170,74 155,80 148,72 C140,63 130,70 132,80 C134,92 115,95 110,84 C105,73 92,78 90,88 C87,100 65,98 63,86 C61,76 48,80 44,88 C38,98 20,90 25,78 Z',
//   australia:
//     'M45,45 C65,35 85,40 90,55 C95,70 75,72 78,85 C81,98 105,100 115,88 C122,79 110,73 118,62 C128,48 150,45 158,58 C165,70 155,85 140,80 C130,77 132,65 122,63 C112,61 108,75 95,80 C78,86 60,84 50,74 C42,66 42,52 45,45 Z',
//   japan:
//     'M45,50 C60,40 75,45 78,58 C81,70 65,68 68,80 C71,92 95,94 105,82 C112,73 100,68 108,58 C116,48 140,46 150,58 C158,68 148,80 135,76 C126,73 128,62 118,60 C108,58 105,72 92,76 C78,80 62,78 52,68 C44,60 42,55 45,50 Z',
//   china:
//     'M40,50 L100,50 C112,50 112,62 100,62 L80,62 C70,62 70,74 80,74 L150,74 C160,74 160,86 150,86 L60,86 C48,86 48,98 60,98 L40,98 C30,98 30,86 40,86 L55,86 C65,86 65,74 55,74 L40,74 C30,74 30,62 40,62 Z',
//   miami:
//     'M42,60 C40,44 58,36 74,40 C88,44 84,54 96,56 C110,58 112,42 130,42 C146,42 152,54 146,64 C140,74 130,66 120,70 C110,74 114,86 98,88 C82,90 66,90 52,82 C44,78 43,68 42,60 Z',
//   imola:
//     'M40,68 C38,52 55,42 70,46 C85,50 78,60 90,64 C104,68 108,50 125,48 C142,46 155,54 158,66 C161,80 148,88 135,82 C124,77 128,66 115,64 C102,62 96,74 82,78 C68,82 55,84 46,78 C42,76 40,72 40,68 Z',
//   monaco:
//     'M35,60 C35,45 50,38 62,44 C72,49 68,58 78,60 C92,63 95,45 112,44 C130,43 145,50 148,62 C151,75 138,80 128,74 C118,68 122,58 108,58 C96,58 92,70 78,72 C64,74 55,80 45,74 C38,70 35,66 35,60 Z',
//   canada:
//     'M50,50 C60,35 90,32 100,45 C108,56 95,60 100,72 C106,86 130,80 140,65 C150,50 150,90 130,100 C108,111 95,95 80,100 C62,106 45,95 42,78 C40,66 44,58 50,50 Z',
//   spain:
//     'M45,55 C42,40 58,30 75,34 C90,38 85,50 98,52 C112,54 118,40 132,42 C148,44 155,58 148,70 C140,84 125,72 112,78 C100,84 102,96 85,98 C65,100 48,92 44,75 C42,68 44,60 45,55 Z',
//   austria:
//     'M60,100 C50,85 55,60 75,50 C95,40 100,55 115,45 C130,35 125,20 150,22 C170,24 175,42 160,55 C148,66 140,60 130,68 C120,76 125,90 108,98 C90,106 72,112 60,100 Z',
//   unitedkingdom:
//     'M40,70 C40,45 60,30 85,32 C105,34 100,50 118,48 C138,46 140,25 165,28 C185,31 190,50 175,62 C160,74 150,58 135,66 C120,74 122,90 100,92 C75,95 60,95 45,85 C40,82 40,76 40,70 Z',
//   hungary:
//     'M50,45 C70,38 78,50 72,60 C66,70 80,72 92,66 C106,59 120,64 118,76 C116,88 98,90 88,84 C78,78 66,84 62,94 C58,104 40,100 42,88 C44,78 56,78 58,68 C60,58 42,54 50,45 Z',
//   belgium:
//     'M35,90 C30,75 42,68 50,58 C58,48 50,38 62,32 C74,26 84,36 82,46 C80,56 94,52 104,44 C114,36 128,42 124,54 C120,66 136,64 148,54 C158,46 168,56 162,68 C154,82 138,78 128,86 C118,94 100,92 92,98 C82,105 60,102 50,96 C44,92 38,96 35,90 Z',
//   netherlands:
//     'M45,65 C40,50 55,42 68,46 C78,49 74,58 84,60 C96,63 100,48 116,48 C132,48 140,60 134,70 C128,80 116,74 108,78 C100,82 104,92 92,94 C80,96 68,92 60,84 C52,77 50,72 45,65 Z',
//   italy:
//     'M40,55 L110,55 C118,55 118,42 126,42 L145,42 C153,42 153,55 145,55 L140,55 C132,55 132,68 140,68 L150,68 C158,68 158,80 150,80 L60,80 C52,80 52,92 44,92 L38,92 C30,92 30,80 38,80 L45,80 C53,80 53,68 45,68 L40,68 Z',
//   azerbaijan:
//     'M30,50 L155,50 C165,50 165,60 155,60 L100,60 C94,60 94,70 100,70 L120,70 C128,70 128,80 120,80 L45,80 C37,80 37,92 45,92 L60,92 C68,92 68,102 60,102 L35,102 C25,102 25,90 35,90 L38,90 C46,90 46,80 38,80 L30,80 C20,80 20,62 30,60 Z',
//   singapore:
//     'M35,45 C55,38 60,52 50,60 C42,66 52,74 64,70 C78,65 82,52 96,50 C110,48 118,60 110,68 C102,76 90,70 82,78 C74,86 84,96 98,94 C114,92 120,104 108,110 C94,117 78,108 74,96 C70,86 58,90 52,82 C44,72 32,74 28,64 C24,54 28,50 35,45 Z',
//   unitedstates:
//     'M32,55 C32,42 48,38 55,48 C60,55 52,60 58,68 C66,78 84,70 88,58 C92,46 108,44 112,54 C116,64 132,58 140,66 C150,76 142,90 128,86 C118,83 116,72 106,76 C96,80 98,92 84,94 C70,96 58,86 60,74 C62,64 50,66 44,74 C36,84 24,76 28,64 C30,60 32,58 32,55 Z',
//   mexico:
//     'M40,80 C34,68 44,58 56,60 C64,62 62,72 70,74 C80,76 82,62 94,58 C108,53 122,60 120,72 C118,84 104,80 96,86 C88,92 92,102 80,104 C66,106 54,98 52,88 C50,80 44,86 40,80 Z',
//   brazil:
//     'M45,50 C58,42 72,48 72,58 C72,68 58,64 56,74 C54,86 70,92 84,86 C98,80 96,64 108,58 C122,51 138,60 134,72 C130,84 114,78 108,86 C102,94 110,104 96,106 C80,108 62,100 55,88 C50,79 40,80 38,70 C36,60 38,55 45,50 Z',
//   lasvegas:
//     'M25,60 L165,60 C172,60 172,70 165,70 L145,70 C138,70 138,80 145,80 L155,80 C162,80 162,90 155,90 L45,90 C38,90 38,80 45,80 L60,80 C67,80 67,70 60,70 L25,70 Z',
//   qatar:
//     'M40,45 C58,40 66,52 60,62 C55,70 66,74 76,68 C88,61 100,66 98,78 C96,90 110,88 118,78 C126,68 142,72 138,84 C134,96 116,94 108,86 C102,80 92,86 88,78 C84,70 70,74 62,82 C52,92 34,84 38,70 C40,63 32,60 34,52 C36,46 38,46 40,45 Z',
//   abudhabi:
//     'M35,50 C50,42 62,50 58,60 C55,68 68,68 76,60 C86,50 104,50 108,62 C111,71 100,74 96,82 C91,92 104,100 118,94 C130,89 144,96 138,106 C132,116 116,110 112,100 C108,90 96,94 90,86 C84,78 72,82 66,74 C58,64 44,68 40,60 C37,54 32,53 35,50 Z',
// };

// const KNOWN_MATCHERS = [
//   [/bahrain/, 'bahrain'],
//   [/saudi/, 'saudiarabia'],
//   [/australia/, 'australia'],
//   [/japan/, 'japan'],
//   [/china/, 'china'],
//   [/miami/, 'miami'],
//   [/emilia|imola/, 'imola'],
//   [/monaco/, 'monaco'],
//   [/canad/, 'canada'],
//   [/spain|spanish/, 'spain'],
//   [/austria/, 'austria'],
//   [/british|britain/, 'unitedkingdom'],
//   [/hungar/, 'hungary'],
//   [/belgian|belgium/, 'belgium'],
//   [/dutch|netherlands/, 'netherlands'],
//   [/italian|italy|monza/, 'italy'],
//   [/azerbaijan|baku/, 'azerbaijan'],
//   [/singapore/, 'singapore'],
//   [/las ?vegas/, 'lasvegas'],
//   [/united states|austin|cota/, 'unitedstates'],
//   [/mexic/, 'mexico'],
//   [/brazil|s[aã]o paulo|interlagos/, 'brazil'],
//   [/qatar/, 'qatar'],
//   [/abu ?dhabi/, 'abudhabi'],
// ];

// const FALLBACK_VARIANTS = [
//   'M40,68 C38,50 55,38 72,42 C88,46 82,58 96,60 C112,62 116,44 134,44 C152,44 162,56 158,70 C154,84 140,86 128,78 C118,72 122,60 108,58 C94,56 90,70 76,74 C62,78 48,82 42,74 C40,72 40,70 40,68 Z',
//   'M50,90 C30,80 30,50 55,40 C75,32 90,45 85,60 C80,75 100,80 115,65 C130,50 155,55 158,72 C160,88 140,100 120,92 C105,86 108,74 95,78 C78,84 68,98 50,90 Z',
// ];

// function hashString(s) {
//   let h = 0;
//   for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
//   return Math.abs(h);
// }

// function trackPathFor(eventName) {
//   const n = (eventName || "").toLowerCase();
//   for (const [re, key] of KNOWN_MATCHERS) {
//     if (re.test(n)) return KNOWN_TRACK_PATHS[key];
//   }
//   return FALLBACK_VARIANTS[hashString(n) % FALLBACK_VARIANTS.length];
// }

// const SPRINT_FORMATS_SP = new Set(["sprint", "sprint_qualifying", "sprint_shootout"]);

// function sessionBadgeSP(formatType) {
//   if (SPRINT_FORMATS_SP.has(formatType)) {
//     return '<span class="session-badge badge-sprint">S</span>';
//   }
//   return '<span class="session-badge badge-standard">R</span>';
// }

// function trackSvgSP(d, uid) {
//   return `
//     <svg viewBox="0 0 190 130" preserveAspectRatio="xMidYMid meet">
//       <path id="tp-${uid}" class="track-outline" d="${d}"/>
//       <circle class="track-car" r="4">
//         <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
//           <mpath href="#tp-${uid}"></mpath>
//         </animateMotion>
//       </circle>
//     </svg>`;
// }

// // Live mouse-driven 3D tilt — the whole card rotates toward the cursor.
// function attachTiltEffect(card) {
//   const maxTilt = 12; // degrees

//   card.addEventListener("mousemove", (e) => {
//     const rect = card.getBoundingClientRect();
//     const px = (e.clientX - rect.left) / rect.width;   // 0..1
//     const py = (e.clientY - rect.top) / rect.height;    // 0..1
//     const rotateY = (px - 0.5) * 2 * maxTilt;
//     const rotateX = -(py - 0.5) * 2 * maxTilt;
//     card.style.transform =
//       `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
//   });

//   card.addEventListener("mouseleave", () => {
//     card.style.transform = "";
//   });
// }

// let sessionsPanelInitialized = false;

// function initSessionsPanel() {
//   const yearSelect = document.getElementById("sessionsYearSelect");

//   if (!sessionsPanelInitialized) {
//     sessionsPanelInitialized = true;
//     const thisYear = new Date().getFullYear();
//     for (let y = thisYear; y >= 2018; y--) {
//       const opt = document.createElement("option");
//       opt.value = y;
//       opt.textContent = y;
//       yearSelect.appendChild(opt);
//     }
//     yearSelect.addEventListener("change", () => loadAllSessions(yearSelect.value));
//   }

//   loadAllSessions(yearSelect.value);
// }

// async function loadAllSessions(year) {
//   const grid = document.getElementById("raceGrid");
//   grid.innerHTML = `<p class="sessions-loading">Loading sessions…</p>`;

//   try {
//     const res = await fetch(`/api/schedule/${year}`);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const weekends = await res.json();

//     if (!weekends.length) {
//       grid.innerHTML = `<p class="sessions-loading">No sessions found for ${year}.</p>`;
//       return;
//     }

//     grid.innerHTML = weekends.map(w => {
//       const uid = `${year}-${w.round_number}`;
//       return `
//       <div class="race-card"
//            data-round="${w.round_number}"
//            data-year="${year}"
//            role="option"
//            tabindex="0">
//         <div class="race-card-head">
//           <div>
//             <p class="race-name">${w.event_name}</p>
//             <p class="circuit-name">${w.country}</p>
//           </div>
//           <div class="flag">${FLAG_EMOJI_SP[w.country] || "🏁"}</div>
//         </div>
//         <div class="track-wrap">${trackSvgSP(trackPathFor(w.event_name), uid)}</div>
//         <div class="race-card-foot">
//           <span class="race-date">${w.date}</span>
//           <span class="session-tag">RACE ${sessionBadgeSP(w.type)}</span>
//         </div>
//       </div>`;
//     }).join("");

//     grid.querySelectorAll(".race-card").forEach(card => {
//       const select = () => selectRaceCard(card);
//       card.addEventListener("click", select);
//       card.addEventListener("keydown", e => {
//         if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
//       });
//       attachTiltEffect(card);
//     });
//   } catch (e) {
//     grid.innerHTML = `<p class="sessions-loading">Couldn't load sessions: ${e.message}</p>`;
//   }
// }

// async function selectRaceCard(card) {
//   document.querySelectorAll("#raceGrid .race-card").forEach(c => {
//     c.classList.remove("selected");
//     c.setAttribute("aria-selected", "false");
//   });
//   card.classList.add("selected");
//   card.setAttribute("aria-selected", "true");

//   const y = card.dataset.year;
//   const r = card.dataset.round;

//   document.getElementById("sessionsPanel").classList.add("hidden");

//   goToPickerScreen();
//   document.getElementById("yearSelect").value = y;
//   await loadSchedule();
//   document.getElementById("roundSelect").value = r;
//   updateSessionOptions();
//   document.getElementById("sessionTypeSelect").value = "R";
//   submitLoadSession();
// }

// session-panel.js — Sessions browser (full calendar, real backend data)
// Fetches every event on the schedule for a given year from /api/schedule/{year}
// and renders it as a card grid. Each card shows a realistic, distinctive
// circuit silhouette (straights + corners, not just soft blobs) that
// self-animates with a live 3D tilt, plus a small car dot looping the track.
// Clicking a card jumps into the picker flow and loads that session's replay.

const FLAG_EMOJI_SP = {
  "Australia": "🇦🇺", "China": "🇨🇳", "Japan": "🇯🇵", "United States": "🇺🇸",
  "Canada": "🇨🇦", "Monaco": "🇲🇨", "Spain": "🇪🇸", "Austria": "🇦🇹",
  "United Kingdom": "🇬🇧", "Belgium": "🇧🇪", "Hungary": "🇭🇺", "Netherlands": "🇳🇱",
  "Italy": "🇮🇹", "Azerbaijan": "🇦🇿", "Singapore": "🇸🇬", "Mexico": "🇲🇽",
  "Brazil": "🇧🇷", "Qatar": "🇶🇦", "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦", "Bahrain": "🇧🇭",
};

// Stylized but more realistic circuit silhouettes — straights + corners,
// not just smooth blobs. Not geo-accurate, just visually distinct per GP.
// Swap for real per-circuit paths later via backend/src/track_geometry.py.
const KNOWN_TRACK_PATHS = {
  bahrain:
    'M25,70 L100,70 L100,50 L140,50 L140,35 L165,35 L165,60 L150,60 L150,75 L120,75 L120,95 L70,95 L70,85 L45,85 L45,70 Z',
  saudiarabia:
    'M25,70 C25,55 40,55 45,65 C50,75 60,60 65,50 C70,40 85,40 88,50 C92,62 105,58 108,45 C111,32 130,32 135,42 C142,55 160,50 165,62 C170,74 155,80 148,72 C140,63 130,70 132,80 C134,92 115,95 110,84 C105,73 92,78 90,88 C87,100 65,98 63,86 C61,76 48,80 44,88 C38,98 20,90 25,78 Z',
  australia:
    'M45,45 C65,35 85,40 90,55 C95,70 75,72 78,85 C81,98 105,100 115,88 C122,79 110,73 118,62 C128,48 150,45 158,58 C165,70 155,85 140,80 C130,77 132,65 122,63 C112,61 108,75 95,80 C78,86 60,84 50,74 C42,66 42,52 45,45 Z',
  japan:
    // Suzuka-style figure-8 crossover
    'M55,35 C75,28 92,38 88,52 C85,62 72,58 68,68 L100,92 C112,101 132,98 136,86 C139,76 126,74 122,64 L90,40 C82,32 66,30 55,35 Z M96,64 L100,68',
  china:
    'M40,50 L100,50 C112,50 112,62 100,62 L80,62 C70,62 70,74 80,74 L150,74 C160,74 160,86 150,86 L60,86 C48,86 48,98 60,98 L40,98 C30,98 30,86 40,86 L55,86 C65,86 65,74 55,74 L40,74 C30,74 30,62 40,62 Z',
  miami:
    'M42,60 C40,44 58,36 74,40 C88,44 84,54 96,56 C110,58 112,42 130,42 C146,42 152,54 146,64 C140,74 130,66 120,70 C110,74 114,86 98,88 C82,90 66,90 52,82 C44,78 43,68 42,60 Z',
  imola:
    'M40,68 C38,52 55,42 70,46 C85,50 78,60 90,64 C104,68 108,50 125,48 C142,46 155,54 158,66 C161,80 148,88 135,82 C124,77 128,66 115,64 C102,62 96,74 82,78 C68,82 55,84 46,78 C42,76 40,72 40,68 Z',
  monaco:
    // Monte Carlo — tight street corners, Loews hairpin
    'M30,55 L60,55 L65,45 L90,45 L95,60 L120,60 C130,60 130,50 140,50 L155,50 L155,65 L145,70 L150,85 L120,90 L100,90 L95,75 L70,75 L65,90 L40,90 L35,75 L45,70 L30,70 Z',
  canada:
    'M50,50 C60,35 90,32 100,45 C108,56 95,60 100,72 C106,86 130,80 140,65 C150,50 150,90 130,100 C108,111 95,95 80,100 C62,106 45,95 42,78 C40,66 44,58 50,50 Z',
  spain:
    'M45,55 C42,40 58,30 75,34 C90,38 85,50 98,52 C112,54 118,40 132,42 C148,44 155,58 148,70 C140,84 125,72 112,78 C100,84 102,96 85,98 C65,100 48,92 44,75 C42,68 44,60 45,55 Z',
  austria:
    'M60,100 C50,85 55,60 75,50 C95,40 100,55 115,45 C130,35 125,20 150,22 C170,24 175,42 160,55 C148,66 140,60 130,68 C120,76 125,90 108,98 C90,106 72,112 60,100 Z',
  unitedkingdom:
    'M40,70 C40,45 60,30 85,32 C105,34 100,50 118,48 C138,46 140,25 165,28 C185,31 190,50 175,62 C160,74 150,58 135,66 C120,74 122,90 100,92 C75,95 60,95 45,85 C40,82 40,76 40,70 Z',
  hungary:
    'M50,45 C70,38 78,50 72,60 C66,70 80,72 92,66 C106,59 120,64 118,76 C116,88 98,90 88,84 C78,78 66,84 62,94 C58,104 40,100 42,88 C44,78 56,78 58,68 C60,58 42,54 50,45 Z',
  belgium:
    // Spa — long straight, Eau Rouge kink, Bus Stop chicane
    'M20,85 L60,85 L65,70 C68,60 78,60 82,70 L88,85 L140,85 C150,85 150,73 140,73 L120,73 L120,55 L150,55 L160,65 L160,95 L100,95 L95,105 L60,105 L55,95 L20,95 Z',
  netherlands:
    'M45,65 C40,50 55,42 68,46 C78,49 74,58 84,60 C96,63 100,48 116,48 C132,48 140,60 134,70 C128,80 116,74 108,78 C100,82 104,92 92,94 C80,96 68,92 60,84 C52,77 50,72 45,65 Z',
  italy:
    // Monza — long straights + chicane kinks
    'M40,55 L110,55 C118,55 118,42 126,42 L145,42 C153,42 153,55 145,55 L140,55 C132,55 132,68 140,68 L150,68 C158,68 158,80 150,80 L60,80 C52,80 52,92 44,92 L38,92 C30,92 30,80 38,80 L45,80 C53,80 53,68 45,68 L40,68 Z',
  azerbaijan:
    // Baku — very long straight + tight old-town section
    'M30,50 L155,50 C165,50 165,60 155,60 L100,60 C94,60 94,70 100,70 L120,70 C128,70 128,80 120,80 L45,80 C37,80 37,92 45,92 L60,92 C68,92 68,102 60,102 L35,102 C25,102 25,90 35,90 L38,90 C46,90 46,80 38,80 L30,80 C20,80 20,62 30,60 Z',
  singapore:
    // Marina Bay street circuit — many tight 90-degree corners
    'M30,50 L70,50 L70,65 L55,65 L55,80 L90,80 L90,60 L110,60 L110,45 L140,45 L140,70 L120,70 L120,90 L150,90 L150,105 L100,105 L100,90 L70,90 L70,100 L40,100 L40,80 L30,80 Z',
  unitedstates:
    // COTA — esses at turn 1 then long back straight
    'M30,60 C40,45 55,45 58,58 C60,68 48,65 50,78 C52,90 70,92 78,80 L120,80 C130,80 130,65 140,65 L160,65 L160,50 L110,50 L110,65 L90,65 C82,65 80,52 70,50 C58,48 50,52 45,48 C38,44 32,52 30,60 Z',
  mexico:
    'M40,80 C34,68 44,58 56,60 C64,62 62,72 70,74 C80,76 82,62 94,58 C108,53 122,60 120,72 C118,84 104,80 96,86 C88,92 92,102 80,104 C66,106 54,98 52,88 C50,80 44,86 40,80 Z',
  brazil:
    'M45,50 C58,42 72,48 72,58 C72,68 58,64 56,74 C54,86 70,92 84,86 C98,80 96,64 108,58 C122,51 138,60 134,72 C130,84 114,78 108,86 C102,94 110,104 96,106 C80,108 62,100 55,88 C50,79 40,80 38,70 C36,60 38,55 45,50 Z',
  lasvegas:
    // The Strip — long rectangular straights
    'M25,60 L165,60 C172,60 172,70 165,70 L145,70 C138,70 138,80 145,80 L155,80 C162,80 162,90 155,90 L45,90 C38,90 38,80 45,80 L60,80 C67,80 67,70 60,70 L25,70 Z',
  qatar:
    'M40,45 C58,40 66,52 60,62 C55,70 66,74 76,68 C88,61 100,66 98,78 C96,90 110,88 118,78 C126,68 142,72 138,84 C134,96 116,94 108,86 C102,80 92,86 88,78 C84,70 70,74 62,82 C52,92 34,84 38,70 C40,63 32,60 34,52 C36,46 38,46 40,45 Z',
  abudhabi:
    'M35,50 C50,42 62,50 58,60 C55,68 68,68 76,60 C86,50 104,50 108,62 C111,71 100,74 96,82 C91,92 104,100 118,94 C130,89 144,96 138,106 C132,116 116,110 112,100 C108,90 96,94 90,86 C84,78 72,82 66,74 C58,64 44,68 40,60 C37,54 32,53 35,50 Z',
};

const KNOWN_MATCHERS = [
  [/bahrain/, 'bahrain'],
  [/saudi/, 'saudiarabia'],
  [/australia/, 'australia'],
  [/japan/, 'japan'],
  [/china/, 'china'],
  [/miami/, 'miami'],
  [/emilia|imola/, 'imola'],
  [/monaco/, 'monaco'],
  [/canad/, 'canada'],
  [/spain|spanish/, 'spain'],
  [/austria/, 'austria'],
  [/british|britain/, 'unitedkingdom'],
  [/hungar/, 'hungary'],
  [/belgian|belgium/, 'belgium'],
  [/dutch|netherlands/, 'netherlands'],
  [/italian|italy|monza/, 'italy'],
  [/azerbaijan|baku/, 'azerbaijan'],
  [/singapore/, 'singapore'],
  [/las ?vegas/, 'lasvegas'],
  [/united states|austin|cota/, 'unitedstates'],
  [/mexic/, 'mexico'],
  [/brazil|s[aã]o paulo|interlagos/, 'brazil'],
  [/qatar/, 'qatar'],
  [/abu ?dhabi/, 'abudhabi'],
];

const FALLBACK_VARIANTS = [
  'M40,68 C38,50 55,38 72,42 C88,46 82,58 96,60 C112,62 116,44 134,44 C152,44 162,56 158,70 C154,84 140,86 128,78 C118,72 122,60 108,58 C94,56 90,70 76,74 C62,78 48,82 42,74 C40,72 40,70 40,68 Z',
  'M50,90 C30,80 30,50 55,40 C75,32 90,45 85,60 C80,75 100,80 115,65 C130,50 155,55 158,72 C160,88 140,100 120,92 C105,86 108,74 95,78 C78,84 68,98 50,90 Z',
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function trackPathFor(eventName) {
  const n = (eventName || "").toLowerCase();
  for (const [re, key] of KNOWN_MATCHERS) {
    if (re.test(n)) return KNOWN_TRACK_PATHS[key];
  }
  return FALLBACK_VARIANTS[hashString(n) % FALLBACK_VARIANTS.length];
}

const SPRINT_FORMATS_SP = new Set(["sprint", "sprint_qualifying", "sprint_shootout"]);

function sessionBadgeSP(formatType) {
  if (SPRINT_FORMATS_SP.has(formatType)) {
    return '<span class="session-badge badge-sprint">S</span>';
  }
  return '<span class="session-badge badge-standard">R</span>';
}

function trackSvgSP(d, uid) {
  return `
    <svg viewBox="0 0 190 130" preserveAspectRatio="xMidYMid meet">
      <path id="tp-${uid}" class="track-outline" d="${d}"/>
      <circle class="track-car" r="4">
        <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
          <mpath href="#tp-${uid}"></mpath>
        </animateMotion>
      </circle>
    </svg>`;
}

let sessionsPanelInitialized = false;

function initSessionsPanel() {
  const yearSelect = document.getElementById("sessionsYearSelect");

  if (!sessionsPanelInitialized) {
    sessionsPanelInitialized = true;
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= 2018; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
    yearSelect.addEventListener("change", () => loadAllSessions(yearSelect.value));
  }

  loadAllSessions(yearSelect.value);
}

async function loadAllSessions(year) {
  const grid = document.getElementById("raceGrid");
  grid.innerHTML = `<p class="sessions-loading">Loading sessions…</p>`;

  try {
    const res = await fetch(`/api/schedule/${year}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const weekends = await res.json();

    if (!weekends.length) {
      grid.innerHTML = `<p class="sessions-loading">No sessions found for ${year}.</p>`;
      return;
    }

    grid.innerHTML = weekends.map(w => {
      const uid = `${year}-${w.round_number}`;
      return `
      <div class="race-card"
           data-round="${w.round_number}"
           data-year="${year}"
           role="option"
           tabindex="0">
        <div class="race-card-head">
          <div>
            <p class="race-name">${w.event_name}</p>
            <p class="circuit-name">${w.country}</p>
          </div>
          <div class="flag">${FLAG_EMOJI_SP[w.country] || "🏁"}</div>
        </div>
        <div class="track-wrap">${trackSvgSP(trackPathFor(w.event_name), uid)}</div>
        <div class="race-card-foot">
          <span class="race-date">${w.date}</span>
          <span class="session-tag">RACE ${sessionBadgeSP(w.type)}</span>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".race-card").forEach(card => {
      const select = () => selectRaceCard(card);
      card.addEventListener("click", select);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
      });
    });
  } catch (e) {
    grid.innerHTML = `<p class="sessions-loading">Couldn't load sessions: ${e.message}</p>`;
  }
}

async function selectRaceCard(card) {
  document.querySelectorAll("#raceGrid .race-card").forEach(c => {
    c.classList.remove("selected");
    c.setAttribute("aria-selected", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-selected", "true");

  const y = card.dataset.year;
  const r = card.dataset.round;

  document.getElementById("sessionsPanel").classList.add("hidden");

  goToPickerScreen();
  document.getElementById("yearSelect").value = y;
  await loadSchedule();
  document.getElementById("roundSelect").value = r;
  updateSessionOptions();
  document.getElementById("sessionTypeSelect").value = "R";
  submitLoadSession();
}