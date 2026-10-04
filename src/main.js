import * as THREE from 'three';
import './style.css';
import {Simulation,TYPES,CHUNK_SIZE,GOAL,ROUND_SECONDS,formatSize,sizeParts} from './simulation.js';
import {createTerrain} from './terrain.js';
import {CompoundView} from './compound-view.js';
import {WorldItemBatches} from './model-batches.js';
import {ToyModelLibrary} from './toy-model-library.js';
import {ISLANDS,islandConfig} from './island-layout.js';
import {activePowers} from './powerups.js';
import {surfaceHeight} from './terrain-height.js';
import {itemDisplaySize,itemVisibilitySphere} from './powerup-visuals.js';
import {PickupFeedback} from './pickup-feedback.js';
import {RollAudio} from './roll-audio.js';
import {readRecord,saveRecord,finishRecord,scorePace} from './run-records.js';
import {RoutePilot} from './diagnostics/route-pilot.js';

const $=id=>document.getElementById(id);
for(let i=0;i<12;i++){const petal=document.createElement('i');petal.style.setProperty('--angle',(i*30)+'deg');document.querySelector('.size-flower').append(petal);}
const sim=new Simulation();
let selectedIsland='oahu',qaOverview=false,lastRenderedItems=[];
const performanceSamples=[];
const ui={size:$('size'),unit:$('unit'),timer:$('timer'),growth:$('growth'),count:$('count'),district:$('district')};
const keys=new Set(),joystick={x:0,z:0,pointer:null};
let boostHeld=false,loaded=false,scene,renderer,camera,ball,prince,ballShadow,terrain,compoundView,targetMarker,prizeMarker,modelLibrary,feedback;
let yaw=0,targetYaw=0,visualRadius=.16,viewSpan=8,follow=new THREE.Vector3();
let itemBatches,lastVisibleItems=null,lastCullAt=0,lastCullX=NaN,lastCullZ=NaN,lastCullSpan=0,lastCullYaw=0;
let soundEnabled=false,pickupUntil=0,milestoneUntil=0,hintUntil=0,startedAt=0,lastVibration=0,previousRecord=null,recordSplits=[];
const rollAudio=new RollAudio();sim.setDiagnostics(import.meta.env.DEV);
const recordStorage={getItem:key=>{try{return localStorage.getItem(key);}catch{return null;}},setItem:(key,value)=>localStorage.setItem(key,value)};
let lastTime=performance.now(),frame=0,resultShown=false,averageFrameMs=16.7,averageCpuFrameMs=0,nextDprCheck=0,renderDpr=1;
const world=$('world'),loader=new THREE.TextureLoader();
const performanceHud=$('performance-hud');
let performanceHudEnabled=new URLSearchParams(location.search).has('performance'),gpuTimerExtension=null,gpuQueries=[],gpuFrameMs=null,lastPerformanceHudAt=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileDepthRange=matchMedia('(pointer:coarse)').matches;
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
    const [textures]=await Promise.all([Promise.all([loadTexture('/assets/grass.webp'),loadTexture('/assets/paving.webp'),loadTexture('/assets/ball.webp'),loadTexture('/assets/ocean.webp'),loadTexture('/assets/oahu-field.png',THREE.NoColorSpace),loadTexture('/assets/lanai-field.png',THREE.NoColorSpace),loadTexture('/assets/sand.webp')]),modelLibrary.load()]);
    shadowMap=shadowTexture();sim.setArtRatios(modelLibrary.manifest.artRatios);
    sim.setModelBounds((type,seed)=>modelLibrary.pick(type,seed)?.bounds.toArray());
    terrain=createTerrain(textures[0],textures[1],renderer,textures[3],{oahu:textures[4],lanai:textures[5]},textures[6]);scene.add(terrain.mesh);
    compoundView=new CompoundView(scene,modelLibrary);itemBatches=new WorldItemBatches(scene,modelLibrary,shadowMap);
    itemBatches.heightAt=(x,z)=>surfaceHeight(sim.world,x,z);
    // The original seed stays small; retained objects form the entire growing heap.
    ball=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshStandardMaterial({map:textures[2],roughness:.82,metalness:0}));compoundView.root.add(ball);
    ballShadow=shadow(.48);scene.add(ballShadow);
    const guide=modelLibrary.pick('guide',0);if(!guide)throw new Error('The rolling guide model could not load.');
    prince=new THREE.Mesh(guide.geometry,modelLibrary.material);scene.add(prince);
    targetMarker=new THREE.Mesh(new THREE.RingGeometry(.46,.5,64),new THREE.MeshBasicMaterial({color:'#ffe278',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));targetMarker.rotation.x=-Math.PI/2;targetMarker.visible=false;scene.add(targetMarker);
    prizeMarker=new THREE.Mesh(new THREE.RingGeometry(.43,.48,48),new THREE.MeshBasicMaterial({color:'#ffd969',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));prizeMarker.rotation.x=-Math.PI/2;prizeMarker.visible=false;scene.add(prizeMarker);feedback=new PickupFeedback(scene);
    resize();
    for(const texture of textures)renderer.initTexture(texture);
    itemBatches.begin();
    for(let type=0;type<TYPES.length;type++){
      const info=TYPES[type],variants=modelLibrary.manifest.types[String(type)]?.models.length||1;
      for(let seed=0;seed<variants;seed++)for(const detail of [1,1000])itemBatches.put({id:'warm:'+type+':'+seed,type,size:1,x:0,z:0,visualSeed:seed},detail);
    }
    itemBatches.end();camera.position.set(0,20,20);camera.lookAt(0,0,0);itemBatches.updateMotion(0,false,camera.quaternion);
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
  feedback?.reset();
  itemBatches.begin();itemBatches.end();lastVisibleItems=null;lastRenderedItems=[];lastCullAt=0;
  ball.quaternion.identity();visualRadius=sim.diameter/2;viewSpan=6+sim.diameter*4.1;follow.set(sim.x,0,sim.z);yaw=targetYaw=0;
}
function selectIsland(id){
  selectedIsland=islandConfig(id).id;
  document.body.dataset.island=selectedIsland;
  document.querySelector('meta[name="theme-color"]').content=selectedIsland==='lanai'?'#cf6b43':'#60d9df';
  for(const key of Object.keys(ISLANDS)){const button=$('island-'+key);button.setAttribute('aria-pressed',String(key===selectedIsland));button.classList.toggle('selected',key===selectedIsland);}
  const record=readRecord(recordStorage,selectedIsland,'campaign');$('menu-record').textContent=record?.seconds?'Fastest island clear · '+record.seconds.toFixed(2)+' seconds':'';
  if(loaded)$('start').textContent='Roll '+islandConfig(selectedIsland).name+' · island race';
}
function showIslandMenu(){
  resetInput();sim.reset('campaign',selectedIsland);sim.mode='menu';qaOverview=false;resetVisuals();hideMenus();
  $('menu').classList.remove('hidden');document.body.classList.add('menu-open');selectIsland(selectedIsland);
}
function start(runMode='campaign',islandId=selectedIsland,seed){
  if(!loaded)return;resetInput();selectIsland(islandId);qaOverview=false;performanceSamples.length=0;sim.reset(runMode,selectedIsland,seed);resetVisuals();resultShown=false;startedAt=performance.now();hintUntil=startedAt+6000;
  previousRecord=readRecord(recordStorage,sim.islandId,sim.runMode);recordSplits=[];
  $('hint').textContent=runMode==='campaign'?'Race to 400 m · then collect the island to win.':'Follow the treats. The toys are next.';
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
  $('result-kicker').textContent=completedIsland?sim.world.layout.name.toUpperCase()+' · ISLAND CLEARED':sim.won?'QUICK CHALLENGE COMPLETE':'THE CLOCK CAUGHT UP';
  $('result-title').innerHTML=completedIsland?'What a<br><em>monstrosity.</em>':sim.won?'A beautiful<br><em>little monster.</em>':'One more<br><em>glorious roll?</em>';
  $('result-size').textContent=formatSize(sim.diameter,sim.level);$('result-count').textContent=String(sim.count);
  $('result-score').textContent=sim.score.toLocaleString();$('result-combo').textContent=String(sim.bestCombo);
  recordSplits.push({time:sim.elapsed,score:sim.score});const report=finishRecord(sim,previousRecord,recordSplits);saveRecord(recordStorage,sim,report.record);
  $('result-record').textContent=report.labels.join(' · ')||report.comparisons[0]||'Your next best roll starts here.';
  const seconds=Math.floor(sim.elapsed);$('result-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+'.'+String(Math.floor(sim.elapsed%1*100)).padStart(2,'0')+' · '+Math.round(sim.count/Math.max(1,sim.elapsed)*60)+' things/min'+(completedIsland?' · Grade '+report.grade:'');
  $('result-hooks').replaceChildren();for(const text of report.nextTry){const row=document.createElement('p');row.textContent=text;$('result-hooks').append(row);}
  $('stage-recap').replaceChildren();for(const [i,stage] of sim.chapterStats.entries()){
    const row=document.createElement('div'),goal=stage.goalSeconds===null?'': ' · goal in '+Math.ceil(stage.goalSeconds)+'s';
    row.textContent=stage.medal+' · '+stage.name+' · '+stage.seconds.toFixed(1)+' sec · '+stage.pickups+' pickups · '+stage.combo+' chain'+goal;$('stage-recap').append(row);
  }
  $('medal-summary').textContent=sim.chapterStats.length+' stage medals · highlights';$('result-accomplishments').textContent=sim.engagement.accomplishments.slice(-4).join(' · ');
  $('result-text').textContent=completedIsland?'You collected '+sim.world.layout.name+'! Island cleared in '+sim.elapsed.toFixed(2)+' seconds. Can you beat that?':sim.won?'Six meters of permanently stuck stuff. Your quick challenge is finished.':`You reached ${sim.runMode==='campaign'?Math.min(sim.chapter+1,sim.chapters.length)+' / '+sim.chapters.length+' stages':'the quick challenge'} and built a pile of ${sim.count} things. Try again for the finish.`;
  $('again').textContent='Beat this route · '+sim.world.layout.name;
  $('next-island').textContent='Next island · '+islandConfig(sim.islandId==='oahu'?'lanai':'oahu').name;$('next-island').classList.toggle('hidden',!completedIsland);
  melody(sim.won?[523,659,784,1047]:[440,392,330]);
}
function inspectResult(){hideMenus();hintUntil=performance.now()+12000;$('hint').textContent='Finished. Rotate the camera to admire your heap. Tap Ⅱ for results.';}
function updateHud(){
  const powers=activePowers(sim);$('power-status').innerHTML=powers.map(p=>'<div class="power-pill '+p.id+'"><b>'+(p.id==='magnet'?'∩':p.id==='turbo'?'ϟ':'★')+'</b><span>'+p.name+'<small>'+p.seconds+'s</small></span></div>').join('');
  document.querySelector('.timer-dial').style.setProperty('--clock-turn',(sim.runMode==='campaign'?sim.elapsed%60/60*360:sim.elapsed/sim.timeLimit*360)+'deg');
  const parts=sizeParts(sim.diameter,sim.level);ui.size.textContent=parts.value;ui.unit.textContent=parts.unit;ui.size.style.fontSize=parts.value.length>5?'30px':'';
  document.querySelector('.hud').style.setProperty('--hud-scale',Math.min(1.15,.58+Math.max(0,Math.log2(Math.max(.32,sim.diameter)/.32))*.085));
  ui.count.textContent=`${sim.count} stuck object${sim.count===1?'':'s'}`;
  $('boost').style.setProperty('--boost-energy',sim.boostEnergy+'%');$('boost').classList.toggle('depleted',sim.boostExhausted);$('boost').querySelector('small').textContent=sim.boostExhausted?'RECHARGE':'HOLD';
  ui.growth.style.width=`${Math.min(100,sim.progress()*100)}%`;
  $('goal-label').textContent=sim.runMode==='campaign'&&sim.chapter===4?'COLLECT THE ISLAND':`GOAL · ${sim.nextGoalSize()}`;
  const race=sim.runMode==='campaign',t=race?sim.elapsed:Math.max(0,Math.ceil(sim.timeLimit-sim.elapsed));ui.timer.textContent=`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`+(race?'.'+Math.floor(t%1*10):'');ui.timer.style.color=!race&&t<=30?'#d65374':'';document.querySelector('.timer-dial').setAttribute('aria-label',race?'Elapsed race time':'Time remaining');
  ui.district.textContent=sim.world.layout.name+' · '+sim.world.district(sim.x,sim.z);
  document.querySelector('.size-sticker').innerHTML=sim.scaleLabel().replace(' ','<br>');
  const goal=sim.chapterGoal();$('chapter-title').textContent=sim.runMode==='quick'?'QUICK CHALLENGE':`${Math.min(sim.chapter+1,sim.chapters.length)} / ${sim.chapters.length} · ${goal.name}`;
  const stageTrack=$('stage-track'),quick=sim.runMode==='quick';stageTrack.classList.toggle('quick',quick);stageTrack.setAttribute('aria-label',quick?'Four minute heap challenge':'100, 200, 300 and 400 meters, then collect the island');
  for(const [i,stamp] of [...stageTrack.children].entries()){
    stamp.classList.toggle('done',!quick&&i<sim.chapter);stamp.classList.toggle('current',!quick&&i===sim.chapter);
    stamp.title=sim.chapters[i].name+' · '+(i===4?'collect the island':sim.chapters[i].size+' m');stamp.textContent=sim.chapters[i].icon;
  }
  $('chapter-hint').textContent=quick?'4 min · 6 m heap':(sim.stageGoalReachedAt!==null?'Goal reached · keep rolling':'1 min · '+goal.count+' pickups');
  const chain=sim.engagement.chain;$('score').textContent=sim.score.toLocaleString()+' PTS';$('score').style.setProperty('--score-pulse',reducedMotion?1:1+feedback.pulse*.08);
  $('combo').style.setProperty('--chain-scale',1+Math.min(chain.count,30)/75);
  $('combo').classList.toggle('hidden',chain.count<2);$('combo').classList.toggle('fading',chain.remaining<0);$('combo-text').textContent=chain.count+' CHAIN · ×'+chain.multiplier;$('chain-fill').style.width=chain.charge*100+'%';
  const prize=sim.prize();$('next-prize').classList.toggle('hidden',!prize);$('next-prize').classList.toggle('ready',Boolean(prize?.ready));
  if(prize)$('next-prize').textContent=prize.ready?'NOW · '+prize.name:prize.name+' · '+formatSize(prize.neededMeters)+' to go';
  const pace=scorePace(previousRecord,sim);$('record-pace').classList.toggle('hidden',pace===null);$('record-pace').classList.toggle('ahead',pace>0);if(pace!==null)$('record-pace').textContent=(pace>=0?'+':'−')+Math.abs(pace).toLocaleString()+' vs your score best';
  if(sim.mode==='playing'&&sim.elapsed>=(recordSplits.length+1)*15)recordSplits.push({time:sim.elapsed,score:sim.score});
  const target=sim.runMode==='campaign'?sim.objective():null;
  $('target-guide').classList.toggle('hidden',!target||sim.mode!=='playing');
  if(target){const dx=target.x-sim.x,dz=target.z-sim.z,sx=dx*Math.cos(yaw)-dz*Math.sin(yaw),sy=dx*Math.sin(yaw)+dz*Math.cos(yaw);$('target-arrow').style.transform=`rotate(${Math.atan2(sx,-sy)*180/Math.PI}deg)`;$('target-distance').textContent=formatSize(Math.hypot(dx,dz),sim.level);$('target-name').textContent=target.name||TYPES[target.type].name;}
}
function emitSparks(item){
  if(reducedMotion)return;
  feedback.collect(item,surfaceHeight(sim.world,item.x,item.z),sim.diameter);
}
function input(){
  let x=joystick.x,z=joystick.z;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;
  const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  // Use current camera yaw so up always rolls toward the top of the screen.
  return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw),boost:boostHeld||keys.has('ShiftLeft')||keys.has('ShiftRight')};
}
function handleRollResult(result,now){
  const transform=result.transform;
  if(transform.scale!==1||transform.x!==0||transform.z!==0){
    lastVisibleItems=null;follow.multiplyScalar(transform.scale);follow.x+=transform.x;follow.z+=transform.z;
    visualRadius*=transform.scale;viewSpan*=transform.scale;feedback.transform(transform);
  }
  if(result.pickups.length){
    let importance=1;
    for(const picked of result.pickups){
      lastVisibleItems=null;importance=Math.max(importance,picked.importance||1);
      if(!result.stageChanged)emitSparks({...picked,x:picked.x*transform.scale+transform.x,z:picked.z*transform.scale+transform.z,size:picked.size*transform.scale});
    }
    const last=result.pickups.reduce((best,p)=>p.importance>best.importance||p.importance===best.importance&&p.size>best.size?p:best);$('pickup').textContent=`+ ${last.name||TYPES[last.type].name} · ${formatSize(last.size,last.sizeLevel??sim.level)}${importance>=2&&last.points?' · +'+last.points+' pts':''}`;pickupUntil=now+(importance>=2?1100:650);
    const pickup=$('pickup');pickup.classList.remove('impact');void pickup.offsetWidth;pickup.classList.add('impact');
    const score=$('score');score.classList.remove('score-rattle');void score.offsetWidth;score.classList.add('score-rattle');
    rollAudio.pickup(sim.combo,importance,now/1000);
    if(navigator.vibrate&&now-lastVibration>100){navigator.vibrate(importance>=3?[18,20,25]:importance>=2?16:7);lastVibration=now;}
  }
  if(result.stageChanged){
    feedback.reset();itemBatches.begin();itemBatches.end();lastVisibleItems=null;lastRenderedItems=[];lastCullAt=0;
    follow.set(sim.x,surfaceHeight(sim.world,sim.x,sim.z)+visualRadius*.25,sim.z);
    const [hx,hz]=sim.chapterGoal().heading;yaw=targetYaw=Math.atan2(-hx,-hz);
    $('hint').textContent=sim.chapterGoal().arc;hintUntil=now+4500;pickupUntil=0;
    updateHud();
  }
  if(result.checkpoint||result.celebration||result.unlock||(result.milestone!==null&&result.milestone!==undefined)){
    // Stage/size fantasy takes priority; one notice strip protects the playfield.
    const text=result.checkpoint||result.celebration?.text||result.unlock;
    if(text){$('milestone').textContent=text;milestoneUntil=now+(result.checkpoint?2200:1700);rollAudio.stinger(Boolean(result.checkpoint));}
  }
  if(sim.mode==='result'&&!resultShown)finish();
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
  handleRollResult(result,now);feedback.update(dt,sim.diameter,!reducedMotion);
  const inMenu=sim.mode==='menu';
  const renderDiameter=inMenu ? .55 : Math.max(sim.diameter,Math.min(sim.body.boundRadius*2,sim.diameter*2.4));
  const radiusTarget=inMenu ? .55 : renderDiameter*.5;
  visualRadius+=(radiusTarget-visualRadius)*(1-Math.exp(-dt*8));
  const groundHeight=surfaceHeight(sim.world,sim.x,sim.z);
  compoundView.sync(sim.body,now,!reducedMotion,viewportHeight/viewSpan);compoundView.pose(sim.x,groundHeight+(inMenu ? .55 : sim.body.height)+visualRadius*feedback.pulse*.035,sim.z,sim.body.orientation);
  ball.scale.setScalar(inMenu ? .55 : sim.body.coreRadius);ball.position.set(0,0,0);
  if(inMenu&&!reducedMotion)compoundView.root.rotateY(now*.0002);
  ballShadow.position.set(sim.x,groundHeight+.018,sim.z);ballShadow.scale.setScalar(visualRadius*2.7);
  ballShadow.material.opacity=.72/(1+Math.max(0,sim.body.height-sim.body.lastGround)/Math.max(.1,visualRadius));
  // Prince follows behind the rolling direction and remains readable at every size.
  const moveAngle=Math.hypot(sim.vx,sim.vz)>.1?Math.atan2(sim.vx,sim.vz):yaw+Math.PI;
  const ph=Math.max(.29,visualRadius*.63);
  prince.scale.setScalar(ph);prince.rotation.y=moveAngle;
  const guideX=sim.x-Math.sin(moveAngle)*(visualRadius+ph*.9),guideZ=sim.z-Math.cos(moveAngle)*(visualRadius+ph*.9);
  prince.position.set(guideX,surfaceHeight(sim.world,guideX,guideZ)+.015+(!reducedMotion&&result.distance>.002?Math.abs(Math.sin(now*.015))*ph*.09:0),guideZ);
  follow.lerp(qaOverview?new THREE.Vector3(-Number(sim.world.originX)*CHUNK_SIZE,0,-Number(sim.world.originZ)*CHUNK_SIZE+(sim.islandId==='oahu'?-1500:0)*2**(-sim.level)):new THREE.Vector3(sim.x,groundHeight+visualRadius*.25,sim.z),1-Math.exp(-dt*5));
  yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*5));
  const desiredSpan=qaOverview?sim.world.layout.half*2.1*Math.max(1,1/aspect)*2**(-sim.level):inMenu?16:Math.max(6*2**(-Math.min(sim.level,32))+renderDiameter*4.1,renderDiameter*2.6/Math.max(.3,aspect));
  viewSpan+=(desiredSpan*(1-feedback.pulse*.018)-viewSpan)*(1-Math.exp(-dt*4));
  const dist=Math.max(20,viewSpan*1.7);camera.position.set(follow.x+Math.sin(yaw)*dist,follow.y+dist*1.12,follow.z+Math.cos(yaw)*dist);camera.lookAt(follow);
  const cameraDistance=Math.hypot(dist,dist*1.12);camera.near=mobileDepthRange?Math.max(.5,cameraDistance*.12):.05;camera.far=cameraDistance+viewSpan*4+40;
  camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  scene.fog.near=cameraDistance+viewSpan*.65;scene.fog.far=cameraDistance+viewSpan*2;
  terrain.update(sim.x,sim.z,viewSpan,aspect,cameraDistance,sim.world);
  const missionTarget=sim.runMode==='campaign'&&sim.mode==='playing'?sim.objective():null;
  targetMarker.visible=Boolean(missionTarget);if(missionTarget){targetMarker.position.set(missionTarget.x,surfaceHeight(sim.world,missionTarget.x,missionTarget.z)+Math.max(.03,sim.diameter*.002),missionTarget.z);targetMarker.scale.setScalar(missionTarget.size*1.25);}
  if(missionTarget)targetMarker.material.color.set(missionTarget.size*1.08<=sim.diameter?'#a8ffdb':'#ffe278');
  const prize=sim.mode==='playing'?sim.prize():null;prizeMarker.visible=Boolean(prize&&prize.id!==missionTarget?.id);
  if(prize){prizeMarker.position.set(prize.x,surfaceHeight(sim.world,prize.x,prize.z)+Math.max(.015,sim.diameter*.004),prize.z);prizeMarker.scale.setScalar(prize.size*1.5);prizeMarker.material.color.set(prize.ready?'#a8ffdb':'#ffda68');}
  const moved=Math.hypot(sim.x-lastCullX,sim.z-lastCullZ)>Math.max(.35,viewSpan*.035);
  const turned=Math.abs(yaw-lastCullYaw)>.045,zoomed=Math.abs(viewSpan-lastCullSpan)>Math.max(.25,viewSpan*.035);
  const pixelsPerUnit=viewportHeight/viewSpan;
  if(now-lastCullAt>95||moved||turned||zoomed||lastVisibleItems===null){
    const radius=viewSpan*Math.hypot(aspect,1.5)*.65+sim.body.boundRadius+4;
    const nearby=sim.world.nearby(sim.x,sim.z,radius),candidates=[];
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const sphere=new THREE.Sphere();
    for(const item of nearby){
      if(item.collected||item.islandFinale&&!sim.canCollect(item)||itemDisplaySize(item,pixelsPerUnit)*pixelsPerUnit<1.2)continue;
      const bounds=modelLibrary.pick(item.type,item.visualSeed).bounds;
      itemVisibilitySphere(item,bounds,pixelsPerUnit,surfaceHeight(sim.world,item.x,item.z),viewSpan*.08,sphere);
      if(frustum.intersectsSphere(sphere))candidates.push(item);
    }
    // Culling is geometric. A nearest-N budget made visible props blink when
    // another prop became closer; density belongs to deterministic generation.
    lastRenderedItems=candidates;
    itemBatches.begin();for(const item of lastRenderedItems)itemBatches.put(item,pixelsPerUnit);itemBatches.end();
    lastVisibleItems=sim.items;lastCullAt=now;lastCullX=sim.x;lastCullZ=sim.z;lastCullSpan=viewSpan;lastCullYaw=yaw;
  }
  itemBatches.updateMotion(sim.elapsed,!reducedMotion,camera.quaternion,pixelsPerUnit);
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
  rollAudio.enable(soundEnabled);
}
function tone(freq,duration=.12,delay=0){
  rollAudio.tone(freq,duration,delay);
}
function melody(notes){notes.forEach((n,i)=>tone(n,.19,i*.1));}

$('island-oahu').addEventListener('click',()=>selectIsland('oahu'));
$('island-lanai').addEventListener('click',()=>selectIsland('lanai'));
$('choose-island').addEventListener('click',showIslandMenu);
$('next-island').addEventListener('click',()=>start('campaign',sim.islandId==='oahu'?'lanai':'oahu'));
$('start').addEventListener('click',()=>start('campaign'));$('free').addEventListener('click',()=>start('quick'));
$('pause').addEventListener('click',()=>{if(sim.mode==='result'){$('result-menu').classList.remove('hidden');document.body.classList.add('menu-open');}else sim.mode==='paused'?resume():pause();});$('resume').addEventListener('click',resume);
$('restart').addEventListener('click',()=>start(sim.runMode));$('again').addEventListener('click',()=>start(sim.runMode,sim.islandId,sim.world.seed));$('continue').addEventListener('click',inspectResult);
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
    startSeed(island='oahu',seed=123456){start('campaign',island,seed);return this.state();},
    autoplaySteps(frames=120){
      if(!this.pilot||this.pilot.world!==sim.world)this.pilot=new RoutePilot(sim);
      for(let i=0;i<Math.min(120,Math.max(1,frames));i++){
        if(sim.mode!=='playing')break;
        const before=sim.chapter,result=sim.step(1/60,this.pilot.input(1/60));handleRollResult(result,performance.now());
        if(sim.chapter!==before){updateHud();break;}
      }
      updateHud();return this.state();
    },
    pacingMetrics(){return sim.engagement.report(sim);},
    warming(){return {active:sim.world.prefetchQueue.filter(q=>q.active).length,pending:[...sim.world.chunks.values()].filter(c=>c.pending).length};},
    endingFixture(island){
      this.setScaleMeters(2200*1.08,island);this.addTestAttachments([...Array(90).fill(0),32,37,48]);
      sim.chapter=sim.chapters.length-1;sim.chapterStarted=90;sim.elapsed=120;sim.timeLimit=Infinity;
      sim.elapsed-=.05;sim.chapterStats=sim.chapters.slice(0,-1).map(goal=>({name:goal.name,seconds:30,goalSeconds:null,medal:'Played',pickups:0,combo:0,score:0}));
      sim.moveToStage();const islandTarget=sim.objective();islandTarget.x=sim.x;islandTarget.z=sim.z;sim.world.stamp='';resetVisuals();this.resume();return this.state();
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
      sim.chapter=sim.chapters.length-1;sim.chapterStarted=sim.elapsed=90;sim.timeLimit=Infinity;sim.capturedObjectives.delete(4);
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
    nearby(){return sim.items.filter(i=>!i.collected&&sim.canCollect(i)).sort((a,b)=>Math.hypot(a.x-sim.x,a.z-sim.z)-Math.hypot(b.x-sim.x,b.z-sim.z)).slice(0,20).map(i=>({id:i.id,type:i.type,x:i.x,z:i.z,size:i.size}));},
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
    state:()=>({...sim.snapshot(),elapsed:sim.elapsed,combo:sim.combo,chainCharge:sim.engagement.chain.charge,boostEnergy:sim.boostEnergy,stages:sim.chapterStats,x:sim.x,z:sim.z,renderedPieces:[...compoundView.modelBatches.values()].reduce((total,batch)=>total+batch.pages.reduce((sum,mesh)=>sum+mesh.count,0),0),coreDiameterMeters:sim.body.coreRadius*2*2**sim.level,physicalX:(sim.x+Number(sim.world.originX)*CHUNK_SIZE)*2**sim.level,physicalZ:(sim.z+Number(sim.world.originZ)*CHUNK_SIZE)*2**sim.level}),
  };
}

function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_roll_status',description:'Read the current neighborhood game status, size, timer and collection count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>sim.snapshot()});
  register({name:'start_neighborhood_roll',description:'Race through 100, 200, 300 and 400 meters on Oahu or Lanai, then collect the island to win, or the separate four-minute quick challenge. Resets the heap and collection.',inputSchema:{type:'object',properties:{runMode:{type:'string',enum:['campaign','quick']},island:{type:'string',enum:['oahu','lanai']}},required:['runMode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!['campaign','quick'].includes(input?.runMode))throw new Error('runMode must be campaign or quick');if(input.island&&!ISLANDS[input.island])throw new Error('Unknown island');start(input.runMode,input.island||selectedIsland);return sim.snapshot();}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
