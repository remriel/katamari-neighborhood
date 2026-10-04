import assert from 'node:assert/strict';
import {Simulation,TYPES,hash} from '../src/simulation.js';
import {islandHeight,surfaceHeight} from '../src/terrain-height.js';
import {POWERUPS,activePowers,attractPickups} from '../src/powerups.js';
import {islandConfig,islandDistance} from '../src/island-layout.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const evidence=[];
assert.equal(Object.keys(POWERUPS).length,3);
for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island);
  const World=sim.world.constructor;sim.world=new World(123456,island);sim.world.installObjectives(sim.chapters);sim.world.installLandmarks();
  const world=sim.world,coast=[...islandConfig(island).coast,[0,0],[600,-1200],[-2000,500],[1300,-400]];
  let beach=0,variety=0,powers=0;
  // Walk source chunks along every coast segment; scenery is collectible on land.
  const ids=new Set();
  for(const [x,z] of coast){
    const inward={x:x*.97,z:z*.97};
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      const chunk=world.generate(Math.floor(inward.x/18)+dx,Math.floor(inward.z/18)+dz,sim);
      for(const item of chunk.items)if(!ids.has(item.id)){
        ids.add(item.id);if(item.type>=54){variety++;if(item.region==='beach')beach++;}
        if(item.powerup)powers++;
        if(item.region)assert.ok(islandDistance(item.x,item.z,island)>0,'Region prop is in the ocean');
      }
    }
  }
  assert.ok(beach>5&&variety>beach,'Coasts and inland regions lack distinct scenery');
  assert.ok(powers>0,'Power-ups do not spawn');
  const heights=[];
  for(let x=-120;x<=120;x+=4)heights.push(islandHeight(x,40,island));
  assert.ok(Math.max(...heights)-Math.min(...heights)>1,'Town terrain remains flat');
  const ridge=islandConfig(island).ridges[0][1];assert.ok(islandHeight(...ridge,island)>70,'Island ridge is flat');
  near(islandHeight(12000,12000,island),0);
  const x=55,z=-27,before=surfaceHeight(world,x,z);world.originX=3n;world.originZ=-2n;
  near(surfaceHeight(world,x-54,z+36),before);
  world.level=1;near(surfaceHeight(world,(x-108)/2,(z+72)/2)*2,before);
  evidence.push({island,beachProps:beach,variedProps:variety,powerups:powers,townHeightRange:Math.max(...heights)-Math.min(...heights),ridgeHeight:islandHeight(...ridge,island)});
}

function empty(){
  const sim=new Simulation();sim.reset('quick');sim.world.invalidatePrefetch();sim.world.chunks.clear();sim.world.legacy=[];sim.world.items=[];
  sim.world.guards=[{x:0,z:0,radius:10000}];sim.world.stamp='';return sim;
}
for(const [id,power] of Object.entries(POWERUPS)){
  const sim=empty(),item={id:'power:'+id,type:power.type,name:power.name,size:.4,x:0,z:0,collected:false,powerup:id,visualSeed:0,owner:null};
  sim.world.legacy=[item];sim.world.items=[item];
  const result=sim.step(1/60,{x:0,z:0});
  assert.ok(item.collected);assert.equal(result.pickups[0].powerup,id);assert.equal(sim.body.pieces.length,0);
  assert.ok(activePowers(sim).some(p=>p.id===id));
  const frozen=sim.elapsed;sim.mode='paused';sim.step(5,{x:1,z:1});assert.equal(sim.elapsed,frozen);
  sim.mode='playing';sim.elapsed=sim.powerUntil[id]+.01;assert.equal(activePowers(sim).length,0);
  sim.reset();assert.equal(activePowers(sim).length,0);
}
const magnet=empty(),candy={id:'pulled',type:0,size:.12,x:1,z:0,visualSeed:0,collected:false,owner:null};
const blocker={id:'blocked',type:14,size:3.12,x:1,z:1,visualSeed:0,collected:false,owner:null};
magnet.world.legacy=[candy,blocker];magnet.world.items=[candy,blocker];magnet.powerUntil.magnet=12;
for(let i=0;i<120;i++)magnet.step(1/60,{x:0,z:0});
assert.ok(candy.collected,'Magnet did not collect an eligible pickup');assert.ok(!blocker.collected,'Magnet bypassed the size gate');
assert.equal(magnet.body.pieces.length,1);
const normal=empty(),lucky=empty();lucky.powerUntil.star=15;
for(const sim of [normal,lucky]){const i={id:'score',type:0,size:.12,x:0,z:0,collected:false,visualSeed:0,owner:null};sim.world.legacy=[i];sim.world.items=[i];sim.step(1/60,{x:0,z:0});}
assert.equal(lucky.score,normal.score*2);
const regular=empty(),turbo=empty();turbo.powerUntil.turbo=10;
for(let i=0;i<120;i++){regular.step(1/60,{x:1,z:0});turbo.step(1/60,{x:1,z:0});}
assert.ok(turbo.x>regular.x*1.25,'Turbo does not accelerate rolling');
console.log(JSON.stringify({terrain:evidence,threePowers:true,magnetGateAndPile:true,expiryPauseReset:true,turboSpeed:true,doubleScore:true},null,2));
