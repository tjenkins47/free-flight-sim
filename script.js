const canvas=document.getElementById('scene');
if(canvas&&canvas.focus){window.addEventListener('load',()=>canvas.focus());canvas.addEventListener('click',()=>canvas.focus());}

const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));renderer.shadowMap.enabled=true;renderer.setClearColor(0x04070f,1);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,30000);scene.add(camera);
const ambient=new THREE.AmbientLight(0x6b86c2,.55);scene.add(ambient);
const moon=new THREE.DirectionalLight(0xaaccff,.7);moon.position.set(-1500,2500,-1800);moon.castShadow=true;scene.add(moon);

// Make a soft circular sprite texture for round points
function makeCircleSprite(size=64){
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const r = size/2;
  const g = ctx.createRadialGradient(r,r,0, r,r,r);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.7,'rgba(255,255,255,0.9)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r,r,r,0,Math.PI*2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cnv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
const suburbSprite = makeCircleSprite(64);


function addStars(){
  const g = new THREE.BufferGeometry();
  const n = 5000;
  const pos = new Float32Array(n*3);
  for (let i=0;i<n;i++){
    const r=8000+Math.random()*8000;
    const th=Math.random()*Math.PI*2;
    const ph=Math.random()*Math.PI*0.9;
    const x=r*Math.sin(ph)*Math.cos(th);
    const y=r*Math.cos(ph)+1500;
    const z=r*Math.sin(ph)*Math.sin(th);
    pos.set([x,y,z],i*3);
  }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const dpr = Math.max(1, Math.min(3, renderer.getPixelRatio ? renderer.getPixelRatio() : 1));
    const isPhone = /Mobi|Android/i.test(navigator.userAgent);
    const m = new THREE.PointsMaterial({
      size: isPhone ? 9 : 4.5,        // ~2× phone size (was 4)
      sizeAttenuation: true,         // keep the classic look
      color: 0xdef3ff,               // brighter tint than 0x9fcfff
      transparent: true,
      opacity: isPhone ? 1.0 : 0.95, // ~2× brightness feel on phone
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending
    });
  const stars = new THREE.Points(g,m);
  stars.name = 'stars';
  scene.add(stars);
}
addStars();

const oceanGeo=new THREE.PlaneGeometry(30000,30000,200,200);
const oceanMat=new THREE.MeshStandardMaterial({color:0x0b2447,roughness:.9,metalness:0,emissive:0x001133,emissiveIntensity:.25});
const ocean=new THREE.Mesh(oceanGeo,oceanMat);ocean.rotation.x=-Math.PI/2;ocean.position.set(12000,0,0);ocean.receiveShadow=true;scene.add(ocean);
function animateOcean(t){const pos=ocean.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const y=Math.sin((x+t*.3)*.0015)*1.4+Math.cos((z+t*.22)*.0016)*1.2;pos.setY(i,y);}pos.needsUpdate=true;ocean.geometry.computeVertexNormals();}

const land=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000,32,32),new THREE.MeshStandardMaterial({color:0x0b0f14,roughness:1}));land.rotation.x=-Math.PI/2;land.position.set(-12000,0,0);land.receiveShadow=true;scene.add(land);

function createRunway(){
  const L=2200,W=70;
  const base=new THREE.Mesh(new THREE.BoxGeometry(L,2,W),new THREE.MeshStandardMaterial({color:0x202426,roughness:.7,metalness:.1,emissive:0x0f0f0f,emissiveIntensity:1.2}));
  base.castShadow=true;base.receiveShadow=true;base.position.set(-60,1.5,-400);scene.add(base);
  const clMat=new THREE.MeshBasicMaterial({color:0xcdf3ff});
  for(let i=-L/2+40;i<=L/2-40;i+=70){
    const b=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,10),clMat);
    b.position.set(base.position.x+i,2.6,base.position.z);scene.add(b);
  }
  for(let dz=-W/2+6;dz<=W/2-6;dz+=6){
    const g=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,12),new THREE.MeshBasicMaterial({color:0x00ff88}));
    g.position.set(base.position.x-L/2+5,2.8,base.position.z+dz);scene.add(g);
    const r=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,12),new THREE.MeshBasicMaterial({color:0xff5577}));
    r.position.set(base.position.x+L/2-5,2.8,base.position.z+dz);scene.add(r);
  }
  const coastGlow=new THREE.PointLight(0x66aaff,2.2,5000,2);
  coastGlow.position.set(base.position.x,60,base.position.z-100);scene.add(coastGlow);
}
createRunway();

// --- Suburb lights along coastline (land side = x < coastX) ---
function createSuburbLights({
  coastX = 0,          // shoreline X (land ~ -12000, ocean ~ +12000 → coast ≈ 0)
  length = 24000,      // span along Z
  depth = 3000,        // how far inland the lights extend (negative X)
  density = 0.00005,   // points per m^2 (tuned by caller)
  sizePX = 8,          // pixel size (scaled by DPR below)
  paletteBias = 0.65   // 0..1 (higher = warmer overall)
}) {
  const zMin = -length/2, zMax = length/2;
  const xMin = coastX - depth, xMax = coastX;   // land side only

  const area = (xMax - xMin) * (zMax - zMin);
  const count = Math.max(1, Math.floor(area * density));

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  const pickColor = () => {
    const r = Math.random();
    const warmCut = paletteBias * 0.6;
    if (r < warmCut)        return new THREE.Color(0xfff1b3); // warm amber
    if (r < warmCut + 0.20) return new THREE.Color(0xfff6e5); // soft white
    if (r < warmCut + 0.35) return new THREE.Color(0xaed4ff); // cool white-blue
    if (r < warmCut + 0.42) return new THREE.Color(0xff7a7a); // occasional neon red
    if (r < warmCut + 0.49) return new THREE.Color(0x9bff9b); // occasional neon green
    return new THREE.Color(0xffefcf);
  };

  let i = 0;
  while (i < count) {
    // sample within band; bias acceptance toward the shoreline so it’s denser near the coast
    const x = xMin + Math.random() * (xMax - xMin);
    const z = zMin + Math.random() * (zMax - zMin);
    const distFromShore = (coastX - x) / depth;           // 0 at shore -> 1 inland edge
    const accept = 0.25 + 0.75 * (1 - distFromShore);     // denser near coast
    if (Math.random() > accept) continue;

    const y = 2 + Math.random() * 1.5; // stay on/near ground (≈2–3.5m AGL)

    const c = pickColor();
    pos[i*3+0] = x + (Math.random()*20 - 10);
    pos[i*3+1] = y;
    pos[i*3+2] = z + (Math.random()*20 - 10);

    col[i*3+0] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    i++;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  const dpr = Math.max(1, Math.min(3, renderer.getPixelRatio ? renderer.getPixelRatio() : 1));
  const m = new THREE.PointsMaterial({
      size: sizePX * dpr,
      sizeAttenuation: false,      // pixel-sized: great on phones
      map: suburbSprite,           // << round sprite
      alphaTest: 0.5,              // cut out square corners
      vertexColors: true,
      color: 0xffffff,             // multiply by vertex colors
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending
    });


  const pts = new THREE.Points(g, m);
  pts.name = 'suburbLights';
  scene.add(pts);
  return pts;
}

function createCityNW(){
  const group=new THREE.Group();
  const rows=16,cols=16,spacing=55;
  const baseX=-1200,baseZ=-1200;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const h=60+Math.pow(Math.random(),2)*420;
      const b=new THREE.Mesh(
        new THREE.BoxGeometry(45,h,45),
        new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.05,emissive:0x1a1f2e,emissiveIntensity:1.1})
      );
      b.position.set(baseX-c*spacing,h/2,baseZ-r*spacing);
      b.castShadow=true;b.receiveShadow=true;group.add(b);
      const w1=new THREE.Mesh(new THREE.BoxGeometry(41,h*.92,1),new THREE.MeshBasicMaterial({color:0xffffff}));
      w1.position.set(b.position.x,b.position.y,b.position.z+24);group.add(w1);
      const w2=w1.clone();w2.position.set(b.position.x+24,b.position.y,b.position.z);w2.rotation.y=Math.PI/2;group.add(w2);
    }
  }
  const glow=new THREE.PointLight(0xffe8a3,2.0,8000,1.6);
  glow.position.set(baseX-(cols*spacing)/2,250,baseZ-(rows*spacing)/2);
  group.add(glow);
  scene.add(group);
}
createCityNW();

// near-shore ribbon (HALF density)
createSuburbLights({
  coastX: 0,
  length: 24000,
  depth: 2200,
  density: 0.000018,   // was 0.000036
  sizePX: 10,
  paletteBias: 0.72
});

// inland ribbon (HALF density)
createSuburbLights({
  coastX: 0,
  length: 24000,
  depth: 5200,
  density: 0.0000075,  // was 0.000015
  sizePX: 9,
  paletteBias: 0.65
});


const state = {
  throttle: 0.15,   // was .6  ← balance around 100 kt at start
  speed: 51.5,      // 100 kt in m/s
  pos: new THREE.Vector3(900,380,900),
  pitch: 0,
  yaw: THREE.MathUtils.degToRad(-135),
  roll: 0
};

camera.position.copy(state.pos);camera.rotation.order='ZYX';

// central reset helper (works on phone & desktop)
function resetState(){
  state.pos.set(900,380,900);
  state.pitch = 0; state.roll = 0;
  state.yaw = THREE.MathUtils.degToRad(-135);
  state.speed = 51.5;     // 100 kt
  state.throttle = 0.15;  // match the steady-speed throttle
}


const keys=new Set();
window.addEventListener('keydown',e=>{
  keys.add(e.code);
  if(e.code==='Numpad3'){
    window.__paused=!window.__paused;
    const p=document.getElementById('paused');
    if(p) p.style.display=window.__paused?'block':'none';
  }
  if (e.code==='NumpadDecimal') resetState(); // desktop reset
});
window.addEventListener('keyup',e=>keys.delete(e.code));

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function physics(dt){
  if(window.__paused) return;
  const thrUp=keys.has('Numpad8');const thrDn=keys.has('Numpad2');
  const pitchUp=keys.has('Numpad5');const pitchDn=keys.has('Numpad0');
  const rollL=keys.has('Numpad4');const rollR=keys.has('Numpad6');
  const yawL=keys.has('Numpad7');const yawR=keys.has('Numpad9');
  const brake=keys.has('Numpad1');const reset=keys.has('NumpadDecimal');
  if(reset){ resetState(); }

  if(thrUp)state.throttle+=.25*dt;
  if(thrDn)state.throttle-=.25*dt;
  state.throttle=clamp(state.throttle,0,1);

  const rate=.5*(.6+state.speed/140);
  if(pitchUp)state.pitch+=rate*dt;
  if(pitchDn)state.pitch-=rate*dt;
  state.pitch=clamp(state.pitch,THREE.MathUtils.degToRad(-60),THREE.MathUtils.degToRad(60));
  if(rollL)state.roll+=rate*dt;
  if(rollR)state.roll-=rate*dt;
  state.roll=clamp(state.roll,THREE.MathUtils.degToRad(-100),THREE.MathUtils.degToRad(100));
  if(yawL)state.yaw+=rate*.5*dt;
  if(yawR)state.yaw-=rate*.5*dt;

  const forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(state.pitch,state.yaw,0,'YXZ')).normalize();
  const drag = 0.012 + 0.0015*(state.speed/100)**2;
  const thrust=220*state.throttle;
  const liftCoeff=.75;
  const gravity=9.81;
  let accel=thrust-drag*state.speed*state.speed;
  if(brake)accel-=80;
  state.speed+=accel*dt*.2;
  state.speed=clamp(state.speed,0,260);
  const climb=forward.y*state.speed;
  const lift=liftCoeff*state.speed*.02*Math.cos(state.pitch);
  let vy=climb+lift-gravity;
  if(state.pos.y<=2&&vy<0){vy=0;state.pos.y=2;state.speed*=.985;}
  state.pos.addScaledVector(forward,state.speed*dt);
  state.pos.y+=vy*dt;

  const e=new THREE.Euler(state.pitch,state.yaw,state.roll,'ZYX');
  camera.setRotationFromEuler(e);
  camera.position.copy(state.pos);
}

const hud={throttle:document.getElementById('throttle'),speed:document.getElementById('speed'),altitude:document.getElementById('altitude'),pitch:document.getElementById('pitch'),roll:document.getElementById('roll'),yaw:document.getElementById('yaw')};
function updateHUD(){
  hud.throttle.textContent=Math.round(state.throttle*100)+'%';
  const knots = state.speed * 1.94384;  // now updates correctly each frame
  hud.speed.textContent=Math.round(knots);
  hud.altitude.textContent=Math.round(state.pos.y);
  hud.pitch.textContent=Math.round(THREE.MathUtils.radToDeg(state.pitch));
  hud.roll.textContent=Math.round(THREE.MathUtils.radToDeg(state.roll));
  hud.yaw.textContent=Math.round((THREE.MathUtils.radToDeg(state.yaw)+360)%360);
}

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
let last=performance.now();
function tick(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  physics(dt);
  animateOcean(now*.06);
  renderer.render(scene,camera);
  updateHUD();
  requestAnimationFrame(tick);
}
tick(last);

/* ===== Mobile controls + Pause integration ===== */
(function(){
  function setPaused(p){
    window.__paused = !!p;
    const pEl = document.getElementById('paused');
    if (pEl) pEl.style.display = window.__paused ? 'block' : 'none';
    const tcPause = document.getElementById('tc-pause');
    if (tcPause) tcPause.textContent = window.__paused ? 'Resume' : 'Pause';
    try { window.paused = window.__paused; } catch(e){}
    try { window.isPaused = window.__paused; } catch(e){}
  }
  function togglePause(){
    const now = performance.now();
    if (!togglePause._t) togglePause._t = 0;
    if (now - togglePause._t < 160) return;
    togglePause._t = now;
    setPaused(!window.__paused);
  }

  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Numpad3') { e.preventDefault(); togglePause(); }
  }, {passive:false});

  const tc = document.getElementById('touchControls');
  if (tc) {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
      tc.style.display = 'block';
      tc.setAttribute('aria-hidden','false');
    }
    const keysDown = (typeof keys !== 'undefined' && keys instanceof Set) ? keys : new Set();

    tc.querySelectorAll('.btn[data-code]').forEach(btn => {
      const code = btn.getAttribute('data-code');

      const onDown = (ev) => {
        ev.preventDefault();
        keys.add(code);
        try { btn.setPointerCapture(ev.pointerId); } catch(_) {}
      };
      const onUpLike = () => { keys.delete(code); };

      btn.addEventListener('pointerdown', onDown);
      btn.addEventListener('pointerup', onUpLike);
      btn.addEventListener('pointercancel', onUpLike);
      btn.addEventListener('lostpointercapture', onUpLike);

      // Safety: if finger slides off the button or ends outside it:
      window.addEventListener('pointerup', onUpLike);
      window.addEventListener('pointercancel', onUpLike);
    });


    const pauseBtn = document.getElementById('tc-pause');
    const resetBtn = document.getElementById('tc-reset');
    if (pauseBtn) {
      const onTap = (ev)=>{ ev.preventDefault(); togglePause(); };
      pauseBtn.addEventListener('click', onTap);
      pauseBtn.addEventListener('touchend', onTap, {passive:false});
    }
    if (resetBtn) {
      const onTap = (ev)=>{ ev.preventDefault(); resetState(); }; // direct reset (mobile-safe)
      resetBtn.addEventListener('click', onTap);
      resetBtn.addEventListener('touchend', onTap, {passive:false});
    }
  }

  if (THREE && THREE.Clock && !THREE.Clock.__patched_for_pause__) {
    const _getDelta = THREE.Clock.prototype.getDelta;
    THREE.Clock.prototype.getDelta = function(){
      const d = _getDelta.call(this);
      return window.__paused ? 0 : d;
    };
    THREE.Clock.__patched_for_pause__ = true;
  }
  if (typeof renderer !== 'undefined' && !renderer.__render_patched_for_pause__) {
    const _render = renderer.render.bind(renderer);
    renderer.render = function(scene, camera){
      if (window.__paused) return;
      return _render(scene, camera);
    };
    renderer.__render_patched_for_pause__ = true;
  }

  setPaused(!!window.__paused);
})();

/* ===== Suburb Lights Enhancer ===== */
(function enhanceSuburbLights(){
  if (!scene || !THREE) return;
  scene.traverse(obj => {
    if (obj.isPoints && obj.name === 'suburbLights') {
      const m = obj.material;
      m.sizeAttenuation = false;           // keep pixel-based for phones
      m.toneMapped = false;
      m.transparent = true;
      m.depthWrite = false;
      m.opacity = 0.9;                     // adjust to taste
      m.blending = THREE.AdditiveBlending; // nice glow pop
      const dpr = (renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
      m.size = Math.max(m.size || 0, 9 * dpr); // ensure minimum size
      m.needsUpdate = true;
    }
  });
})();
