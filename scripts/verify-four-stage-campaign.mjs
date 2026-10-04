import assert from 'node:assert/strict';
import {Simulation,TYPES,CHUNK_SIZE} from '../src/simulation.js';
import {STAGE_SECONDS,STAGE_COUNT,CAMPAIGN_MAX_SECONDS} from '../src/campaign.js';
import {islandDistance,nearestStreet} from '../src/island-layout.js';
import {readRecord,saveRecord,finishRecord} from '../src/run-records.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const input={x:0,z:0,boost:false},evidence=[];
assert.equal(STAGE_SECONDS,60);assert.equal(STAGE_COUNT,4);assert.equal(CAMPAIGN_MAX_SECONDS,240);
// Later tiers must also apply to real collection and the magnet, rather than
// merely changing the stage label or the decorative props.
const gated=new Simulation();gated.reset('campaign','oahu',123);
gated.world.invalidatePrefetch();gated.world.chunks.clear();gated.world.guards=[{x:0,z:0,radius:10000}];gated.world.stamp='';
const van={id:'tier-van',type:14,name:'Little van',size:3.12,x:.01,z:.01,collected:false,visualSeed:0,owner:null};
gated.world.legacy=[van];gated.world.items=[van];gated.diameter=4;gated.volume=64;gated.powerUntil.magnet=12;
gated.step(.02,input);assert.equal(van.collected,false);assert.equal(gated.world.magnetPositions.has(van.id),false);
gated.chapter=1;van.x=gated.x+.01;van.z=gated.z+.01;gated.step(.02,input);
assert.equal(van.collected,true);assert.ok(gated.body.pieces.some(p=>p.id===van.id));
for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island,123456);
  const world=sim.world;assert.equal(sim.chapters.length,4);assert.equal(sim.timeLimit,60);
  const beach=sim.chapters[1],cx=Math.floor(beach.start[0]/18),cz=Math.floor(beach.start[1]/18);
  const player={x:beach.start[0],z:beach.start[1],diameter:1,chapter:0};
  const first=world.generate(cx,cz,player),later=world.generate(cx,cz,{...player,chapter:3});
  assert.deepEqual(first.items.map(i=>[i.id,i.type,i.size,i.x,i.z]),later.items.map(i=>[i.id,i.type,i.size,i.x,i.z]),'Regional objects changed with the stage clock');
  assert.ok(first.items.every(i=>i.size<=beach.maxObjectSize),'Beach spawned later-stage giant objects');
  for(let i=0;i<240;i++)sim.step(1/60,{x:0,z:-1});
  assert.ok(sim.body.pieces.length>20);
  const startingIds=sim.body.pieces.map(p=>p.id),startingCount=sim.count;
  // Satisfying the first goal early must leave the full minute available.
  sim.diameter=1.1;sim.volume=1.1**3;sim.step(1/60,input);
  assert.notEqual(sim.stageGoalReachedAt,null);assert.equal(sim.chapter,0);assert.equal(sim.timeLimit,60);
  const paused=sim.elapsed;sim.mode='paused';sim.step(30,input);assert.equal(sim.elapsed,paused);sim.mode='playing';
  let maxSize=Math.max(...sim.world.legacy.filter(i=>i.id.startsWith('opening:')).map(i=>i.size*2**sim.level));
  const transitions=[];
  for(let stage=0;stage<4;stage++){
    // Exercise transport with a normalized ball and a non-zero floating origin.
    if(stage===1){
      const shift=world.rescale(sim);sim.x=sim.x/2+shift.shiftX;sim.z=sim.z/2+shift.shiftZ;sim.diameter/=2;sim.volume/=8;sim.body.rescale(.5);
      const moved=world.rebase(3,-2);sim.x-=moved.dx;sim.z-=moved.dz;
    }
    const body=sim.body,meters=sim.diameter*2**sim.level,volume=sim.volume*2**(3*sim.level);
    sim.elapsed=sim.timeLimit-.01;const result=sim.step(.03,input);
    assert.equal(sim.elapsed,(stage+1)*60);assert.equal(sim.chapterStats[stage].seconds,60);
    assert.equal(sim.world,world);assert.equal(sim.body,body);assert.equal(sim.islandId,island);
    assert.ok(sim.count>=startingCount);assert.ok(sim.diameter*2**sim.level>=meters-1e-7);assert.ok(sim.volume*2**(3*sim.level)>=volume-1e-7);
    for(const id of startingIds){assert.ok(world.collectedIds.has(id));assert.ok(sim.body.pieces.some(p=>p.id===id));}
    near(sim.body.coreRadius*2*2**sim.level,.32);
    if(stage<3){
      assert.equal(result.stageChanged,true);assert.equal(sim.snapshot().secondsRemaining,60);
      const physical=2**sim.level,x=(sim.x+Number(world.originX)*CHUNK_SIZE)*physical,z=(sim.z+Number(world.originZ)*CHUNK_SIZE)*physical;
      const destination=nearestStreet(...sim.chapterGoal().start,island);near(x,destination.x);near(z,destination.z);
      const props=world.legacy.filter(i=>i.stageIndex===sim.chapter);assert.equal(props.length,74);
      assert.ok(props.filter(i=>i.size*1.08<=sim.diameter).length>=4,'New area has no accessible trail');
      const largest=Math.max(...props.map(i=>i.size*physical));assert.ok(largest>maxSize,'Later stage objects did not get larger');maxSize=largest;
      for(const item of props){near(item.size*physical,TYPES[item.type].size);assert.ok(islandDistance((item.x+Number(world.originX)*18)*physical,(item.z+Number(world.originZ)*18)*physical,island)>.25);}
      transitions.push({at:sim.elapsed,stage:sim.chapter+1,position:[x,z],largestObjectMeters:largest});
    }
  }
  assert.equal(sim.mode,'result');assert.equal(sim.won,true);assert.equal(sim.chapter,4);assert.equal(sim.elapsed,240);
  assert.equal(sim.body.pieces.length,sim.count);
  const ending=sim.snapshot();sim.step(30,{x:1,z:1});assert.deepEqual(sim.snapshot(),ending);
  const data=new Map([['katamari:'+island+':campaign-best',JSON.stringify({score:99999})]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(readRecord(storage,island,'campaign'),null,'Seven-stage record leaked into the new format');
  const report=finishRecord(sim,null);assert.ok(!report.labels.includes('FASTEST FINISH'));saveRecord(storage,sim,report.record);assert.equal(readRecord(storage,island,'campaign').stages.length,4);
  evidence.push({island,transitions,seconds:sim.elapsed,retainedPieces:sim.body.pieces.length});
  sim.world.invalidatePrefetch();
}
console.log(JSON.stringify({fourTimedStages:true,earlyGoalsDoNotSkipTime:true,retainedWorldAndHeap:true,pausedClock:true,increasingObjectSizes:true,recordsSeparated:true,evidence},null,2));
