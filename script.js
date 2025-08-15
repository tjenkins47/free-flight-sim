/* Free Flight NM v3 — keeper visuals + NumPad controls + mobile touch pad
   - Pause: Numpad3 (toggles HUD "PAUSED")
   - Reset: NumpadDecimal (.)
   - Throttle: Numpad8 / Numpad2
   - Pitch:    Numpad5 / Numpad0
   - Roll:     Numpad4 / Numpad6
   - Yaw:      Numpad7 / Numpad9
   - Brake:    Numpad1
*/
(function () {
  if (typeof THREE === 'undefined') { alert('Three.js failed to load.'); return; }

  // ---------- Renderer / Scene ----------
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // ---------- Stars (gentle) ----------
  (function makeStars() {
    const n = 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 11000 + Math.random() * 9000;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3 + 0] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.cos(p);
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 1.1 });
    scene.add(new THREE.Points(geo, mat));
  })();

  // ---------- Camera ----------
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);
  camera.rotation.order = 'ZYX';
  scene.add(camera);

  // ---------- Night lighting ----------
  scene.add(new THREE.AmbientLight(0x223046, 0.6));
  const hemi = new THREE.HemisphereLight(0x578cc0, 0x061018, 0.7);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xbfd6ff, 0.55);
  moon.position.set(-1800, 2400, -1600);
  scene.add(moon);

  // ---------- World: explicit coastline at x = 0 ----------
  // Ocean (east, x > 0)
  const O_W = 32000, O_H = 24000;
  const oceanGeo = new THREE.PlaneGeometry(O_W, O_H, 160, 120);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0b1936, roughness: 0.88, metalness: 0.0,
    emissive: 0x001020, emissiveIntensity: 0.18
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(O_W / 2, 0, 0); // left edge ~ x = 0
  ocean.receiveShadow = true;
  scene.add(ocean);

  function animateOcean(t) {
    const pos = ocean.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = Math.sin((x + t * 0.25) * 0.0019) * 1.2 + Math.cos((z + t * 0.2) * 0.0017) * 1.0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    ocean.geometry.computeVertexNormals();
  }

  // Land (west, x < 0)
  const L_W = 32000, L_H = 24000;
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(L_W, L_H, 32, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0f12, roughness: 1.0 })
  );
  land.rotation.x = -Math.PI / 2;
  land.position.set(-L_W / 2, -0.2, 0); // right edge ~ x = 0
  land.receiveShadow = true;
  scene.add(land);

  // Coastline strip (clear visual seam)
  const coast = new THREE.Mesh(
    new THREE.BoxGeometry(80, 1.2, L_H),
    new THREE.MeshStandardMaterial({ color: 0x0b2238, emissive: 0x46c6ff, emissiveIntensity: 1.0, roughness: 0.95 })
  );
  coast.position.set(0, 1.0, 0);
  scene.add(coast);

  // ---------- Runway on the coast (slightly land side) ----------
  (function createRunway() {
    const rwLen = 2000, rwWid = 70;
    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(rwLen, 2, rwWid),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.1, emissive: 0x151515, emissiveIntensity: 0.95 })
    );
    runway.position.set(-90, 1.3, -520);
    runway.castShadow = true; runway.receiveShadow = true;
    scene.add(runway);

    const midMat = new THREE.MeshBasicMaterial({ color: 0xcdeeff });
    for (let i = -rwLen / 2 + 40; i < rwLen / 2; i += 80) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 12), midMat);
      bulb.position.set(runway.position.x + i, 2.9, runway.position.z);
      scene.add(bulb);
    }
    for (let dz = -rwWid / 2 + 6; dz <= rwWid / 2 - 6; dz += 6) {
      const green = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00ffaa }));
      green.position.set(runway.position.x - rwLen / 2 + 4, 3.2, runway.position.z + dz);
      scene.add(green);
      const red = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff4466 }));
      red.position.set(runway.position.x + rwLen / 2 - 4, 3.2, runway.position.z + dz);
      scene.add(red);
    }
  })();

  // ---------- City (NW, bright and close) ----------
  (function createCityNW() {
    const group = new THREE.Group();
    const rows = 10, cols = 8, spacing = 70;
    const baseX = -1400, baseZ = -1500; // NW
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h = 140 + Math.random() * 360;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(46, h, 46),
          new THREE.MeshStandardMaterial({ color: 0x141821, emissive: 0x223050, emissiveIntensity: 1.6 })
        );
        b.position.set(baseX - c * spacing, h / 2, baseZ - r * spacing);
        b.castShadow = true; b.receiveShadow = true;
        group.add(b);

        const win = new THREE.Mesh(
          new THREE.BoxGeometry(42, h * 0.92, 1),
          new THREE.MeshBasicMaterial({ color: 0xffe1a8 })
        );
        win.position.set(b.position.x, b.position.y, b.position.z + 24.5);
        group.add(win);
      }
    }
    scene.add(group);
  })();

  // ---------- Flight state ----------
  const state = {
    throttle: 0.55, speed: 95,
    pos: new THREE.Vector3(1800, 260, 1600), // over ocean (x>0), SE of city
    pitch: 0,
    yaw: THREE.MathUtils.degToRad(-135),
    roll: 0
  };
  camera.position.copy(state.pos);

  // ---------- Input handling (NumPad) ----------
  const keys = new Set();
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    // Pause toggle on Numpad 3
    if (e.code === 'Numpad3') {
      window.__paused = !window.__paused;
      const p = document.getElementById('paused');
      if (p) p.style.display = window.__paused ? 'block' : 'none';
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  const has = (code) => keys.has(code);

  // Focus canvas so keys work
  const focusCanvas = () => canvas && canvas.focus();
  window.addEventListener('load', focusCanvas);
  canvas.addEventListener('click', focusCanvas);

  // ---------- Physics ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function physics(dt) {
    if (window.__paused) return;

    const thrUp   = has('Numpad8');
    const thrDn   = has('Numpad2');
    const pitchUp = has('Numpad5');
    const pitchDn = has('Numpad0');
    const rollL   = has('Numpad4');
    const rollR   = has('Numpad6');
    const yawL    = has('Numpad7');
    const yawR    = has('Numpad9');
    const brake   = has('Numpad1');
    const reset   = has('NumpadDecimal');

    if (thrUp) state.throttle += 0.3 * dt;
    if (thrDn) state.throttle -= 0.3 * dt;
    state.throttle = clamp(state.throttle, 0, 1);

    const rate = 0.6 * (0.5 + state.speed / 140);
    if (pitchUp) state.pitch += rate * dt;
    if (pitchDn) state.pitch -= rate * dt;
    state.pitch = clamp(state.pitch, THREE.MathUtils.degToRad(-60), THREE.MathUtils.degToRad(60));
    if (rollL) state.roll += rate * dt;
    if (rollR) state.roll -= rate * dt;
    state.roll = clamp(state.roll, THREE.MathUtils.degToRad(-100), THREE.MathUtils.degToRad(100));
    if (yawL) state.yaw += rate * 0.5 * dt;
    if (yawR) state.yaw -= rate * 0.5 * dt;

    if (reset) {
      state.pos.set(1800, 260, 1600);
      state.pitch = 0;
      state.yaw = THREE.MathUtils.degToRad(-135);
      state.roll = 0;
      state.speed = 95;
      state.throttle = 0.55;
    }

    // Simple aero
    const drag = 0.02 + 0.002 * (state.speed / 100) ** 2;
    const thrust = 140 * state.throttle;
    const gravity = 9.81;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ')).normalize();
    let accel = thrust - drag * state.speed * state.speed;
    if (brake) accel -= 80;
    state.speed += accel * dt * 0.2;
    state.speed = Math.max(0, Math.min(250, state.speed));
    const climb = forward.y * state.speed;
    const lift = 0.7 * state.speed * 0.02 * Math.cos(state.pitch);
    let vy = climb + lift - gravity;
    if (state.pos.y <= 1.2 && vy < 0) { vy = 0; state.pos.y = 1.2; state.speed *= 0.985; }
    state.pos.addScaledVector(forward, state.speed * dt);
    state.pos.y += vy * dt;

    camera.setRotationFromEuler(new THREE.Euler(state.pitch, state.yaw, state.roll, 'ZYX'));
    camera.position.copy(state.pos);
  }

  // ---------- HUD ----------
  const hud = {
    throttle: document.getElementById('throttle'),
    speed: document.getElementById('speed'),
    altitude: document.getElementById('altitude'),
    pitch: document.getElementById('pitch'),
    roll: document.getElementById('roll'),
    yaw: document.getElementById('yaw'),
  };
  function updateHUD() {
    if (!hud.throttle) return;
    hud.throttle.textContent = Math.round(state.throttle * 100) + '%';
    hud.speed.textContent = Math.round(state.speed);
    hud.altitude.textContent = Math.round(state.pos.y);
    hud.pitch.textContent = Math.round(THREE.MathUtils.radToDeg(state.pitch));
    hud.roll.textContent = Math.round(THREE.MathUtils.radToDeg(state.roll));
    hud.yaw.textContent = Math.round((THREE.MathUtils.radToDeg(state.yaw) + 360) % 360);
  }

  // ---------- Mobile touch controls: press the same NumPad codes ----------
  (function () {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const pad = document.getElementById('touchControls');
    if (!isTouch || !pad) return;

    try { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); } catch {}

    const press = (code) => keys.add(code);
    const release = (code) => keys.delete(code);

    pad.querySelectorAll('.btn[data-code]').forEach(btn => {
      const code = btn.getAttribute('data-code');
      const start = (e) => { e.preventDefault(); press(code); };
      const end   = (e) => { e.preventDefault(); release(code); };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend',   end,   { passive: false });
      btn.addEventListener('touchcancel',end,   { passive: false });
      btn.addEventListener('mousedown',  start);
      btn.addEventListener('mouseup',    end);
      btn.addEventListener('mouseleave', end);
    });

    const tap = (code) => () => { press(code); setTimeout(() => release(code), 40); };
    document.getElementById('tc-pause')?.addEventListener('click', tap('Numpad3'));
    document.getElementById('tc-reset')?.addEventListener('click', tap('NumpadDecimal'));
  })();

  // ---------- Resize ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Main loop ----------
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    physics(dt);
    animateOcean(now * 0.05);
    renderer.render(scene, camera);
    updateHUD();
    requestAnimationFrame(tick);
  }
  tick(last);
})();
