import * as THREE from 'three';
import './style.css';
import {Simulation,TYPES,CHUNK_SIZE,GOAL,ROUND_SECONDS,formatSize,sizeParts} from './simulation.js';
import {createTerrain} from './terrain.js';

const $=id=>document.getElementById(id);
const sim=new Simulation();
const ui={size:$('size'),unit:$('unit'),timer:$('timer'),growth:$('growth'),count:$('count'),district:$('district')};
const keys=new Set(),joystick={x:0,z:0,pointer:null};
let boostHeld=false,loaded=false,scene,renderer,camera,ball,prince,ballShadow,terrain;
let yaw=0,targetYaw=0,visualRadius=.16,viewSpan=8,follow=new THREE.Vector3();
let itemViews=new Map(),attachments=[],sparks=[],assets=[],lastItems=null;
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
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:false,alphaTest:.28,depthWrite:true}));
  const ratio=t.image.width/t.image.height;s.center.set(.5,0);s.scale.set(height*ratio,height,1);s.frustumCulled=false;return s;
}
function createItemViews(){
  const keep=new Set(sim.items.filter(item=>!item.collected).map(item=>item.id));
  for(const[id,v]of itemViews){if(keep.has(id))continue;scene.remove(v.sprite,v.shadow);v.sprite.material.dispose();v.shadow.material.dispose();v.shadow.geometry.dispose();itemViews.delete(id);}
  for(const item of sim.items){
    if(item.collected)continue;
    let view=itemViews.get(item.id);
    if(!view){const s=sprite(TYPES[item.type].art,item.size*1.05),sh=shadow(item.size*.85);scene.add(s,sh);view={sprite:s,shadow:sh};itemViews.set(item.id,view);}
    const ratio=assets[TYPES[item.type].art].image.width/assets[TYPES[item.type].art].image.height;
    view.sprite.scale.set(item.size*1.05*ratio,item.size*1.05,1);view.sprite.position.set(item.x,.025,item.z);
    view.shadow.scale.setScalar(item.size*.85);view.shadow.position.set(item.x,.012,item.z);
  }
  lastItems=sim.items;
}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:world,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,3));renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();scene.background=new THREE.Color('#bce7a0');scene.fog=new THREE.Fog('#bce7a0',50,105);
    camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,150);
    scene.add(new THREE.HemisphereLight('#fffbe4','#73935c',2.7));
    const sun=new THREE.DirectionalLight('#fff1bf',2.5);sun.position.set(-10,22,12);scene.add(sun);
    const textures=await Promise.all([...Array.from({length:20},(_,i)=>loadTexture(`/assets/prop-${i}.webp`)),loadTexture('/assets/grass.webp'),loadTexture('/assets/paving.webp'),loadTexture('/assets/ball.webp')]);
    assets=textures.slice(0,20);shadowMap=shadowTexture();
    terrain=createTerrain(textures[20],textures[21],renderer);scene.add(terrain.mesh);
    // A generated paint texture, lighting, and collected artwork form the Katamari.
    ball=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial({map:textures[22],roughness:.82,metalness:0}));scene.add(ball);
    ballShadow=shadow(.48);scene.add(ballShadow);
    prince=sprite(18,.34);scene.add(prince);
    createItemViews();resize();
    loaded=true;$('start').disabled=false;$('free').disabled=false;$('start').textContent='Let’s roll · forever';
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
  for(const v of itemViews.values()){scene.remove(v.sprite,v.shadow);v.sprite.material.dispose();v.shadow.material.dispose();v.shadow.geometry.dispose();}itemViews.clear();
  ball.quaternion.identity();visualRadius=sim.diameter/2;viewSpan=6+sim.diameter*4.1;follow.set(sim.x,0,sim.z);yaw=targetYaw=0;createItemViews();
}
function start(free=true){
  if(!loaded)return;sim.reset(free);resetVisuals();startedAt=performance.now();hintUntil=startedAt+9500;
  $('hint').textContent='Keep rolling. New streets are just ahead.';
  $('goal-label').textContent=free?'NEXT · 6 m':'GOAL · 6 m';
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
  $('result-size').textContent=formatSize(sim.diameter,sim.level);$('result-count').textContent=String(sim.count);
  $('result-text').textContent=sim.won?'Six meters of glorious stuff. Keep rolling into the endless neighborhood.':'A lovely start. Try another roll, or keep growing this one without a timer.';
  melody(sim.won?[523,659,784,1047]:[440,392,330]);
}
function continueFree(){sim.free=true;sim.mode='playing';hideMenus();hintUntil=performance.now()+5500;$('hint').textContent='No clock. No edge. Just keep rolling.';updateHud();}
function updateHud(){
  const parts=sizeParts(sim.diameter,sim.level);ui.size.textContent=parts.value;ui.unit.textContent=parts.unit;ui.size.style.fontSize=parts.value.length>5?'30px':'';
  ui.count.textContent=`${sim.count} thing${sim.count===1?'':'s'}`;
  ui.growth.style.width=`${Math.min(100,sim.progress()*100)}%`;
  $('goal-label').textContent=sim.free?`NEXT · ${sim.nextGoalSize()}`:'GOAL · 6 m';
  if(sim.free){ui.timer.textContent='∞';ui.timer.style.color='';}
  else{const t=Math.max(0,Math.ceil(ROUND_SECONDS-sim.elapsed));ui.timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;ui.timer.style.color=t<=30?'#d65374':'';}
  ui.district.textContent=sim.world.district(sim.x,sim.z);
}
function attach(item){
  const s=sprite(TYPES[item.type].art,item.size*.45);s.center.set(.5,.5);
  const n=item.visualSeed*2.3999632297,z=1-2*((item.visualSeed*.61803398875)%1),r=Math.sqrt(1-z*z);
  const direction=new THREE.Vector3(r*Math.cos(n),z,r*Math.sin(n));
  scene.add(s);attachments.push({sprite:s,direction,size:item.size,angle:n,ratio:assets[TYPES[item.type].art].image.width/assets[TYPES[item.type].art].image.height});
  if(attachments.length>48){const old=attachments.shift();scene.remove(old.sprite);old.sprite.material.dispose();}
}
function emitSparks(item){
  if(reducedMotion)return;
  const points=[];for(let i=0;i<9;i++)points.push((Math.random()-.5)*item.size*2,Math.random()*item.size,(Math.random()-.5)*item.size*2);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const mesh=new THREE.Points(g,new THREE.PointsMaterial({color:['#fff8b5','#ff7793','#b7ffff'][item.visualSeed%3],size:Math.max(.025,sim.diameter*.055),transparent:true,depthWrite:false}));
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
  const aspect=world.clientWidth/Math.max(1,world.clientHeight);
  sim.setViewRadius(Math.ceil(viewSpan*Math.max(1,aspect)*.65/CHUNK_SIZE)+1);
  sim.setVisibleRadius(viewSpan*Math.max(1,aspect)*1.3+sim.diameter*2);
  const result=sim.step(dt,input());
  const transform=result.transform;
  if(transform.scale!==1||transform.x!==0||transform.z!==0){
    follow.multiplyScalar(transform.scale);follow.x+=transform.x;follow.z+=transform.z;
    visualRadius*=transform.scale;viewSpan*=transform.scale;
    for(const a of attachments)a.size*=transform.scale;
    for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks=[];
  }
  if(sim.items!==lastItems)createItemViews();
  if(result.pickups.length){
    for(const picked of result.pickups){
      const view=itemViews.get(picked.id);if(view){view.sprite.visible=false;view.shadow.visible=false;}
      const item={...picked,x:picked.x*transform.scale+transform.x,z:picked.z*transform.scale+transform.z,size:picked.size*transform.scale};
      attach(item);emitSparks(item);
    }
    const last=result.pickups[result.pickups.length-1];$('pickup').textContent=`+ ${TYPES[last.type].name}${sim.combo>=3?' · '+sim.combo+' in a row!':''}`;pickupUntil=now+1500;
    tone(350+Math.min(sim.combo,12)*45,.09);
    if(navigator.vibrate)navigator.vibrate(12);
  }
  if(result.milestone!==null&&result.milestone!==undefined){
    const messages=['A little bigger!','Look at you grow!','Bicycles? Absolutely.','Here come the vans!'];
    $('milestone').textContent=messages[result.milestone]||`${formatSize(sim.diameter,sim.level)} of glorious stuff!`;milestoneUntil=now+2400;melody([392,523,659]);
  }
  if(sim.mode==='result'&&$('result-menu').classList.contains('hidden'))finish();
  const inMenu=sim.mode==='menu';
  const radiusTarget=inMenu ? .55 : sim.diameter*.5;
  visualRadius+=(radiusTarget-visualRadius)*(1-Math.exp(-dt*8));
  ball.scale.setScalar(visualRadius);ball.position.set(sim.x,visualRadius+.025,sim.z);
  if(result.distance>.0001){const axis=new THREE.Vector3(result.dz,0,-result.dx).normalize();const q=new THREE.Quaternion().setFromAxisAngle(axis,result.distance/Math.max(.1,visualRadius));ball.quaternion.premultiply(q);}
  else if(inMenu&&!reducedMotion)ball.rotation.y+=dt*.22;
  ballShadow.position.set(sim.x,.018,sim.z);ballShadow.scale.setScalar(visualRadius*3.1);
  for(const a of attachments){
    const h=Math.min(a.size*.45,visualRadius*.42),halfDiagonal=Math.hypot(h*a.ratio,h)*.5;
    const v=a.direction.clone().applyQuaternion(ball.quaternion).multiplyScalar(visualRadius+halfDiagonal+.012);
    a.sprite.position.copy(ball.position).add(v);a.sprite.material.rotation=Math.sin(now*.0007+a.angle)*.14;a.sprite.scale.set(h*a.ratio,h,1);
    // The full cutout sits outside the sphere. Underside pieces disappear as a
    // whole before touching terrain, rather than being sliced by the ground.
    a.sprite.visible=a.sprite.position.y-halfDiagonal>.028;
  }
  // Prince follows behind the rolling direction and remains readable at every size.
  const moveAngle=Math.hypot(sim.vx,sim.vz)>.1?Math.atan2(sim.vx,sim.vz):yaw+Math.PI;
  const ph=Math.max(.29,visualRadius*.63),ratio=assets[18].image.width/assets[18].image.height;
  prince.scale.set(ph*ratio,ph,1);prince.position.set(sim.x-Math.sin(moveAngle)*(visualRadius+ph*.9),.035+(!reducedMotion&&result.distance>.002?Math.abs(Math.sin(now*.015))*ph*.09:0),sim.z-Math.cos(moveAngle)*(visualRadius+ph*.9));
  follow.lerp(new THREE.Vector3(sim.x,visualRadius*.25,sim.z),1-Math.exp(-dt*5));
  yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*5));
  const desiredSpan=inMenu?16:Math.max(6*2**(-Math.min(sim.level,32))+sim.diameter*4.1,sim.diameter*2.6/Math.max(.3,aspect));
  viewSpan+=(desiredSpan-viewSpan)*(1-Math.exp(-dt*4));
  const dist=Math.max(20,viewSpan*1.7);camera.position.set(follow.x+Math.sin(yaw)*dist,follow.y+dist*1.12,follow.z+Math.cos(yaw)*dist);camera.lookAt(follow);
  const cameraDistance=Math.hypot(dist,dist*1.12);camera.near=.05;camera.far=cameraDistance+viewSpan*4+40;
  camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  scene.fog.near=cameraDistance+viewSpan*.65;scene.fog.far=cameraDistance+viewSpan*2;
  terrain.update(sim.x,sim.z,viewSpan,aspect,cameraDistance,sim.world);
  const candidates=[],projection=new THREE.Vector3();
  for(const item of sim.items){
    const view=itemViews.get(item.id);if(!view)continue;
    view.sprite.visible=view.shadow.visible=false;if(item.collected)continue;
    projection.set(item.x,item.size*.4,item.z).project(camera);
    const margin=.1+item.size/viewSpan*Math.max(1,1/aspect);
    if(Math.abs(projection.x)<1+margin&&Math.abs(projection.y)<1+margin&&projection.z>-1&&projection.z<1)candidates.push({item,view,distance:(item.x-sim.x)**2+(item.z-sim.z)**2});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  for(const{item,view}of candidates.slice(0,650)){view.sprite.visible=true;view.shadow.visible=item.size>.3;}
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

$('start').addEventListener('click',()=>start(true));$('free').addEventListener('click',()=>start(false));
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
