const canvas=document.getElementById('scene');
if(canvas&&canvas.focus){window.addEventListener('load',()=>canvas.focus());canvas.addEventListener('click',()=>canvas.focus());}

const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));renderer.shadowMap.enabled=true;renderer.setClearColor(0x04070f,1);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,30000);scene.add(camera);
const ambient=new THREE.AmbientLight(0x6b86c2,.55);scene.add(ambient);
const moon=new THREE.DirectionalLight(0xaaccff,.7);moon.position.set(-1500,2500,-1800);moon.castShadow=true;scene.add(moon);
function addStars(){const g=new THREE.BufferGeometry();const n=5000;const pos=new Float32Array(n*3);for(let i=0;i<n;i++){const r=8000+Math.random()*8000;const th=Math.random()*Math.PI*2;const ph=Math.random()*Math.PI*0.9;const x=r*Math.sin(ph)*Math.cos(th);const y=r*Math.cos(ph)+1500;const z=r*Math.sin(ph)*Math.sin(th);pos.set([x,y,z],i*3);}g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.PointsMaterial({size:3,sizeAttenuation:true,color:0x9fcfff,transparent:true,opacity:.9});scene.add(new THREE.Points(g,m));}
addStars();
const oceanGeo=new THREE.PlaneGeometry(30000,30000,200,200);
const oceanMat=new THREE.MeshStandardMaterial({color:0x0b2447,roughness:.9,metalness:0,emissive:0x001133,emissiveIntensity:.25});
const ocean=new THREE.Mesh(oceanGeo,oceanMat);ocean.rotation.x=-Math.PI/2;ocean.position.set(12000,0,0);ocean.receiveShadow=true;scene.add(ocean);
function animateOcean(t){const pos=ocean.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const y=Math.sin((x+t*.3)*.0015)*1.4+Math.cos((z+t*.22)*.0016)*1.2;pos.setY(i,y);}pos.needsUpdate=true;ocean.geometry.computeVertexNormals();}
const land=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000,32,32),new THREE.MeshStandardMaterial({color:0x0b0f14,roughness:1}));land.rotation.x=-Math.PI/2;land.position.set(-12000,0,0);land.receiveShadow=true;scene.add(land);
function createRunway(){const L=2200,W=70;const base=new THREE.Mesh(new THREE.BoxGeometry(L,2,W),new THREE.MeshStandardMaterial({color:0x202426,roughness:.7,metalness:.1,emissive:0x0f0f0f,emissiveIntensity:1.2}));base.castShadow=true;base.receiveShadow=true;base.position.set(-60,1.5,-400);scene.add(base);
const clMat=new THREE.MeshBasicMaterial({color:0xcdf3ff});for(let i=-L/2+40;i<=L/2-40;i+=70){const b=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,10),clMat);b.position.set(base.position.x+i,2.6,base.position.z);scene.add(b);}for(let dz=-W/2+6;dz<=W/2-6;dz+=6){const g=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,12),new THREE.MeshBasicMaterial({color:0x00ff88}));g.position.set(base.position.x-L/2+5,2.8,base.position.z+dz);scene.add(g);const r=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,12),new THREE.MeshBasicMaterial({color:0xff5577}));r.position.set(base.position.x+L/2-5,2.8,base.position.z+dz);scene.add(r);}const coastGlow=new THREE.PointLight(0x66aaff,2.2,5000,2);coastGlow.position.set(base.position.x,60,base.position.z-100);scene.add(coastGlow);}createRunway();
function createCityNW(){const group=new THREE.Group();const rows=16,cols=16,spacing=55;const baseX=-1200,baseZ=-1200;for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){const h=60+Math.pow(Math.random(),2)*420;const b=new THREE.Mesh(new THREE.BoxGeometry(45,h,45),new THREE.MeshStandardMaterial({color:0x14171b,roughness:.9,metalness:.05,emissive:0x1a1f2e,emissiveIntensity:1.1}));b.position.set(baseX-c*spacing,h/2,baseZ-r*spacing);b.castShadow=true;b.receiveShadow=true;group.add(b);const w1=new THREE.Mesh(new THREE.BoxGeometry(41,h*.92,1),new THREE.MeshBasicMaterial({color:0xfff1b3}));w1.position.set(b.position.x,b.position.y,b.position.z+24);group.add(w1);const w2=w1.clone();w2.position.set(b.position.x+24,b.position.y,b.position.z);w2.rotation.y=Math.PI/2;group.add(w2);}}const glow=new THREE.PointLight(0xffe8a3,2.0,8000,1.6);glow.position.set(baseX-(cols*spacing)/2,250,baseZ-(rows*spacing)/2);group.add(glow);scene.add(group);}createCityNW();
const state={throttle:.6,speed:90,pos:new THREE.Vector3(900,380,900),pitch:0,yaw:THREE.MathUtils.degToRad(-135),roll:0};
camera.position.copy(state.pos);camera.rotation.order='ZYX';
const keys=new Set();
window.addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='Numpad3'){ window.__paused = !window.__paused; const p=document.getElementById('paused'); if(p) p.style.display=window.__paused?'block':'none';}});
window.addEventListener('keyup',e=>keys.delete(e.code));
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function physics(dt){
  if(window.__paused) return;
  const thrUp=keys.has('Numpad8');const thrDn=keys.has('Numpad2');const pitchUp=keys.has('Numpad5');const pitchDn=keys.has('Numpad0');const rollL=keys.has('Numpad4');const rollR=keys.has('Numpad6');const yawL=keys.has('Numpad7');const yawR=keys.has('Numpad9');const brake=keys.has('Numpad1');const reset=keys.has('NumpadDecimal');if(reset){state.pos.set(900,380,900);state.pitch=0;state.roll=0;state.yaw=THREE.MathUtils.degToRad(-135);state.speed=90;state.throttle=.6;}
if(thrUp)state.throttle+=.25*dt;if(thrDn)state.throttle-=.25*dt;state.throttle=clamp(state.throttle,0,1);const rate=.5*(.6+state.speed/140);if(pitchUp)state.pitch+=rate*dt;if(pitchDn)state.pitch-=rate*dt;state.pitch=clamp(state.pitch,THREE.MathUtils.degToRad(-60),THREE.MathUtils.degToRad(60));if(rollL)state.roll+=rate*dt;if(rollR)state.roll-=rate*dt;state.roll=clamp(state.roll,THREE.MathUtils.degToRad(-100),THREE.MathUtils.degToRad(100));if(yawL)state.yaw+=rate*.5*dt;if(yawR)state.yaw-=rate*.5*dt;
const forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(state.pitch,state.yaw,0,'YXZ')).normalize();const drag=.018+.002*(state.speed/100)**2;const thrust=150*state.throttle;const liftCoeff=.75;const gravity=9.81;let accel=thrust-drag*state.speed*state.speed;if(brake)accel-=80;state.speed+=accel*dt*.2;state.speed=clamp(state.speed,0,260);const climb=forward.y*state.speed;const lift=liftCoeff*state.speed*.02*Math.cos(state.pitch);let vy=climb+lift-gravity;if(state.pos.y<=2&&vy<0){vy=0;state.pos.y=2;state.speed*=.985;}state.pos.addScaledVector(forward,state.speed*dt);state.pos.y+=vy*dt;const e=new THREE.Euler(state.pitch,state.yaw,state.roll,'ZYX');camera.setRotationFromEuler(e);camera.position.copy(state.pos);}
const hud={throttle:document.getElementById('throttle'),speed:document.getElementById('speed'),altitude:document.getElementById('altitude'),pitch:document.getElementById('pitch'),roll:document.getElementById('roll'),yaw:document.getElementById('yaw')};
function updateHUD(){hud.throttle.textContent=Math.round(state.throttle*100)+'%';hud.speed.textContent=Math.round(state.speed);hud.altitude.textContent=Math.round(state.pos.y);hud.pitch.textContent=Math.round(THREE.MathUtils.radToDeg(state.pitch));hud.roll.textContent=Math.round(THREE.MathUtils.radToDeg(state.roll));hud.yaw.textContent=Math.round((THREE.MathUtils.radToDeg(state.yaw)+360)%360);}
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
let last=performance.now();function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;physics(dt);animateOcean(now*.06);renderer.render(scene,camera);updateHUD();requestAnimationFrame(tick);}tick(last);


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

  // Ensure Numpad3 toggles pause reliably
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Numpad3') { e.preventDefault(); togglePause(); }
  }, {passive:false});

  // Touch controls
  const tc = document.getElementById('touchControls');
  if (tc) {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
      tc.style.display = 'block';
      tc.setAttribute('aria-hidden','false');
    }
    // Use the existing Set 'keys' from your script
    const keysDown = (typeof keys !== 'undefined' && keys instanceof Set) ? keys : new Set();

    tc.querySelectorAll('.btn[data-code]').forEach(btn => {
      const code = btn.getAttribute('data-code');
      const start = (ev)=>{ ev.preventDefault(); keysDown.add(code); };
      const end   = (ev)=>{ ev.preventDefault(); keysDown.delete(code); };

      btn.addEventListener('touchstart', start, {passive:false});
      btn.addEventListener('touchend', end, {passive:false});
      btn.addEventListener('touchcancel', end, {passive:false});
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    });

    const pauseBtn = document.getElementById('tc-pause');
    const resetBtn = document.getElementById('tc-reset');
    if (pauseBtn) {
      const onTap = (ev)=>{ ev.preventDefault(); togglePause(); };
      pauseBtn.addEventListener('click', onTap);
      pauseBtn.addEventListener('touchend', onTap, {passive:false});
    }
    if (resetBtn) {
      const onTap = (ev)=>{
        ev.preventDefault();
        // simulate NumpadDecimal keypress to use your reset branch
        const down = new KeyboardEvent('keydown', {code:'NumpadDecimal'});
        const up   = new KeyboardEvent('keyup',   {code:'NumpadDecimal'});
        window.dispatchEvent(down); window.dispatchEvent(up);
      };
      resetBtn.addEventListener('click', onTap);
      resetBtn.addEventListener('touchend', onTap, {passive:false});
    }
  }

  // Strong pause shim for time-freeze
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

  // Initialize HUD badge state
  setPaused(!!window.__paused);
})();




/* ===== Global City Lights Enhancement (v6) ===== */
(function enhanceAllCityLights(){
  if (!scene) return;
  scene.traverse(obj => {
    if (obj.isPoints && obj.material && obj.material.isPointsMaterial) {
      if ('size' in obj.material) {
        obj.material.size = (obj.material.size||2.5) * (2.5 + Math.random()*0.5);
      }
      obj.material.sizeAttenuation = true;
      obj.material.transparent = true;
      obj.material.opacity = 0.95;
      obj.material.vertexColors = true;
      obj.material.toneMapped = false;
      obj.material.needsUpdate = true;
      const g = obj.geometry;
      if (g && g.getAttribute('position') && !g.getAttribute('color')) {
        const count = g.getAttribute('position').count;
        const colors = new Float32Array(count*3);
        for (let i=0;i<count;i++){
          let col = new THREE.Color();
          const r = Math.random();
          if (r<0.25) col.set(0xfff1b3);
          else if (r<0.5) col.set(0xffe9cf);
          else if (r<0.7) col.set(0xaed4ff);
          else if (r<0.85) col.set(0xff7a7a);
          else col.set(0x9bff9b);
          colors[i*3+0]=col.r;colors[i*3+1]=col.g;colors[i*3+2]=col.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors,3));
      }
    }
    if (obj.isMesh && obj.material && obj.material.isMeshBasicMaterial) {
      const r = Math.random();
      if (r<0.25) obj.material.color.set(0xfff1b3);
      else if (r<0.5) obj.material.color.set(0xffe9cf);
      else if (r<0.7) obj.material.color.set(0xaed4ff);
      else if (r<0.85) obj.material.color.set(0xff7a7a);
      else obj.material.color.set(0x9bff9b);
    }
  });
})();
