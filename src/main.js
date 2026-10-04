import * as THREE from 'three';
import './style.css';
import './performance-hud.css';
import './island-menu.css';
import './notifications.css';
import {Simulation,TYPES,CHUNK_SIZE,GOAL,ROUND_SECONDS,formatSize,sizeParts} from './simulation.js';
import {createTerrain} from './terrain.js';
import {CompoundView} from './compound-view.js';
import {WorldItemBatches} from './model-batches.js';
import {ToyModelLibrary} from './toy-model-library.js';
import {ISLANDS,islandConfig} from './island-layout.js';

const $=id=>document.getElementById(id);
const sim=new Simulation();
let selectedIsland='oahu',qaOverview=false,lastRenderedItems=[];
const performanceSamples=[];
const ui={size:$('size'),unit:$('unit'),timer:$('timer'),growth:$('growth'),count:$('count'),district:$('district')};
const keys=new Set(),joystick={x:0,z:0,pointer:null};
let boostHeld=false,loaded=false,scene,renderer,camera,ball,prince,ballShadow,terrain,compoundView,targetMarker,modelLibrary;
let yaw=0,targetYaw=0,visualRadius=.16,viewSpan=8,follow=new THREE.Vector3();
let itemBatches,sparks=[],lastVisibleItems=null,lastCullAt=0,lastCullX=NaN,lastCullZ=NaN,lastCullSpan=0,lastCullYaw=0;
let audio=null,soundEnabled=false,pickupUntil=0,milestoneUntil=0,hintUntil=0,startedAt=0;
let lastTime=performance.now(),frame=0,resultShown=false,averageFrameMs=16.7,averageCpuFrameMs=0,nextDprCheck=0,renderDpr=1;
const world=$('world'),loader=new THREE.TextureLoader();
const performanceHud=$('performance-hud');
let performanceHudEnabled=new URLSearchParams(location.search).has('performance'),gpuTimerExtension=null,gpuQueries=[],gpuFrameMs=null,lastPerformanceHudAt=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.add('menu-open');
performanceHud.hidden=!performanceHudEnabled;

function reportError(message){$('error-text').textContent=message;$('error').classList.remove('hidden');sim.mode='paused';document.body.classList.add('menu-open');}
function loadTexture(url,colorSpace=THREE.SRGBColorSpace){return new Promise((resolve,reject)=>loader.load(url,t=>{t.colorSpace=colorSpace;resolve(t);},undefined,()=>reject(new Error('The game artwork could not load. Check your connection and try again.'))));}
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
    renderer=new THREE.WebGLRenderer({canvas:world,antialias:true,alpha:false,powerPreference:'high-performance'});
    gpuTimerExtension=renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2');
    renderDpr=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(renderDpr);renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();scene.background=new THREE.Color('#bce7a0');scene.fog=new THREE.Fog('#bce7a0',50,105);
    camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,150);
    scene.add(new THREE.HemisphereLight('#fffbe4','#73935c',1.35));
    const sun=new THREE.DirectionalLight('#fff1bf',1.85);sun.position.set(-10,22,12);scene.add(sun);
    modelLibrary=new ToyModelLibrary();
    const [textures]=await Promise.all([Promise.all([loadTexture('/assets/grass.webp'),loadTexture('/assets/paving.webp'),loadTexture('/assets/ball.webp'),loadTexture('/assets/ocean.webp'),loadTexture('/assets/oahu-field.png',THREE.NoColorSpace),loadTexture('/assets/lanai-field.png',THREE.NoColorSpace)]),modelLibrary.load()]);
    shadowMap=shadowTexture();sim.setArtRatios(modelLibrary.manifest.artRatios);
    sim.setModelBounds((type,seed)=>modelLibrary.pick(type,seed)?.bounds.toArray());
    terrain=createTerrain(textures[0],textures[1],renderer,textures[3],{oahu:textures[4],lanai:textures[5]});scene.add(terrain.mesh);
    compoundView=new CompoundView(scene,modelLibrary);itemBatches=new WorldItemBatches(scene,modelLibrary,shadowMap);
    // The original seed stays small; retained objects form the entire growing heap.
    ball=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshStandardMaterial({map:textures[2],roughness:.82,metalness:0}));compoundView.root.add(ball);
    ballShadow=shadow(.48);scene.add(ballShadow);
    const guide=modelLibrary.pick('guide',0);if(!guide)throw new Error('The rolling guide model could not load.');
    prince=new THREE.Mesh(guide.geometry,modelLibrary.material);scene.add(prince);
    targetMarker=new THREE.Mesh(new THREE.RingGeometry(.46,.5,64),new THREE.MeshBasicMaterial({color:'#ffe278',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));targetMarker.rotation.x=-Math.PI/2;targetMarker.visible=false;scene.add(targetMarker);
    resize();
    for(const texture of textures)renderer.initTexture(texture);
    itemBatches.begin();
    for(let type=0;type<TYPES.length;type++){
      const info=TYPES[type],variants=modelLibrary.manifest.types[String(type)]?.models.length||1;
      for(let seed=0;seed<variants;seed++)for(const detail of [1,1000])itemBatches.put({id:'warm:'+type+':'+seed,type,size:1,x:0,z:0,visualSeed:seed},detail);
    }
    itemBatches.end();camera.position.set(0,20,20);camera.lookAt(0,0,0);
    compoundView.prewarm();
    await renderer.compileAsync(scene,camera);
    renderer.render(scene,camera);
    compoundView.prewarmFar();renderer.render(scene,camera);compoundView.reset();
    itemBatches.begin();itemBatches.end();lastVisibleItems=null;
    loaded=true;$('start').disabled=false;$('free').disabled=false;selectIsland(selectedIsland);
    lastTime=performance.now();registerTools();requestAnimationFrame(tick);
  }catch(error){reportError(error.message||'This device could not start WebGL. Try a browser with hardware acceleration enabled.');}
}
function resize(){
  if(!renderer)return;const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);
  const aspect=w/Math.max(1,h);camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();
}
function resetVisuals(){
  averageFrameMs=16.7;nextDprCheck=performance.now()+2000;
  const deviceDpr=Math.min(window.devicePixelRatio||1,2);
  if(renderDpr!==deviceDpr){renderDpr=deviceDpr;renderer.setPixelRatio(renderDpr);resize();}
  compoundView.reset();
  for(const s of sparks){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}sparks=[];
  itemBatches.begin();itemBatches.end();lastVisibleItems=null;lastRenderedItems=[];lastCullAt=0;
  ball.quaternion.identity();visualRadius=sim.diameter/2;viewSpan=6+sim.diameter*4.1;follow.set(sim.x,0,sim.z);yaw=targetYaw=0;
}
function selectIsland(id){
  selectedIsland=islandConfig(id).id;
  for(const key of Object.keys(ISLANDS)){const button=$('island-'+key);button.setAttribute('aria-pressed',String(key===selectedIsland));button.classList.toggle('selected',key===selectedIsland);}
  $('selected-island-name').textContent=islandConfig(selectedIsland).name;
  if(loaded)$('start').textContent='Roll '+islandConfig(selectedIsland).name+' · 7 stages';
}
function showIslandMenu(){
  resetInput();sim.reset('campaign',selectedIsland);sim.mode='menu';qaOverview=false;resetVisuals();hideMenus();
  $('menu').classList.remove('hidden');document.body.classList.add('menu-open');selectIsland(selectedIsland);
}
function start(runMode='campaign',islandId=selectedIsland){
  if(!loaded)return;resetInput();selectIsland(islandId);qaOverview=false;performanceSamples.length=0;sim.reset(runMode,selectedIsland);resetVisuals();resultShown=false;startedAt=performance.now();hintUntil=startedAt+9500;
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
  $('result-kicker').textContent=completedIsland?sim.world.layout.name.toUpperCase()+' · COMPLETELY ROLLED':sim.won?'QUICK CHALLENGE COMPLETE':'THE CLOCK CAUGHT UP';
  $('result-title').innerHTML=completedIsland?'What a<br><em>monstrosity.</em>':sim.won?'A beautiful<br><em>little monster.</em>':'One more<br><em>glorious roll?</em>';
  $('result-size').textContent=formatSize(sim.diameter,sim.level);$('result-count').textContent=String(sim.count);
  $('result-score').textContent=sim.score.toLocaleString();$('result-combo').textContent=String(sim.bestCombo);
  const recordKey='katamari:'+sim.islandId+':'+sim.runMode+'-best';
  let best=null;try{best=JSON.parse(localStorage.getItem(recordKey)||(sim.islandId==='oahu'?localStorage.getItem('katamari:'+sim.runMode+'-best'):null)||'null');}catch{}
  const newBest=sim.won&&(!best||sim.score>best.score);
  if(sim.won){const record={score:Math.max(best?.score||0,sim.score),seconds:Math.min(best?.seconds??Infinity,Math.round(sim.elapsed)),combo:Math.max(best?.combo||0,sim.bestCombo)};try{localStorage.setItem(recordKey,JSON.stringify(record));}catch{}best=record;}
  $('result-record').textContent=sim.won?(newBest?'NEW PERSONAL BEST · ':'')+'Best '+best.score.toLocaleString()+' pts · Fastest '+Math.floor(best.seconds/60)+':'+String(best.seconds%60).padStart(2,'0'):best?'Your personal best: '+best.score.toLocaleString()+' pts':'';
  $('stage-recap').replaceChildren();for(const stage of sim.chapterStats){const row=document.createElement('div');row.textContent=stage.name+' · '+stage.size+' · '+stage.seconds+' s';$('stage-recap').append(row);}
  $('result-text').textContent=completedIsland?sim.world.layout.name+' is rolled. Every piece is still in that ridiculous heap. You finished this island.':sim.won?'Six meters of permanently stuck stuff. Your quick challenge is finished.':`You reached ${sim.runMode==='campaign'?Math.min(sim.chapter+1,sim.chapters.length)+' / '+sim.chapters.length+' stages':'the quick challenge'} and built a pile of ${sim.count} things. Try again for the finish.`;
  $('again').textContent='Roll again · '+sim.world.layout.name;
  $('next-island').classList.toggle('hidden',!(completedIsland&&sim.islandId==='oahu'));
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
  ui.district.textContent=sim.world.layout.name+' · '+sim.world.district(sim.x,sim.z);
  document.querySelector('.size-sticker').innerHTML=sim.scaleLabel().replace(' ','<br>');
  const goal=sim.chapterGoal();$('chapter-title').textContent=sim.runMode==='quick'?'QUICK CHALLENGE':`${Math.min(sim.chapter+1,sim.chapters.length)} / ${sim.chapters.length} · ${goal.name}`;
  $('stage-track').textContent=sim.runMode==='campaign'?sim.chapters.map((chapter,i)=>(i<sim.chapter?'●':i===sim.chapter?'◉':'○')).join('  '):'4 MINUTE CHALLENGE';
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
    else if(averageFrameMs<18&&renderDpr<deviceLimit)nextDpr=Math.min(deviceLimit,renderDpr+.125);
    if(nextDpr!==renderDpr){renderDpr=nextDpr;renderer.setPixelRatio(renderDpr);resize();}
  }
  const viewportWidth=world.clientWidth,viewportHeight=world.clientHeight;
  const aspect=viewportWidth/Math.max(1,viewportHeight);
  // Cover the ground-plane camera diagonal, the trailing follow offset, and
  // two hidden chunk rows. Camera zoom must never outrun the loaded world.
  const coverage=viewSpan*Math.hypot(aspect,1.5)*.65+sim.body.boundRadius+4;
  sim.setViewRadius(Math.ceil(coverage/CHUNK_SIZE)+2);
  sim.setVisibleRadius(coverage);
  // Paused inspection and island-overview cameras still need a complete world.
  if(sim.mode!=='playing')sim.world.sync(sim,sim.viewRadius);
  const result=sim.step(dt,input());
  const simulationFinishedAt=performance.now();
  const transform=result.transform;
  if(transform.scale!==1||transform.x!==0||transform.z!==0){
    lastVisibleItems=null;
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
  compoundView.sync(sim.body,now,!reducedMotion,viewportHeight/viewSpan);compoundView.pose(sim.x,inMenu ? .55 : sim.body.height,sim.z,sim.body.orientation);
  ball.scale.setScalar(inMenu ? .55 : sim.body.coreRadius);ball.position.set(0,0,0);
  if(inMenu&&!reducedMotion)compoundView.root.rotateY(now*.0002);
  ballShadow.position.set(sim.x,.018,sim.z);ballShadow.scale.setScalar(visualRadius*2.7);
  ballShadow.material.opacity=.72/(1+Math.max(0,sim.body.height-sim.body.lastGround)/Math.max(.1,visualRadius));
  // Prince follows behind the rolling direction and remains readable at every size.
  const moveAngle=Math.hypot(sim.vx,sim.vz)>.1?Math.atan2(sim.vx,sim.vz):yaw+Math.PI;
  const ph=Math.max(.29,visualRadius*.63);
  prince.scale.setScalar(ph);prince.rotation.y=moveAngle;
  prince.position.set(sim.x-Math.sin(moveAngle)*(visualRadius+ph*.9),.015+(!reducedMotion&&result.distance>.002?Math.abs(Math.sin(now*.015))*ph*.09:0),sim.z-Math.cos(moveAngle)*(visualRadius+ph*.9));
  follow.lerp(qaOverview?new THREE.Vector3(-Number(sim.world.originX)*CHUNK_SIZE,0,-Number(sim.world.originZ)*CHUNK_SIZE+(sim.islandId==='oahu'?-1500:0)*2**(-sim.level)):new THREE.Vector3(sim.x,visualRadius*.25,sim.z),1-Math.exp(-dt*5));
  yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*5));
  const desiredSpan=qaOverview?sim.world.layout.half*2.1*Math.max(1,1/aspect)*2**(-sim.level):inMenu?16:Math.max(6*2**(-Math.min(sim.level,32))+renderDiameter*4.1,renderDiameter*2.6/Math.max(.3,aspect));
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
  if(now-lastCullAt>95||moved||turned||zoomed||lastVisibleItems===null){
    const pixelsPerUnit=viewportHeight/viewSpan;
    const radius=viewSpan*Math.hypot(aspect,1.5)*.65+sim.body.boundRadius+4;
    const nearby=sim.world.nearby(sim.x,sim.z,radius),candidates=[];
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const sphere=new THREE.Sphere();
    for(const item of nearby){
      if(item.collected||item.size*pixelsPerUnit<1.2)continue;
      const bounds=modelLibrary.pick(item.type,item.visualSeed).bounds;
      sphere.center.set(item.x,item.size*1.05*bounds.y*.5,item.z);
      sphere.radius=item.size*1.12*bounds.length()*.5+viewSpan*.08;
      if(frustum.intersectsSphere(sphere))candidates.push(item);
    }
    // Culling is geometric. A nearest-N budget made visible props blink when
    // another prop became closer; density belongs to deterministic generation.
    lastRenderedItems=candidates;
    itemBatches.begin();for(const item of lastRenderedItems)itemBatches.put(item,pixelsPerUnit);itemBatches.end();
    lastVisibleItems=sim.items;lastCullAt=now;lastCullX=sim.x;lastCullZ=sim.z;lastCullSpan=viewSpan;lastCullYaw=yaw;
  }
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.mesh.position.y+=dt*.7;s.mesh.material.opacity=Math.max(0,s.life/.65);if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();sparks.splice(i,1);}}
  itemBatches.updateMotion();
  const milestoneActive=now<milestoneUntil&&sim.mode==='playing';
  const pickupActive=!milestoneActive&&now<pickupUntil&&sim.mode==='playing';
  $('milestone').classList.toggle('show',milestoneActive);$('pickup').classList.toggle('show',pickupActive);
  $('hint').style.opacity=!milestoneActive&&!pickupActive&&now<hintUntil&&sim.mode==='playing'?'1':'0';
  if(frame%5===0)updateHud();
  const drawStartedAt=performance.now();
  const gpuQuery=beginGpuTimer();renderer.render(scene,camera);finishGpuTimer(gpuQuery);pollGpuTimer();
  const cpuMs=performance.now()-cpuStartedAt;averageCpuFrameMs+=(cpuMs-averageCpuFrameMs)*.12;
  if(performanceHudEnabled){performanceSamples.push({frame:rawFrameMs,cpu:cpuMs,simulation:simulationFinishedAt-cpuStartedAt,prepare:drawStartedAt-simulationFinishedAt,draw:performance.now()-drawStartedAt,gpu:gpuFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});if(performanceSamples.length>600)performanceSamples.shift();}
  updatePerformanceHud(now);requestAnimationFrame(tick);
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

$('island-oahu').addEventListener('click',()=>selectIsland('oahu'));
$('island-lanai').addEventListener('click',()=>selectIsland('lanai'));
$('choose-island').addEventListener('click',showIslandMenu);
$('next-island').addEventListener('click',()=>start('campaign','lanai'));
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
    endingFixture(island){
      this.setScaleMeters(2500,island);this.addTestAttachments([...Array(143).fill(0),37,39,40,47,48,49]);
      sim.chapter=6;const target=sim.objective();sim.x=target.x;sim.z=target.z;sim.world.stamp='';resetVisuals();this.resume();return this.state();
    },
    navigationFixture(kind='corridor'){
      this.setScaleMeters(kind==='corridor'?3:kind==='cadence'?.32:.7,'oahu');
      const make=(id,type,x,z,seed)=>({id:'qa-nav:'+id,type,x,z,size:TYPES[type].size,visualSeed:seed,collected:false,islandLandmark:true,owner:null});
      const items=kind==='corridor'?[make('left',30,-4.6,2,1),make('right',30,4.6,2,2)]:kind==='corner'?[make('a',14,-1,3,1),make('b',14,1,3,2),make('c',14,0,5,3)]:kind==='cadence'?[make('a',0,0,0,1),make('b',0,0,0,2),make('c',0,0,0,3),make('blocker',14,0,1.3,1)]:[make('house',15,0,3,1)];
      sim.world.invalidatePrefetch();sim.world.legacy=items;sim.world.items=items;sim.world.chunks.clear();sim.world.guards=[{x:0,z:0,radius:200}];sim.world.stamp='';
      if(kind==='corridor')this.addTestAttachments([17,17,17]);
      sim.world.sync(sim,sim.viewRadius);resetVisuals();return this.state();
    },
    normalizationFixture(level){
      const meters=7.85*2**level;this.setScaleMeters(meters,'oahu');
      const type=TYPES.map((info,type)=>({type,size:info.size})).filter(i=>i.size*1.08<meters).sort((a,b)=>b.size-a.size)[0].type;
      const item={id:'qa-normalize:'+level,type,x:sim.x+.01,z:sim.z+.01,size:TYPES[type].size*2**(-sim.level),visualSeed:123+level,collected:false,owner:null,islandLandmark:true};
      sim.world.legacy.push(item);sim.world.items.push(item);sim.world.stamp='';return this.state();
    },
    setScaleMeters(meters,islandId=selectedIsland){
      if(!loaded)throw new Error('Wait until the neighborhood is ready.');
      const target=Math.max(.32,Number(meters)||.32);start('campaign',islandId);
      const targetLevel=Math.max(0,Math.ceil(Math.log2(target/7.9)));
      while(sim.level<targetLevel){const offset=sim.world.rescale(sim);sim.x=sim.x/2+offset.shiftX;sim.z=sim.z/2+offset.shiftZ;sim.diameter/=2;sim.volume/=8;sim.visibleRadius/=2;sim.body.rescale(.5);}
      const normalized=target/2**sim.level;sim.diameter=normalized;sim.volume=normalized**3;
      sim.scaleStage=[0,1,6,12,30,100,500,1600,4000].reduce((stage,size,index)=>target>=size?index:stage,0);
      if(target>=8){
        sim.world.invalidatePrefetch();sim.world.legacy=sim.world.legacy.filter(item=>item.objectiveIndex!==undefined||item.islandLandmark||Math.hypot(item.x-sim.x,item.z-sim.z)>sim.diameter*.5+item.size+1);
        sim.world.items=sim.world.legacy;sim.world.chunks.clear();sim.world.preloaded.clear();sim.world.stamp='';
        sim.world.guards.push({x:sim.x,z:sim.z,radius:sim.diameter*.6+2});sim.world.sync(sim,sim.viewRadius);
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
        sim.body.attach(item,info,sim.artRatios[info.art]||1,sim.x,sim.z,sim.diameter,sim.modelBounds?.(type,item.visualSeed));sim.count++;
      }
      sim.mode='paused';compoundView.sync(sim.body,performance.now(),false,world.clientHeight/viewSpan);updateHud();return sim.snapshot();
    },
    resume(){qaOverview=false;sim.mode='playing';},
    overview(){qaOverview=true;resetInput();sim.mode='paused';sim.setViewRadius(4);sim.world.sync(sim,4);},
    driveWorld(x,z,boost=false){const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;joystick.x=x*Math.cos(yaw)-z*Math.sin(yaw);joystick.z=x*Math.sin(yaw)+z*Math.cos(yaw);boostHeld=boost;},
    nearby(){return sim.items.filter(i=>!i.collected&&i.size*1.08<=sim.diameter).sort((a,b)=>Math.hypot(a.x-sim.x,a.z-sim.z)-Math.hypot(b.x-sim.x,b.z-sim.z)).slice(0,20).map(i=>({id:i.id,type:i.type,x:i.x,z:i.z,size:i.size}));},
    visible(){const scale=2**sim.level,ppu=world.clientHeight/viewSpan;return lastRenderedItems.map(i=>{const p=new THREE.Vector3(i.x,i.size*.4,i.z).project(camera);return{id:i.id,type:i.type,x:(i.x+Number(sim.world.originX)*CHUNK_SIZE)*scale,z:(i.z+Number(sim.world.originZ)*CHUNK_SIZE)*scale,size:i.size*scale,model:i.renderModel,detailed:i.renderDetailed,ndc:[p.x,p.y,p.z],pixels:i.size*ppu};});},
    inspectItems(previous){const scale=2**sim.level,ppu=world.clientHeight/viewSpan,index=new Map(sim.items.map(i=>[i.id,i]));return previous.map(old=>{const i=index.get(old.id),size=i?.size??old.size/scale;const p=new THREE.Vector3(i?.x??old.x/scale-Number(sim.world.originX)*CHUNK_SIZE,size*.4,i?.z??old.z/scale-Number(sim.world.originZ)*CHUNK_SIZE).project(camera);return{id:old.id,collected:i?.collected||sim.world.collectedIds.has(old.id),loaded:Boolean(i),ndc:[p.x,p.y,p.z],pixels:size*ppu};});},
    clearMetrics(){performanceSamples.length=0;sim.world.generationTimes=[];sim.world.syncTimes=[];},
    pause(){resetInput();sim.mode='paused';},
    notice(kind='pickup'){if(kind==='milestone'){$('milestone').textContent='Honolulu complete! +60 seconds';milestoneUntil=performance.now()+5000;}else{$('pickup').textContent='+ Convertible · 4 m · 5 in a row!';pickupUntil=performance.now()+5000;}},
    metrics(){
      const samples=performanceSamples.slice(-300),stats=key=>{const values=samples.map(s=>s[key]).filter(Number.isFinite).sort((a,b)=>a-b);return{median:values[Math.floor(values.length*.5)]??null,p95:values[Math.floor(values.length*.95)]??null,max:values.at(-1)??null};};
      const eventStats=source=>{const values=[...(source||[])].sort((a,b)=>a-b);return{count:values.length,median:values[Math.floor(values.length*.5)]??null,p95:values[Math.floor(values.length*.95)]??null,max:values.at(-1)??null};};
      return{frames:samples.length,frame:stats('frame'),cpu:stats('cpu'),simulation:stats('simulation'),prepare:stats('prepare'),draw:stats('draw'),gpu:stats('gpu'),drawCalls:stats('calls'),triangles:stats('triangles'),generationMs:eventStats(sim.world.generationTimes),syncMs:eventStats(sim.world.syncTimes),dpr:renderDpr,models:modelLibrary.models.size,visible:itemBatches.visibleCount,attachments:sim.body.pieces.length,preloadHits:sim.world.syncHits,synchronousChunks:sim.world.syncMisses,lastChunkSyncMs:sim.world.lastSyncMs};
    },
    state:()=>({...sim.snapshot(),x:sim.x,z:sim.z,renderedPieces:[...compoundView.modelBatches.values()].reduce((total,batch)=>total+batch.pages.reduce((sum,mesh)=>sum+mesh.count,0),0),coreDiameterMeters:sim.body.coreRadius*2*2**sim.level,capturedIsland:sim.body.pieces.some(p=>p.id==='objective:6'),physicalX:(sim.x+Number(sim.world.originX)*CHUNK_SIZE)*2**sim.level,physicalZ:(sim.z+Number(sim.world.originZ)*CHUNK_SIZE)*2**sim.level}),
  };
}

function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_roll_status',description:'Read the current neighborhood game status, size, timer and collection count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>sim.snapshot()});
  register({name:'start_neighborhood_roll',description:'Start a fresh Oahu or Lanai island campaign or four-minute challenge. Resets the heap and collection.',inputSchema:{type:'object',properties:{runMode:{type:'string',enum:['campaign','quick']},island:{type:'string',enum:['oahu','lanai']}},required:['runMode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!['campaign','quick'].includes(input?.runMode))throw new Error('runMode must be campaign or quick');if(input.island&&!ISLANDS[input.island])throw new Error('Unknown island');start(input.runMode,input.island||selectedIsland);return sim.snapshot();}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
