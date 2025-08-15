const canvas=document.getElementById('scene');
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
const keys=new Set();window.addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));


// ===== Mobile touch controls (non-destructive) =====
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

  const pauseTap = () => { press('Numpad3'); setTimeout(()=>release('Numpad3'), 40); };
  const resetTap = () => { press('NumpadDecimal'); setTimeout(()=>release('NumpadDecimal'), 40); };

  const pauseBtn = document.getElementById('tc-pause');
  const resetBtn = document.getElementById('tc-reset');
  if (pauseBtn) {
    pauseBtn.addEventListener('touchstart', (e)=>{e.preventDefault();pauseTap();}, { passive: false });
    pauseBtn.addEventListener('mousedown',  (e)=>{e.preventDefault();pauseTap();});
  }
  if (resetBtn) {
    resetBtn.addEventListener('touchstart', (e)=>{e.preventDefault();resetTap();}, { passive: false });
    resetBtn.addEventListener('mousedown',  (e)=>{e.preventDefault();resetTap();});
  }
})();

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function physics(dt){const thrUp=keys.has('r')||keys.has('=');const thrDn=keys.has('f')||keys.has('-');const pitchUp=keys.has('w');const pitchDn=keys.has('s');const rollL=keys.has('a');const rollR=keys.has('d');const yawL=keys.has('q');const yawR=keys.has('e');const brake=keys.has('b');const reset=keys.has('x');if(reset){state.pos.set(900,380,900);state.pitch=0;state.roll=0;state.yaw=THREE.MathUtils.degToRad(-135);state.speed=90;state.throttle=.6;}
if(thrUp)state.throttle+=.25*dt;if(thrDn)state.throttle-=.25*dt;state.throttle=clamp(state.throttle,0,1);const rate=.5*(.6+state.speed/140);if(pitchUp)state.pitch+=rate*dt;if(pitchDn)state.pitch-=rate*dt;state.pitch=clamp(state.pitch,THREE.MathUtils.degToRad(-60),THREE.MathUtils.degToRad(60));if(rollL)state.roll+=rate*dt;if(rollR)state.roll-=rate*dt;state.roll=clamp(state.roll,THREE.MathUtils.degToRad(-100),THREE.MathUtils.degToRad(100));if(yawL)state.yaw+=rate*.5*dt;if(yawR)state.yaw-=rate*.5*dt;
const forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(state.pitch,state.yaw,0,'YXZ')).normalize();const drag=.018+.002*(state.speed/100)**2;const thrust=150*state.throttle;const liftCoeff=.75;const gravity=9.81;let accel=thrust-drag*state.speed*state.speed;if(brake)accel-=80;state.speed+=accel*dt*.2;state.speed=clamp(state.speed,0,260);const climb=forward.y*state.speed;const lift=liftCoeff*state.speed*.02*Math.cos(state.pitch);let vy=climb+lift-gravity;if(state.pos.y<=2&&vy<0){vy=0;state.pos.y=2;state.speed*=.985;}state.pos.addScaledVector(forward,state.speed*dt);state.pos.y+=vy*dt;const e=new THREE.Euler(state.pitch,state.yaw,state.roll,'ZYX');camera.setRotationFromEuler(e);camera.position.copy(state.pos);}
const hud={throttle:document.getElementById('throttle'),speed:document.getElementById('speed'),altitude:document.getElementById('altitude'),pitch:document.getElementById('pitch'),roll:document.getElementById('roll'),yaw:document.getElementById('yaw')};
function updateHUD(){hud.throttle.textContent=Math.round(state.throttle*100)+'%';hud.speed.textContent=Math.round(state.speed);hud.altitude.textContent=Math.round(state.pos.y);hud.pitch.textContent=Math.round(THREE.MathUtils.radToDeg(state.pitch));hud.roll.textContent=Math.round(THREE.MathUtils.radToDeg(state.roll));hud.yaw.textContent=Math.round((THREE.MathUtils.radToDeg(state.yaw)+360)%360);}
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
let last=performance.now();function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;physics(dt);animateOcean(now*.06);renderer.render(scene,camera);updateHUD();requestAnimationFrame(tick);}tick(last);
