import * as THREE from 'three';
import './style.css';
import {Simulation,TYPES,MAP_HALF,GOAL,ROUND_SECONDS,formatSize} from './simulation.js';

const $=id=>document.getElementById(id);
const sim=new Simulation();
const ui={size:$('size'),unit:$('unit'),timer:$('timer'),growth:$('growth'),count:$('count'),district:$('district')};
const keys=new Set(),joystick={x:0,z:0,pointer:null};
let boostHeld=false,loaded=false,scene,renderer,camera,ball,prince,ballShadow,ground;
let yaw=0,targetYaw=0,visualRadius=.16,viewSpan=8,follow=new THREE.Vector3();
let itemViews=[],attachments=[],sparks=[],assets=[];
let audio=null,soundEnabled=false,pickupUntil=0,milestoneUntil=0,hintUntil=0,startedAt=0;
let lastTime=performance.now(),frame=0;
const world=$('world'),loader=new THREE.TextureLoader();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.add('menu-open');

function reportError(message){$('error-text').textContent=message;$('error').classList.remove('hidden');sim.mode='paused';document.body.classList.add('menu-open');}
function loadTexture(url){return new Promise((resolve,reject)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;resolve(t);},undefined,()=>reject(new Error('The game artwork could not load. Check your connection and try again.'))));}
function shadowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(35,69,44,.35)');g.addColorStop(.4,'rgba(35,69,44,.2)');g.addColorStop(1,'rgba(35,69,44,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}
let shadowMap;
function shadow(size){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,opacity:.72}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.012;mesh.scale.setScalar(size);return mesh;
}
function sprite(art,height){
  const t=assets[art];
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,alphaTest:.09,depthWrite:true}));
  const ratio=t.image.width/t.image.height;s.center.set(.5,0);s.scale.set(height*ratio,height,1);return s;
}
function createItemViews(){
  for(const v of itemViews){scene.remove(v.sprite,v.shadow);v.sprite.material.dispose();v.shadow.material.dispose();v.shadow.geometry.dispose();}
  itemViews=sim.items.map(item=>{
    const s=sprite(TYPES[item.type].art,item.size*1.05);s.position.set(item.x,.015,item.z);scene.add(s);
    const sh=shadow(item.size*.85);sh.position.set(item.x,.012,item.z);scene.add(sh);
    return{sprite:s,shadow:sh};
  });
}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:world,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();scene.background=new THREE.Color('#bce7a0');scene.fog=new THREE.Fog('#bce7a0',50,105);
    camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,150);
    scene.add(new THREE.HemisphereLight('#fffbe4','#73935c',2.7));
    const sun=new THREE.DirectionalLight('#fff1bf',2.5);sun.position.set(-10,22,12);scene.add(sun);
    const textures=await Promise.all([...Array.from({length:20},(_,i)=>loadTexture(`/assets/prop-${i}.webp`)),loadTexture('/assets/ground.webp'),loadTexture('/assets/ball.webp')]);
    assets=textures.slice(0,20);shadowMap=shadowTexture();
    ground=new THREE.Mesh(new THREE.PlaneGeometry(64,64),new THREE.MeshBasicMaterial({map:textures[20]}));
    ground.rotation.x=-Math.PI/2;scene.add(ground);
    // A generated paint texture, lighting, and collected artwork form the Katamari.
    ball=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),new THREE.MeshStandardMaterial({map:textures[21],roughness:.82,metalness:0}));scene.add(ball);
    ballShadow=shadow(.48);scene.add(ballShadow);
    prince=sprite(18,.34);scene.add(prince);
    createItemViews();resize();
    loaded=true;$('start').disabled=false;$('free').disabled=false;$('start').textContent='Let’s roll · 4 minute challenge';
    registerTools();requestAnimationFrame(tick);
  }catch(error){reportError(error.message||'This device could not start WebGL. Try a browser with hardware acceleration enabled.');}
}
function resize(){
  if(!renderer)return;const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);
  const aspect=w/Math.max(1,h);camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();
}
function resetVisuals(){
  for(const a of attachments){scene.remove(a.sprite);a.sprite.material.dispose();}attachments=[];
  for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks=[];
  ball.quaternion.identity();visualRadius=sim.diameter/2;follow.set(sim.x,0,sim.z);yaw=targetYaw=0;createItemViews();
}
function start(free=false){
  if(!loaded)return;sim.reset(free);resetVisuals();startedAt=performance.now();hintUntil=startedAt+9500;
  $('hint').textContent='Roll over small things. Hold GO! to dash.';
  $('goal-label').textContent=free?'FREE ROLL · NO LIMIT':'GOAL · 6 m';
  hideMenus();updateHud();initAudio();world.focus({preventScroll:true});
}
function hideMenus(){for(const id of ['menu','pause-menu','result-menu'])$(id).classList.add('hidden');document.body.classList.remove('menu-open');}
function resetInput(){keys.clear();joystick.x=joystick.z=0;joystick.pointer=null;boostHeld=false;$('boost').classList.remove('held');$('stick').style.transform='translate(0,0)';}
function pause(){if(sim.mode!=='playing')return;sim.mode='paused';resetInput();$('pause-menu').classList.remove('hidden');document.body.classList.add('menu-open');}
function resume(){if(sim.mode!=='paused'||!loaded)return;sim.mode='playing';hideMenus();lastTime=performance.now();world.focus({preventScroll:true});}
function finish(){
  resetInput();$('result-menu').classList.remove('hidden');document.body.classList.add('menu-open');
  $('result-kicker').textContent=sim.won?'NEIGHBORHOOD, SUCCESSFULLY ROLLED!':'FOUR MINUTES OF GOOD LITTLE CHAOS';
  $('result-title').innerHTML=sim.won?'You made<br><em>a big mess.</em>':'What a<br><em>little world.</em>';
  $('result-size').textContent=formatSize(sim.diameter);$('result-count').textContent=String(sim.count);
  $('result-text').textContent=sim.won?'Six meters of glorious stuff. There’s still more neighborhood to collect.':'A lovely start. Try another roll, or keep growing this one without a timer.';
  melody(sim.won?[523,659,784,1047]:[440,392,330]);
}
function continueFree(){sim.free=true;sim.mode='playing';$('goal-label').textContent='FREE ROLL · NO LIMIT';hideMenus();hintUntil=performance.now()+5500;$('hint').textContent='No clock. The whole neighborhood is yours.';updateHud();}
function updateHud(){
  const d=sim.diameter;ui.size.textContent=d<1?Math.round(d*100):d.toFixed(2);ui.unit.textContent=d<1?'cm':'m';
  ui.count.textContent=`${sim.count} thing${sim.count===1?'':'s'}`;
  ui.growth.style.width=`${Math.min(100,(d-.32)/(GOAL-.32)*100)}%`;
  if(sim.free){ui.timer.textContent='∞';ui.timer.style.color='';}
  else{const t=Math.max(0,Math.ceil(ROUND_SECONDS-sim.elapsed));ui.timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;ui.timer.style.color=t<=30?'#d65374':'';}
  const dist=Math.hypot(sim.x,sim.z);ui.district.textContent=dist<7?'Pocket Park':dist<15?'Garden Walk':dist<23?'Bicycle Lane':'Sunny Side Street';
}
function attach(item){
  const s=sprite(TYPES[item.type].art,item.size*.75);s.center.set(.5,.5);s.material.depthWrite=false;
  const n=item.id*2.3999632297,z=1-2*((item.id*.61803398875)%1),r=Math.sqrt(1-z*z);
  const direction=new THREE.Vector3(r*Math.cos(n),z,r*Math.sin(n));
  scene.add(s);attachments.push({sprite:s,direction,size:item.size,angle:item.angle,ratio:assets[TYPES[item.type].art].image.width/assets[TYPES[item.type].art].image.height});
  if(attachments.length>55){const old=attachments.shift();scene.remove(old.sprite);old.sprite.material.dispose();}
}
function emitSparks(item){
  if(reducedMotion)return;
  const points=[];for(let i=0;i<9;i++)points.push((Math.random()-.5)*item.size*2,Math.random()*item.size,(Math.random()-.5)*item.size*2);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const mesh=new THREE.Points(g,new THREE.PointsMaterial({color:['#fff8b5','#ff7793','#b7ffff'][item.id%3],size:Math.max(.025,sim.diameter*.055),transparent:true,depthWrite:false}));
  mesh.position.set(item.x,sim.diameter*.25,item.z);scene.add(mesh);sparks.push({mesh,life:.65});
  if(sparks.length>12){const old=sparks.shift();scene.remove(old.mesh);old.mesh.geometry.dispose();old.mesh.material.dispose();}
}
function input(){
  let x=joystick.x,z=joystick.z;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;
  const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  // Use current camera yaw so up always rolls toward the top of the screen.
  return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw),boost:boostHeld||keys.has('ShiftLeft')||keys.has('ShiftRight')};
}
function tick(now){
  const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;frame++;
  const result=sim.step(dt,input());
  if(result.pickups.length){
    for(const item of result.pickups){itemViews[item.id].sprite.visible=false;itemViews[item.id].shadow.visible=false;attach(item);emitSparks(item);}
    const last=result.pickups[result.pickups.length-1];$('pickup').textContent=`+ ${TYPES[last.type].name}${sim.combo>=3?' · '+sim.combo+' in a row!':''}`;pickupUntil=now+1500;
    tone(350+Math.min(sim.combo,12)*45,.09);
    if(navigator.vibrate)navigator.vibrate(12);
  }
  if(result.milestone!==null&&result.milestone!==undefined){
    const messages=['A little bigger!','Look at you grow!','Bicycles? Absolutely.','Here come the vans!'];
    $('milestone').textContent=messages[result.milestone];milestoneUntil=now+2400;melody([392,523,659]);
  }
  if(sim.mode==='result'&&$('result-menu').classList.contains('hidden'))finish();
  const inMenu=sim.mode==='menu';
  const radiusTarget=inMenu ? .55 : sim.diameter*.5;
  visualRadius+=(radiusTarget-visualRadius)*(1-Math.exp(-dt*8));
  ball.scale.setScalar(visualRadius);ball.position.set(sim.x,visualRadius+.025,sim.z);
  if(result.distance>.0001){const axis=new THREE.Vector3(result.dz,0,-result.dx).normalize();const q=new THREE.Quaternion().setFromAxisAngle(axis,result.distance/Math.max(.1,visualRadius));ball.quaternion.premultiply(q);}
  else if(inMenu&&!reducedMotion)ball.rotation.y+=dt*.22;
  ballShadow.position.set(sim.x,.018,sim.z);ballShadow.scale.setScalar(visualRadius*3.1);
  for(const a of attachments){const v=a.direction.clone().multiplyScalar(visualRadius*.91).applyQuaternion(ball.quaternion);a.sprite.position.copy(ball.position).add(v);a.sprite.material.rotation=Math.sin(now*.0007+a.angle)*.22;const h=Math.min(a.size*.72,visualRadius*1.05);a.sprite.scale.set(h*a.ratio,h,1);}
  // Prince follows behind the rolling direction and remains readable at every size.
  const moveAngle=Math.hypot(sim.vx,sim.vz)>.1?Math.atan2(sim.vx,sim.vz):yaw+Math.PI;
  const ph=Math.max(.29,visualRadius*.63),ratio=assets[18].image.width/assets[18].image.height;
  prince.scale.set(ph*ratio,ph,1);prince.position.set(sim.x-Math.sin(moveAngle)*(visualRadius+ph*.35),.035+(!reducedMotion&&result.distance>.002?Math.abs(Math.sin(now*.015))*ph*.09:0),sim.z-Math.cos(moveAngle)*(visualRadius+ph*.35));
  follow.lerp(new THREE.Vector3(sim.x,visualRadius*.25,sim.z),1-Math.exp(-dt*5));
  yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*5));
  const desiredSpan=inMenu?16:6+sim.diameter*4.1;
  viewSpan+=(desiredSpan-viewSpan)*(1-Math.exp(-dt*4));
  const dist=20+visualRadius*4;camera.position.set(follow.x+Math.sin(yaw)*dist,follow.y+dist*1.12,follow.z+Math.cos(yaw)*dist);camera.lookAt(follow);
  const aspect=world.clientWidth/Math.max(1,world.clientHeight);camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();
  const visibleDistance=viewSpan*Math.max(1,aspect)*1.2+7;
  for(let i=0;i<sim.items.length;i++){const item=sim.items[i];if(item.collected)continue;const visible=Math.hypot(item.x-sim.x,item.z-sim.z)<visibleDistance;itemViews[i].sprite.visible=visible;itemViews[i].shadow.visible=visible;}
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.mesh.position.y+=dt*.7;s.mesh.material.opacity=Math.max(0,s.life/.65);if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();sparks.splice(i,1);}}
  $('pickup').classList.toggle('show',now<pickupUntil&&sim.mode==='playing');$('milestone').classList.toggle('show',now<milestoneUntil&&sim.mode==='playing');$('hint').style.opacity=now<hintUntil?'1':'0';
  if(frame%5===0)updateHud();renderer.render(scene,camera);requestAnimationFrame(tick);
}

function initAudio(){
  if(!soundEnabled)return;
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
  audio??=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function tone(freq,duration=.12,delay=0){
  if(!soundEnabled||!audio)return;
  const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02);
}
function melody(notes){notes.forEach((n,i)=>tone(n,.19,i*.1));}

$('start').addEventListener('click',()=>start(false));$('free').addEventListener('click',()=>start(true));
$('pause').addEventListener('click',()=>sim.mode==='paused'?resume():pause());$('resume').addEventListener('click',resume);
$('restart').addEventListener('click',()=>start(sim.free));$('again').addEventListener('click',()=>start(false));$('continue').addEventListener('click',continueFree);
$('camera').addEventListener('click',()=>{if(sim.mode==='playing')targetYaw+=Math.PI/4;});
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-label',soundEnabled?'Turn sound off':'Turn sound on');$('sound').title=soundEnabled?'Sound on':'Sound off';$('sound').querySelector('.sound-slash').style.display=soundEnabled?'none':'';initAudio();if(soundEnabled)tone(523,.15);});
const joy=$('joystick');
function moveJoy(e){
  if(e.pointerId!==joystick.pointer)return;const r=joy.getBoundingClientRect(),radius=r.width*.32;
  let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const length=Math.hypot(dx,dy);if(length>radius){dx*=radius/length;dy*=radius/length;}
  joystick.x=dx/radius;joystick.z=dy/radius;const magnitude=Math.hypot(joystick.x,joystick.z);if(magnitude<.1)joystick.x=joystick.z=0;
  $('stick').style.transform=`translate(${dx}px,${dy}px)`;e.preventDefault();
}
joy.addEventListener('pointerdown',e=>{if(sim.mode!=='playing'||joystick.pointer!==null)return;joystick.pointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
joy.addEventListener('pointermove',moveJoy);
function endJoy(e){if(e.pointerId!==joystick.pointer)return;joystick.pointer=null;joystick.x=joystick.z=0;$('stick').style.transform='translate(0,0)';}
joy.addEventListener('pointerup',endJoy);joy.addEventListener('pointercancel',endJoy);joy.addEventListener('lostpointercapture',endJoy);
$('boost').addEventListener('pointerdown',e=>{if(sim.mode!=='playing')return;boostHeld=true;$('boost').classList.add('held');$('boost').setPointerCapture(e.pointerId);e.preventDefault();});
function endBoost(){boostHeld=false;$('boost').classList.remove('held');}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('boost').addEventListener(type,endBoost);
const controlKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyQ','KeyE','Escape'];
window.addEventListener('keydown',e=>{
  if(!controlKeys.includes(e.code))return;e.preventDefault();
  if(e.code==='Escape'&&!e.repeat){sim.mode==='playing'?pause():resume();return;}
  if(sim.mode!=='playing')return;keys.add(e.code);
  if(!e.repeat&&e.code==='KeyQ')targetYaw-=Math.PI/4;if(!e.repeat&&e.code==='KeyE')targetYaw+=Math.PI/4;
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('resize',resize);
world.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();reportError('The graphics connection paused. Reload to start a fresh roll.');});

function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_roll_status',description:'Read the current neighborhood game status, size, timer and collection count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>sim.snapshot()});
  register({name:'start_neighborhood_roll',description:'Start a fresh roll on the one neighborhood map. Resets the current ball and collection.',inputSchema:{type:'object',properties:{freeRoll:{type:'boolean'}},required:['freeRoll'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(typeof input?.freeRoll!=='boolean')throw new Error('freeRoll must be a boolean');start(input.freeRoll);return sim.snapshot();}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
