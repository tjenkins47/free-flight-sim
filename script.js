// Free Flight – Phase 2 (Bright Start)
// Known-good script with: HUD bindings, touch controls, and fixed Pause toggle.

// --- Renderer & Scene ---
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setClearColor(0x04070f, 1.0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 5, 20);
scene.add(camera);

// --- Lights ---
const ambient = new THREE.AmbientLight(0x6b86c2, 0.55);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xaaccff, 0.8);
dir.position.set(50, 120, -120);
dir.castShadow = true;
scene.add(dir);

// --- Simple craft placeholder ---
const fuselage = new THREE.Mesh(
  new THREE.BoxGeometry(5, 2, 10),
  new THREE.MeshStandardMaterial({ color: 0x3399ff, metalness: 0.2, roughness: 0.6 })
);
fuselage.castShadow = true;
fuselage.receiveShadow = true;
scene.add(fuselage);

// --- State ---
const keys = Object.create(null);
let paused = false;
let lastPauseToggle = 0; // debounce
let throttlePct = 35;    // 0..100
let speed = 0;           // m/s (simulated)
let yaw = 0, pitch = 0, roll = 0; // radians

// --- HUD elements ---
const elThrottle = document.getElementById('throttle');
const elSpeed = document.getElementById('speed');
const elAltitude = document.getElementById('altitude');
const elPitch = document.getElementById('pitch');
const elRoll = document.getElementById('roll');
const elYaw = document.getElementById('yaw');
const pausedOverlay = document.getElementById('pausedOverlay');

function updateHUD() {
  elThrottle.textContent = `${Math.round(throttlePct)}%`;
  elSpeed.textContent = `${Math.round(speed)}`;
  elAltitude.textContent = `${Math.round(fuselage.position.y)}`;
  elPitch.textContent = `${Math.round(THREE.MathUtils.radToDeg(-pitch))}`;
  elRoll.textContent = `${Math.round(THREE.MathUtils.radToDeg(-roll))}`;
  elYaw.textContent = `${Math.round(THREE.MathUtils.radToDeg(yaw % (Math.PI*2)))}`;
}

// --- Helpers ---
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function resetCraft() {
  yaw = 0; pitch = 0; roll = 0;
  throttlePct = 35;
  speed = 0;
  fuselage.position.set(0, 5, 0);
  fuselage.rotation.set(0, 0, 0);
}

function togglePause() {
  const now = performance.now();
  if (now - lastPauseToggle < 200) return; // debounce to prevent multi-toggles on long-press
  paused = !paused;
  lastPauseToggle = now;
  pausedOverlay.classList.toggle('show', paused);
  // also reflect state on touch Pause button if present
  const tcPause = document.getElementById('tc-pause');
  if (tcPause) tcPause.textContent = paused ? 'Resume' : 'Pause';
}

// --- Input: keyboard ---
const handledCodes = new Set([
  'Numpad8','Numpad2', // throttle up/down
  'Numpad5','Numpad0', // pitch up/down
  'Numpad4','Numpad6', // roll left/right
  'Numpad7','Numpad9', // yaw left/right
  'Numpad1',           // brake
  'Numpad3',           // pause
  'NumpadDecimal'      // reset
]);

window.addEventListener('keydown', (e) => {
  if (handledCodes.has(e.code)) {
    e.preventDefault();
    // one-shot actions
    if (e.code === 'Numpad3') { togglePause(); return; }
    if (e.code === 'NumpadDecimal') { resetCraft(); return; }
  }
  keys[e.code] = true;
}, {passive:false});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
}, {passive:false});

// ensure canvas can receive focus (for certain devices/browsers)
canvas.addEventListener('pointerdown', () => canvas.focus());

// --- Input: touch controls ---
(function initTouchControls(){
  const tc = document.getElementById('touchControls');
  if (!tc) return;

  // if device supports touch, show block and set aria
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) {
    tc.style.display = 'block';
    tc.setAttribute('aria-hidden', 'false');
  }

  // bind hold-to-press behavior for btns with data-code
  tc.querySelectorAll('.btn[data-code]').forEach(btn => {
    const code = btn.getAttribute('data-code');

    const start = (ev) => { ev.preventDefault(); keys[code] = true; };
    const end = (ev) => { ev.preventDefault(); keys[code] = false; };

    btn.addEventListener('touchstart', start, {passive:false});
    btn.addEventListener('touchend', end, {passive:false});
    btn.addEventListener('touchcancel', end, {passive:false});
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  });

  // special tap actions
  const pauseBtn = document.getElementById('tc-pause');
  const resetBtn = document.getElementById('tc-reset');
  if (pauseBtn) {
    const onTap = (ev)=>{ ev.preventDefault(); togglePause(); };
    pauseBtn.addEventListener('click', onTap);
    pauseBtn.addEventListener('touchend', onTap, {passive:false});
  }
  if (resetBtn) {
    const onTap = (ev)=>{ ev.preventDefault(); resetCraft(); };
    resetBtn.addEventListener('click', onTap);
    resetBtn.addEventListener('touchend', onTap, {passive:false});
  }
})();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Simulation params ---
const turnRate = THREE.MathUtils.degToRad(45) / 60;   // yaw per second at full input
const pitchRate = THREE.MathUtils.degToRad(35) / 60;  // pitch per second
const rollRate  = THREE.MathUtils.degToRad(70) / 60;  // roll per second
const accel = 12.0 / 60;   // m/s² at 100% throttle
const drag  = 0.015;       // simplistic drag factor

let lastT = performance.now();

// --- Main loop ---
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000); // clamp dt
  lastT = now;

  // Continuous input state (even while paused so HUD buttons can change labels)
  if (!paused) {
    // Throttle
    if (keys['Numpad8']) throttlePct = clamp(throttlePct + 40*dt, 0, 100);
    if (keys['Numpad2']) throttlePct = clamp(throttlePct - 40*dt, 0, 100);

    // Brake
    if (keys['Numpad1']) speed = Math.max(0, speed - 30*dt);

    // Attitude
    if (keys['Numpad7']) yaw   += turnRate * dt;   // yaw left
    if (keys['Numpad9']) yaw   -= turnRate * dt;   // yaw right
    if (keys['Numpad5']) pitch += pitchRate * dt;  // pitch up (nose up)
    if (keys['Numpad0']) pitch -= pitchRate * dt;  // pitch down
    if (keys['Numpad4']) roll  += rollRate * dt;   // roll left
    if (keys['Numpad6']) roll  -= rollRate * dt;   // roll right

    // Integrate speed (very simple model: accel from throttle minus drag)
    const targetAccel = (throttlePct / 100) * accel;
    speed = Math.max(0, speed + targetAccel - (drag * speed));

    // Move craft forward along its local -Z
    fuselage.rotation.set(-pitch, yaw, -roll);
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(fuselage.rotation);
    fuselage.position.addScaledVector(forward, speed * dt);

    // Keep above ground (y>=0) and add simple gravity if below some speed
    fuselage.position.y = Math.max(0, fuselage.position.y);
  }

  // Camera: chase
  const camOffset = new THREE.Vector3(0, 5, 18).applyEuler(fuselage.rotation);
  camera.position.copy(fuselage.position).add(camOffset);
  camera.lookAt(fuselage.position);

  updateHUD();
  renderer.render(scene, camera);
}
resetCraft();
tick();
