import * as THREE from 'three';
import './style.css';
import './performance-hud.css';
import {Simulation,TYPES,PROP_ART_COUNT,CHUNK_SIZE,GOAL,ROUND_SECONDS,formatSize,sizeParts} from './simulation.js';
import {createTerrain} from './terrain.js';
import {CompoundView} from './compound-view.js';
import {WorldItemBatches} from './world-item-batches.js';
import {ToyModelLibrary} from './toy-model-library.js';
import {CHAPTERS} from './campaign.js';

const $=id=>document.getElementById(id);
const sim=new Simulation();
const MAX_VISIBLE_WORLD_ITEMS=520;
const ui={size:$('size'),unit:$('unit'),timer:$('timer'),growth:$('growth'),count:$('count'),district:$('district')};
const keys=new Set(),joystick={x:0,z:0,pointer:null};
let boostHeld=false,loaded=false,scene,renderer,camera,ball,prince,ballShadow,terrain,compoundView,targetMarker,modelLibrary;
let yaw=0,targetYaw=0,visualRadius=.16,viewSpan=8,follow=new THREE.Vector3();
let itemBatches,sparks=[],assets=[],lastVisibleItems=null,lastCullAt=0,lastCullX=NaN,lastCullZ=NaN,lastCullSpan=0,lastCullYaw=0;
let audio=null,soundEnabled=false,pickupUntil=0,milestoneUntil=0,hintUntil=0,startedAt=0;
let lastTime=performance.now(),frame=0,resultShown=false,averageFrameMs=16.7,averageCpuFrameMs=0,nextDprCheck=0,renderDpr=1;
const world=$('world'),loader=new THREE.TextureLoader();
const performanceHud=$('performance-hud');
let performanceHudEnabled=new URLSearchParams(location.search).has('performance'),gpuTimerExtension=null,gpuQueries=[],gpuFrameMs=null,lastPerformanceHudAt=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.add('menu-open');
performanceHud.hidden=!performanceHudEnabled;

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
function beginGpuTimer(){
  if(!performanceHudEnabled||!gpuTimerExtension||gpuQueries.length)return null;
  const gl=renderer.getContext(),query=gl.createQuery();gl.beginQuery(gpuTimerExtension.TIME_ELAPSED_EXT,query);return query;
}
function finishGpuTimer(query){if(query){const gl=renderer.getContext();gl.endQuery(gpuTimerExtension.TIME_ELAPSED_EXT);gpuQueries.push(query);}}
function pollGpuTimer(){
  if(!gpuTimerExtension||!gpuQueries.length)return;
  const gl=renderer.getContext(),query=gpuQueries[0];if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))return;
  if(!gl.getParameter(gpuTimerExtension.GPU_DISJOINT_EXT))gpuFrameMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
  gl.deleteQuery(query);gpuQueries.shift();
}
function updatePerformanceHud(now){
  if(!performanceHudEnabled||now-lastPerformanceHudAt<250)return;lastPerformanceHudAt=now;pollGpuTimer();
  $('perf-fps').textContent=(1000/Math.max(1,averageFrameMs)).toFixed(0);
  $('perf-frame').textContent=averageFrameMs.toFixed(1)+' ms';$('perf-cpu').textContent=averageCpuFrameMs.toFixed(1)+' ms';
  $('perf-gpu').textContent=gpuFrameMs===null?'n/a':gpuFrameMs.toFixed(1)+' ms';$('perf-dpr').textContent=renderDpr.toFixed(2);
  $('perf-draw').textContent=renderer.info.render.calls.toLocaleString();$('perf-tris').textContent=renderer.info.render.triangles.toLocaleString();
  $('perf-visible').textContent=itemBatches.visibleCount.toLocaleString()+' ('+itemBatches.modelCount+' 3D)';
  $('perf-chunks').textContent=sim.world.chunks.size+' + '+sim.world.preloaded.size+' warm';
  $('perf-models').textContent=modelLibrary.models.size.toLocaleString();$('perf-pieces').textContent=sim.body.pieces.length.toLocaleString();
}
async function init(){
  try{
    const contactReady=import('./compound-contact.js').then(module=>module.initializeCompoundContact());
    renderer=new THREE.WebGLRenderer({canvas:world,antialias:true,alpha:false,powerPreference:'high-performance'});
    gpuTimerExtension=renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2');
    renderDpr=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(renderDpr);renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();scene.background=new THREE.Color('#bce7a0');scene.fog=new THREE.Fog('#bce7a0',50,105);
    camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,150);
    scene.add(new THREE.HemisphereLight('#fffbe4','#73935c',2.7));
    const sun=new THREE.DirectionalLight('#fff1bf',2.5);sun.position.set(-10,22,12);scene.add(sun);
    modelLibrary=new ToyModelLibrary();
    const [textures,contact]=await Promise.all([Promise.all([...Array.from({length:PROP_ART_COUNT},(_,i)=>loadTexture(`/assets/prop-${i}.webp`)),loadTexture('/assets/grass.webp'),loadTexture('/assets/paving.webp'),loadTexture('/assets/ball.webp'),loadTexture('/assets/ocean.webp')]),contactReady,modelLibrary.load()]);
    assets=textures.slice(0,PROP_ART_COUNT);shadowMap=shadowTexture();sim.setContact(contact);
    sim.setArtRatios(assets.map(texture=>texture.image.width/texture.image.height));
    terrain=createTerrain(textures[PROP_ART_COUNT],textures[PROP_ART_COUNT+1],renderer,textures[PROP_ART_COUNT+3]);scene.add(terrain.mesh);
    compoundView=new CompoundView(scene,assets,modelLibrary);itemBatches=new WorldItemBatches(scene,assets,shadowMap,modelLibrary);
    // The original seed stays small; retained objects form the entire growing heap.
    ball=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial({map:textures[PROP_ART_COUNT+2],roughness:.82,metalness:0}));compoundView.root.add(ball);
    ballShadow=shadow(.48);scene.add(ballShadow);
    prince=sprite(18,.34);scene.add(prince);
    targetMarker=new THREE.Mesh(new THREE.RingGeometry(.46,.5,64),new THREE.MeshBasicMaterial({color:'#ffe278',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));targetMarker.rotation.x=-Math.PI/2;targetMarker.visible=false;scene.add(targetMarker);
    resize();
    loaded=true;$('start').disabled=false;$('free').disabled=false;$('start').textContent='Roll the island · 7 stages';
    registerTools();requestAnimationFrame(tick);
  }catch(error){reportError(error.message||'This device could not start WebGL. Try a browser with hardware acceleration enabled.');}
}
function resize(){
  if(!renderer)return;const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);
  const aspect=w/Math.max(1,h);camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();
}
function resetVisuals(){
  compoundView.reset();
  for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks=[];
  itemBatches.begin();itemBatches.end();lastVisibleItems=null;lastCullAt=0;
  ball.quaternion.identity();visualRadius=sim.diameter/2;viewSpan=6+sim.diameter*4.1;follow.set(sim.x,0,sim.z);yaw=targetYaw=0;
}
function start(runMode='campaign'){
  if(!loaded)return;sim.reset(runMode);resetVisuals();resultShown=false;startedAt=performance.now();hintUntil=startedAt+9500;
  $('hint').textContent='Everything sticks. Follow the goal and build a monster.';
  $('goal-label').textContent='GOAL · '+sim.nextGoalSize();
  hideMenus();updateHud();initAudio();world.focus({preventScroll:true});
}
function hideMenus(){for(const id of ['menu','pause-menu','result-menu'])$(id).classList.add('hidden');document.body.classList.remove('menu-open');}
function resetInput(){keys.clear();joystick.x=joystick.z=0;joystick.pointer=null;boostHeld=false;$('boost').classList.remove('held');$('stick').style.transform='translate(0,0)';}
function pause(){if(sim.mode!=='playing')return;sim.mode='paused';resetInput();$('pause-menu').classList.remove('hidden');document.body.classList.add('menu-open');}
function resume(){if(sim.mode!=='paused'||!loaded)return;sim.mode='playing';hideMenus();lastTime=performance.now();world.focus({preventScroll:true});}
function finish(){
  resultShown=true;
  resetInput();$('result-menu').classList.remove('hidden');document.body.classList.add('menu-open');
  const completedIsland=sim.won&&sim.runMode==='campaign';
  $('result-kicker').textContent=completedIsland?'SUNNY SIDE ISLAND · COMPLETELY ROLLED':sim.won?'QUICK CHALLENGE COMPLETE':'THE CLOCK CAUGHT UP';
  $('result-title').innerHTML=completedIsland?'What a<br><em>monstrosity.</em>':sim.won?'A beautiful<br><em>little monster.</em>':'One more<br><em>glorious roll?</em>';
  $('result-size').textContent=formatSize(sim.diameter,sim.level);$('result-count').textContent=String(sim.count);
  $('result-score').textContent=sim.score.toLocaleString();$('result-combo').textContent=String(sim.bestCombo);
  const recordKey='katamari:'+sim.runMode+'-best';
  let best=null;try{best=JSON.parse(localStorage.getItem(recordKey)||'null');}catch{}
  const newBest=sim.won&&(!best||sim.score>best.score);
  if(sim.won){const record={score:Math.max(best?.score||0,sim.score),seconds:Math.min(best?.seconds??Infinity,Math.round(sim.elapsed)),combo:Math.max(best?.combo||0,sim.bestCombo)};try{localStorage.setItem(recordKey,JSON.stringify(record));}catch{}best=record;}
  $('result-record').textContent=sim.won?(newBest?'NEW PERSONAL BEST · ':'')+'Best '+best.score.toLocaleString()+' pts · Fastest '+Math.floor(best.seconds/60)+':'+String(best.seconds%60).padStart(2,'0'):best?'Your personal best: '+best.score.toLocaleString()+' pts':'';
  $('stage-recap').replaceChildren();for(const stage of sim.chapterStats){const row=document.createElement('div');row.textContent=stage.name+' · '+stage.size+' · '+stage.seconds+' s';$('stage-recap').append(row);}
  $('result-text').textContent=completedIsland?'Candy, cars, castles, a mountain, and the whole island. Every piece is still in that ridiculous heap. You finished the level.':sim.won?'Six meters of permanently stuck stuff. Your quick challenge is finished.':`You reached ${sim.runMode==='campaign'?Math.min(sim.chapter+1,CHAPTERS.length)+' / '+CHAPTERS.length+' stages':'the quick challenge'} and built a pile of ${sim.count} things. Try again for the finish.`;
  $('again').textContent='Roll again · '+(sim.runMode==='campaign'?'the island':'quick challenge');
  melody(sim.won?[523,659,784,1047]:[440,392,330]);
}
function inspectResult(){hideMenus();hintUntil=performance.now()+12000;$('hint').textContent='Finished. Rotate the camera to admire your heap. Tap Ⅱ for results.';}
function updateHud(){
  const parts=sizeParts(sim.diameter,sim.level);ui.size.textContent=parts.value;ui.unit.textContent=parts.unit;ui.size.style.fontSize=parts.value.length>5?'30px':'';
  ui.count.textContent=`${sim.count} stuck object${sim.count===1?'':'s'}`;
  $('boost').style.setProperty('--boost-energy',sim.boostEnergy+'%');$('boost').classList.toggle('depleted',sim.boostExhausted);$('boost').querySelector('small').textContent=sim.boostExhausted?'RECHARGE':'HOLD';
  ui.growth.style.width=`${Math.min(100,sim.progress()*100)}%`;
  $('goal-label').textContent=`GOAL · ${sim.nextGoalSize()}`;
  const t=Math.max(0,Math.ceil(sim.timeLimit-sim.elapsed));ui.timer.textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;ui.timer.style.color=t<=30?'#d65374':'';
  ui.district.textContent=sim.world.district(sim.x,sim.z);
  document.querySelector('.size-sticker').innerHTML=sim.scaleLabel().replace(' ','<br>');
  const goal=sim.chapterGoal();$('chapter-title').textContent=sim.runMode==='quick'?'QUICK CHALLENGE':`${Math.min(sim.chapter+1,CHAPTERS.length)} / ${CHAPTERS.length} · ${goal.name}`;
  $('stage-track').textContent=sim.runMode==='campaign'?CHAPTERS.map((chapter,i)=>(i<sim.chapter?'●':i===sim.chapter?'◉':'○')).join('  '):'4 MINUTE CHALLENGE';
  $('chapter-hint').textContent=sim.runMode==='quick'?'Build a 6 m heap before the four-minute clock runs out.':goal.hint;
  const multiplier=Math.min(5,1+Math.floor(sim.combo/4));$('score').textContent=sim.score.toLocaleString()+' PTS';$('combo').textContent=sim.combo>=4&&sim.elapsed-sim.lastPickup<1.5?'×'+multiplier+' COMBO':'';
  const target=sim.runMode==='campaign'?sim.objective():null;
  $('target-guide').classList.toggle('hidden',!target||sim.mode!=='playing');
  if(target){const dx=target.x-sim.x,dz=target.z-sim.z,sx=dx*Math.cos(yaw)-dz*Math.sin(yaw),sy=dx*Math.sin(yaw)+dz*Math.cos(yaw);$('target-arrow').style.transform=`rotate(${Math.atan2(sx,-sy)*180/Math.PI}deg)`;$('target-distance').textContent=formatSize(Math.hypot(dx,dz),sim.level);$('target-name').textContent=target.name||TYPES[target.type].name;}
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
  const cpuStartedAt=performance.now();
  const rawFrameMs=Math.max(0,now-lastTime),dt=Math.min(.05,rawFrameMs/1000);lastTime=now;frame++;
  averageFrameMs+=(rawFrameMs-averageFrameMs)*.06;
  if(now>nextDprCheck){
    nextDprCheck=now+1200;
    const deviceLimit=Math.min(window.devicePixelRatio||1,2);let nextDpr=renderDpr;
    if(averageFrameMs>24&&renderDpr>1)nextDpr=Math.max(1,renderDpr-.25);
    else if(averageFrameMs<16.5&&renderDpr<deviceLimit)nextDpr=Math.min(deviceLimit,renderDpr+.125);
    if(nextDpr!==renderDpr){renderDpr=nextDpr;renderer.setPixelRatio(renderDpr);resize();}
  }
  const aspect=world.clientWidth/Math.max(1,world.clientHeight);
  sim.setViewRadius(Math.ceil(viewSpan*Math.max(1,aspect)*.65/CHUNK_SIZE)+1);
  sim.setVisibleRadius(viewSpan*Math.max(1,aspect)*1.3+sim.diameter*2);
  const result=sim.step(dt,input());
  const transform=result.transform;
  if(transform.scale!==1||transform.x!==0||transform.z!==0){
    follow.multiplyScalar(transform.scale);follow.x+=transform.x;follow.z+=transform.z;
    visualRadius*=transform.scale;viewSpan*=transform.scale;
    for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks=[];
  }
  if(result.pickups.length){
    for(const picked of result.pickups){
      lastVisibleItems=null;
      const item={...picked,x:picked.x*transform.scale+transform.x,z:picked.z*transform.scale+transform.z,size:picked.size*transform.scale};
      emitSparks(item);
    }
    const last=result.pickups[result.pickups.length-1];$('pickup').textContent=`+ ${last.name||TYPES[last.type].name} · ${formatSize(last.size,last.sizeLevel??sim.level)}${sim.combo>=3?' · '+sim.combo+' in a row!':''}`;pickupUntil=now+1500;
    tone(350+Math.min(sim.combo,12)*45,.09);
    if(navigator.vibrate)navigator.vibrate(12);
  }
  if(result.checkpoint||result.unlock||(result.milestone!==null&&result.milestone!==undefined)){
    const messages=['A little bigger!','Look at you grow!','Bicycles? Absolutely.','Here come the vans!'];
    $('milestone').textContent=result.checkpoint||result.unlock||messages[result.milestone]||`${formatSize(sim.diameter,sim.level)} of glorious stuff!`;milestoneUntil=now+2800;melody([392,523,659]);
  }
  if(sim.mode==='result'&&!resultShown)finish();
  const inMenu=sim.mode==='menu';
  const renderDiameter=inMenu ? .55 : Math.max(sim.diameter,Math.min(sim.body.boundRadius*2,sim.diameter*2.4));
  const radiusTarget=inMenu ? .55 : renderDiameter*.5;
  visualRadius+=(radiusTarget-visualRadius)*(1-Math.exp(-dt*8));
  compoundView.sync(sim.body,now,!reducedMotion);compoundView.pose(sim.x,inMenu ? .55 : sim.body.height,sim.z,sim.body.orientation);
  ball.scale.setScalar(inMenu ? .55 : sim.body.coreRadius);ball.position.set(0,0,0);
  if(inMenu&&!reducedMotion)compoundView.root.rotateY(now*.0002);
  ballShadow.position.set(sim.x,.018,sim.z);ballShadow.scale.setScalar(visualRadius*2.7);
  ballShadow.material.opacity=.72/(1+Math.max(0,sim.body.height-sim.body.lastGround)/Math.max(.1,visualRadius));
  // Prince follows behind the rolling direction and remains readable at every size.
  const moveAngle=Math.hypot(sim.vx,sim.vz)>.1?Math.atan2(sim.vx,sim.vz):yaw+Math.PI;
  const ph=Math.max(.29,visualRadius*.63),ratio=assets[18].image.width/assets[18].image.height;
  prince.scale.set(ph*ratio,ph,1);prince.position.set(sim.x-Math.sin(moveAngle)*(visualRadius+ph*.9),.035+(!reducedMotion&&result.distance>.002?Math.abs(Math.sin(now*.015))*ph*.09:0),sim.z-Math.cos(moveAngle)*(visualRadius+ph*.9));
  follow.lerp(new THREE.Vector3(sim.x,visualRadius*.25,sim.z),1-Math.exp(-dt*5));
  yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*5));
  const desiredSpan=inMenu?16:Math.max(6*2**(-Math.min(sim.level,32))+renderDiameter*4.1,renderDiameter*2.6/Math.max(.3,aspect));
  viewSpan+=(desiredSpan-viewSpan)*(1-Math.exp(-dt*4));
  const dist=Math.max(20,viewSpan*1.7);camera.position.set(follow.x+Math.sin(yaw)*dist,follow.y+dist*1.12,follow.z+Math.cos(yaw)*dist);camera.lookAt(follow);
  const cameraDistance=Math.hypot(dist,dist*1.12);camera.near=.05;camera.far=cameraDistance+viewSpan*4+40;
  camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  scene.fog.near=cameraDistance+viewSpan*.65;scene.fog.far=cameraDistance+viewSpan*2;
  terrain.update(sim.x,sim.z,viewSpan,aspect,cameraDistance,sim.world);
  const missionTarget=sim.runMode==='campaign'&&sim.mode==='playing'?sim.objective():null;
  targetMarker.visible=Boolean(missionTarget);if(missionTarget){targetMarker.position.set(missionTarget.x,Math.max(.03,sim.diameter*.002),missionTarget.z);targetMarker.scale.setScalar(missionTarget.size*1.25);}
  const moved=Math.hypot(sim.x-lastCullX,sim.z-lastCullZ)>Math.max(.35,viewSpan*.035);
  const turned=Math.abs(yaw-lastCullYaw)>.045,zoomed=Math.abs(viewSpan-lastCullSpan)>Math.max(.25,viewSpan*.035);
  if(now-lastCullAt>95||moved||turned||zoomed||sim.items!==lastVisibleItems){
    const radius=viewSpan*Math.hypot(1,aspect)*.8+sim.body.boundRadius+2;
    const nearby=sim.world.nearby(sim.x,sim.z,radius),candidates=[],projection=new THREE.Vector3();
    for(const item of nearby){
      if(item.collected)continue;
      projection.set(item.x,item.size*.4,item.z).project(camera);
      const margin=.12+item.size/viewSpan*1.5;
      if(Math.abs(projection.x)<1+margin&&Math.abs(projection.y)<1+margin&&projection.z>-1&&projection.z<1)candidates.push(item);
    }
    candidates.sort((a,b)=>Number(b.objectiveIndex===sim.chapter)-Number(a.objectiveIndex===sim.chapter)||(a.x-sim.x)**2+(a.z-sim.z)**2-((b.x-sim.x)**2+(b.z-sim.z)**2));
    itemBatches.begin();for(const item of candidates.slice(0,MAX_VISIBLE_WORLD_ITEMS)){const type=TYPES[item.type],art=type.art;itemBatches.put({...item,art,fitSize:type.fitSize},assets[art],yaw,world.clientHeight/viewSpan);}itemBatches.end();
    lastVisibleItems=sim.items;lastCullAt=now;lastCullX=sim.x;lastCullZ=sim.z;lastCullSpan=viewSpan;lastCullYaw=yaw;
  }
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.mesh.position.y+=dt*.7;s.mesh.material.opacity=Math.max(0,s.life/.65);if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();sparks.splice(i,1);}}
  $('pickup').classList.toggle('show',now<pickupUntil&&sim.mode==='playing');$('milestone').classList.toggle('show',now<milestoneUntil&&sim.mode==='playing');$('hint').style.opacity=now<hintUntil?'1':'0';
  if(frame%5===0)updateHud();
  const gpuQuery=beginGpuTimer();renderer.render(scene,camera);finishGpuTimer(gpuQuery);pollGpuTimer();
  const cpuMs=performance.now()-cpuStartedAt;averageCpuFrameMs+=(cpuMs-averageCpuFrameMs)*.12;updatePerformanceHud(now);requestAnimationFrame(tick);
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

$('start').addEventListener('click',()=>start('campaign'));$('free').addEventListener('click',()=>start('quick'));
$('pause').addEventListener('click',()=>{if(sim.mode==='result'){$('result-menu').classList.remove('hidden');document.body.classList.add('menu-open');}else sim.mode==='paused'?resume():pause();});$('resume').addEventListener('click',resume);
$('restart').addEventListener('click',()=>start(sim.runMode));$('again').addEventListener('click',()=>start(sim.runMode));$('continue').addEventListener('click',inspectResult);
$('camera').addEventListener('click',()=>{if(sim.mode==='playing'||sim.mode==='result')targetYaw+=Math.PI/4;});
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
  if(sim.mode==='result'&&!e.repeat){if(e.code==='KeyQ')targetYaw-=Math.PI/4;if(e.code==='KeyE')targetYaw+=Math.PI/4;return;}
  if(sim.mode!=='playing')return;keys.add(e.code);
  if(!e.repeat&&e.code==='KeyQ')targetYaw-=Math.PI/4;if(!e.repeat&&e.code==='KeyE')targetYaw+=Math.PI/4;
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);
window.addEventListener('keydown',e=>{if(e.code==='F3'){e.preventDefault();performanceHudEnabled=!performanceHudEnabled;performanceHud.hidden=!performanceHudEnabled;}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('resize',resize);
world.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();reportError('The graphics connection paused. Reload to start a fresh roll.');});

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa')){
  window.__katamariQa={
    setScaleMeters(meters){
      if(!loaded)throw new Error('Wait until the neighborhood is ready.');
      const target=Math.max(.32,Number(meters)||.32);start('campaign');
      const targetLevel=Math.max(0,Math.ceil(Math.log2(target/7.9)));
      while(sim.level<targetLevel){const offset=sim.world.rescale(sim);sim.x=sim.x/2+offset.shiftX;sim.z=sim.z/2+offset.shiftZ;sim.diameter/=2;sim.volume/=8;sim.visibleRadius/=2;sim.body.rescale(.5);}
      const normalized=target/2**sim.level,factor=normalized/sim.diameter;sim.diameter=normalized;sim.volume=normalized**3;sim.body.rescale(factor);
      sim.contact?.dispose();sim.contact=sim.Contact?new sim.Contact(sim.body,sim.x,sim.z):null;
      sim.scaleStage=[0,1,6,12,30,100,500,1600,4000].reduce((stage,size,index)=>target>=size?index:stage,0);
      if(target>=8){
        sim.world.invalidatePrefetch();sim.world.legacy=sim.world.legacy.filter(item=>item.objectiveIndex!==undefined||Math.hypot(item.x-sim.x,item.z-sim.z)>sim.body.boundRadius+item.size+1);
        sim.world.items=sim.world.legacy;sim.world.chunks.clear();sim.world.preloaded.clear();sim.world.stamp='';
        sim.world.guards.push({x:sim.x,z:sim.z,radius:sim.body.boundRadius+2});sim.world.sync(sim,sim.viewRadius);
      }
      sim.mode='paused';$('pause-menu').classList.add('hidden');document.body.classList.remove('menu-open');
      sim.world.sync(sim,sim.viewRadius);resetVisuals();updateHud();return sim.snapshot();
    },
    addTestAttachments(typeIds){
      if(!loaded)throw new Error('Wait until the neighborhood is ready.');
      const ids=typeIds?.length?typeIds:[6,15,16];
      for(let i=0;i<ids.length;i++){
        const type=Number(ids[i]),info=TYPES[type];if(!info)continue;
        const size=info.size*2**(-sim.level),angle=i*2.3999632297,orbit=Math.max(sim.body.boundRadius*.9,size*.55);
        const item={id:'qa-piece-'+type+'-'+i,type,art:info.art,name:info.name,size,visualSeed:(type*2654435761+i)>>>0,x:sim.x+Math.cos(angle)*orbit,z:sim.z+Math.sin(angle)*orbit};
        sim.body.attach(item,info,sim.artRatios[info.art]||1,sim.x,sim.z,sim.diameter);sim.count++;
      }
      sim.contact?.synchronize(sim.body,sim.x,sim.z);sim.mode='paused';compoundView.sync(sim.body,performance.now(),false);updateHud();return sim.snapshot();
    },
    resume(){sim.mode='playing';},
    state:()=>sim.snapshot(),
  };
}

function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_roll_status',description:'Read the current neighborhood game status, size, timer and collection count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>sim.snapshot()});
  register({name:'start_neighborhood_roll',description:'Start a fresh finite island campaign or four-minute quick challenge. Resets the current heap and collection.',inputSchema:{type:'object',properties:{runMode:{type:'string',enum:['campaign','quick']}},required:['runMode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!['campaign','quick'].includes(input?.runMode))throw new Error('runMode must be campaign or quick');start(input.runMode);return sim.snapshot();}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
