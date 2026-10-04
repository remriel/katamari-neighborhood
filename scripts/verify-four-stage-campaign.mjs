import assert from 'node:assert/strict';
import {Simulation,TYPES,CHUNK_SIZE} from '../src/simulation.js';
import {RACE_CHECKPOINTS,RACE_GOAL_METERS,STAGE_COUNT} from '../src/campaign.js';
import {islandDistance,nearestStreet} from '../src/island-layout.js';
import {readRecord,saveRecord,finishRecord} from '../src/run-records.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const input={x:0,z:0,boost:false},evidence=[];
assert.deepEqual(RACE_CHECKPOINTS,[100,200,300,400]);assert.equal(STAGE_COUNT,5);assert.equal(RACE_GOAL_METERS,400);
// Visiting another region must never lock physically eligible objects. Oversized
// objects still block a small ball; collection and the magnet share this rule.
for(const chapter of [0,1,2]){
  const sim=new Simulation();sim.reset('campaign','oahu',123);sim.chapter=chapter;
  sim.world.invalidatePrefetch();sim.world.chunks.clear();sim.world.guards=[{x:0,z:0,radius:10000}];sim.world.stamp='';
  const van={id:'off-stage-van',type:14,name:'Little van',size:3.12,x:.01,z:.01,collected:false,visualSeed:0,owner:null};
  sim.world.legacy=[van];sim.world.items=[van];
  sim.step(.02,input);assert.equal(van.collected,false,'Small ball collected an oversized van');
  sim.diameter=4;sim.volume=64;sim.powerUntil.magnet=12;
  sim.step(.02,input);assert.equal(van.collected,true,'Stage clock blocked an eligible van');
  assert.ok(sim.body.pieces.some(p=>p.id===van.id));
}
for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island,123456);
  const world=sim.world;assert.equal(sim.chapters.length,5);assert.equal(sim.timeLimit,Infinity);
  const beach=sim.chapters[1],cx=Math.floor(beach.start[0]/18),cz=Math.floor(beach.start[1]/18);
  const player={x:beach.start[0],z:beach.start[1],diameter:1,chapter:0};
  const first=world.generate(cx,cz,player),later=world.generate(cx,cz,{...player,chapter:3});
  assert.deepEqual(first.items.map(i=>[i.id,i.type,i.size,i.x,i.z]),later.items.map(i=>[i.id,i.type,i.size,i.x,i.z]),'Regional objects changed with the stage clock');
  const population=[];
  for(let z=-3;z<=3;z++)for(let x=-3;x<=3;x++)population.push(...world.generate(x,z,sim).items);
  assert.ok(population.length>1800,'Early area lost its dense object population');
  assert.ok(population.filter(i=>i.size>.8).length>100,'Early area lost larger scenery');
  for(let i=0;i<240;i++)sim.step(1/60,{x:0,z:-1});
  assert.ok(sim.body.pieces.length>20);
  const startingIds=sim.body.pieces.map(p=>p.id),startingCount=sim.count;
  // Time never advances a race checkpoint, and pause does not count race time.
  const isolate=()=>{world.invalidatePrefetch();world.chunks.clear();world.legacy=[];world.items=[];world.guards=[{x:0,z:0,radius:1e9}];world.stamp='';};
  isolate();sim.step(31,input);assert.equal(sim.chapter,0);assert.equal(sim.mode,'playing');
  const paused=sim.elapsed;sim.mode='paused';sim.step(30,input);assert.equal(sim.elapsed,paused);sim.mode='playing';
  const transitions=[];
  const setMeters=meters=>{
    sim.diameter=meters/2**sim.level;sim.volume=sim.diameter**3;
    while(sim.diameter>=8){const shift=world.rescale(sim);sim.x=sim.x/2+shift.shiftX;sim.z=sim.z/2+shift.shiftZ;sim.diameter/=2;sim.volume/=8;sim.body.rescale(.5);}
    const shift=world.rebase(3,-2);sim.x-=shift.dx;sim.z-=shift.dz;
  };
  for(let stage=0;stage<4;stage++){
    const goal=RACE_CHECKPOINTS[stage],body=sim.body;
    setMeters(goal-.001);isolate();const below=sim.step(.01,input);
    assert.equal(sim.chapter,stage);assert.equal(below.stageChanged,false);
    sim.elapsed+=7;setMeters(goal);isolate();const result=sim.step(.01,input);
    assert.equal(sim.chapter,stage+1);assert.equal(sim.world,world);assert.equal(sim.body,body);
    assert.equal(sim.chapterStats[stage].goalMeters,goal);assert.equal(sim.chapterStats[stage].goalSeconds,sim.chapterStats[stage].seconds);
    near(sim.chapterStats.reduce((sum,s)=>sum+s.seconds,0),sim.elapsed);
    for(const id of startingIds){assert.ok(world.collectedIds.has(id));assert.ok(sim.body.pieces.some(p=>p.id===id));}
    near(sim.body.coreRadius*2*2**sim.level,.32);
    if(stage<4){
      assert.equal(result.stageChanged,true);assert.equal(sim.snapshot().secondsRemaining,null);assert.equal(sim.chapterStarted,sim.elapsed);
      const physical=2**sim.level,x=(sim.x+Number(world.originX)*CHUNK_SIZE)*physical,z=(sim.z+Number(world.originZ)*CHUNK_SIZE)*physical;
      const destination=nearestStreet(...sim.chapterGoal().start,island);near(x,destination.x);near(z,destination.z);
      const props=world.legacy.filter(i=>i.stageIndex===sim.chapter);assert.equal(props.length,sim.chapter===4?96:24);
      assert.ok(props.filter(i=>i.size*1.08<=sim.diameter).length>=4,'New race stage has no eligible growth pickups');
      for(const item of props){near(item.size*physical,TYPES[item.type].size);assert.ok(islandDistance((item.x+Number(world.originX)*18)*physical,(item.z+Number(world.originZ)*18)*physical,island)>.25);}
      if(stage===3)assert.ok(sim.volume*physical**3+props.reduce((sum,i)=>sum+(i.size*physical)**3*.82,0)>(2200*1.08)**3,'Finale has insufficient collectible mass');
      transitions.push({at:sim.elapsed,goalMeters:goal,stage:sim.chapter+1,position:[x,z]});
    }else{assert.equal(result.stageChanged,false);assert.equal(sim.mode,'playing');assert.equal(sim.won,false);}
  }
  assert.equal(sim.chapter,4);assert.equal(sim.snapshot().finaleUnlocked,true);assert.equal(sim.won,false,'400 m prematurely won the island race');
  setMeters(3000);isolate();sim.step(.01,input);assert.equal(sim.won,false,'Size alone won without collecting the island');
  setMeters(2200*1.08-.001);isolate();
  const islandTarget={id:'island-finale',type:41,name:island,size:2200/2**sim.level,x:sim.x,z:sim.z,collected:false,visualSeed:1,objectiveIndex:4,owner:null};
  world.legacy=[islandTarget];world.items=[islandTarget];sim.step(.01,input);assert.equal(islandTarget.collected,false,'Island collected before size eligibility');
  setMeters(2200*1.08);islandTarget.size=2200/2**sim.level;islandTarget.x=sim.x;islandTarget.z=sim.z;world.stamp='';sim.step(.01,input);
  assert.equal(sim.won,true);assert.equal(sim.mode,'result');assert.equal(sim.chapter,5);assert.equal(sim.snapshot().islandCollected,true);
  assert.ok(world.collectedIds.has(islandTarget.id));assert.ok(sim.body.pieces.some(p=>p.id===islandTarget.id));
  assert.equal(sim.body.pieces.length,sim.count);
  const ending=sim.snapshot();sim.step(30,{x:1,z:1});assert.deepEqual(sim.snapshot(),ending);
  const data=new Map([['katamari:'+island+':four-stage-tour-30s-best',JSON.stringify({score:88888})],['katamari:'+island+':campaign-best',JSON.stringify({score:99999})]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(readRecord(storage,island,'campaign'),null,'Seven-stage record leaked into the new format');
  const report=finishRecord(sim,null);assert.ok(report.labels.includes('FASTEST FINISH'));saveRecord(storage,sim,report.record);assert.equal(readRecord(storage,island,'campaign').stages.length,5);
  evidence.push({island,transitions,seconds:sim.elapsed,retainedPieces:sim.body.pieces.length});
  sim.world.invalidatePrefetch();
}
console.log(JSON.stringify({sizeDrivenRace:true,noTimerDeadline:true,retainedWorldAndHeap:true,pausedClock:true,increasingObjectSizes:true,recordsSeparated:true,evidence},null,2));
