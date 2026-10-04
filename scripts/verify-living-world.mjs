import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Simulation,TYPES,hash} from '../src/simulation.js';
import {actorPose,updateActors,populateActors} from '../src/living-world.js';
import {nearestStreet,islandDistance} from '../src/island-layout.js';
import {ToyModelLibrary} from '../src/toy-model-library.js';
import {WorldItemBatches} from '../src/model-batches.js';
import {CompoundView} from '../src/compound-view.js';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,message||`${a} != ${b}`);
const physicalPose=(w,i)=>[(i.x+Number(w.originX)*18)*2**w.level,(i.z+Number(w.originZ)*18)*2**w.level];
const evidence=[];

for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island);
  const World=sim.world.constructor;sim.world=new World(123456,island);sim.world.installObjectives(sim.chapters);sim.world.installLandmarks();sim.world.sync(sim,3);
  const world=sim.world,counts={car:0,person:0,animal:0};
  for(const actor of world.movers)counts[actor.motion.kind]++;
  for(const kind of Object.keys(counts))assert.ok(counts[kind]>0,`${island} lacks ${kind}`);
  assert.equal(world.legacy.filter(i=>i.id.startsWith('opening:')).length,74);
  assert.equal(world.legacy.filter(i=>i.objectiveIndex!==undefined).length,6);
  // Sample complete routes, not just the initial placement.
  for(const item of world.movers)for(let step=0;step<128;step++){
    const p=actorPose(item.motion,step/128,island);
    assert.ok(islandDistance(p.x,p.z,island)>0,'Actor walked into the sea');
    if(item.motion.kind==='car')assert.ok(nearestStreet(p.x,p.z,island).distance<=nearestStreet(p.x,p.z,island).width*.5,'Car left its road');
  }
  const actor=world.movers.find(i=>i.motion.kind==='car');
  const originalCoordinates=actor.owner.id.split(':').slice(1).map(Number);
  const start=physicalPose(world,actor);
  updateActors(world,7,0,{x:900,z:900,diameter:.32});
  assert.ok(Math.hypot(...physicalPose(world,actor).map((v,j)=>v-start[j]))>.1,'Traffic did not move');
  // Query beyond the owning chunk: collection and visibility use current poses.
  assert.ok(world.nearby(actor.x,actor.z,.01).includes(actor),'Moving actor missed spatial lookup');
  world.motionClock=7;
  const before=physicalPose(world,actor);world.rescale(sim);
  sim.x=sim.x/2;sim.z=sim.z/2;sim.diameter/=2;
  world.rebase(2,-3);sim.x-=36;sim.z+=54;
  world.refreshActors(sim);
  physicalPose(world,actor).forEach((v,j)=>near(v,before[j],'Actor jumped after normalization/rebase'));
  // A car yields without overlapping a small stationary ball.
  const current={x:actor.x,z:actor.z,diameter:.32};
  updateActors(world,7+1/60,1/60,current);
  physicalPose(world,actor).forEach((v,j)=>near(v,before[j],'Yielding car advanced into the ball'));
  assert.ok(world.actorDelays.get(actor.id)>0);
  // Reload at the same time gives the same physical actor pose and delay.
  const reload=new World(world.seed,island);reload.installObjectives(sim.chapters);reload.installLandmarks();
  reload.actorDelays=world.actorDelays;reload.motionClock=7+1/60;
  const chunk=reload.generate(...originalCoordinates,{x:0,z:0,diameter:.32});
  const regenerated=chunk.items.find(i=>i.id===actor.id);
  assert.ok(regenerated?.motion,'Actor identity changed across chunk reload');
  reload.items=chunk.items;reload.refreshActors(current);
  physicalPose(reload,regenerated).forEach((v,j)=>near(v,before[j],'Actor route changed on reload'));
  // An actor larger than the ball becomes collectible when the ball grows.
  sim.x=actor.x;sim.z=actor.z;sim.diameter=actor.size*1.2;sim.volume=sim.diameter**3;
  sim.elapsed=world.motionClock;sim.timeLimit=1000;sim.step(1/60,{x:0,z:0});
  assert.ok(actor.collected,'Moving car could not be collected');
  assert.ok(sim.body.pieces.some(piece=>piece.id===actor.id),'Moving actor did not stay in the pile');
  const frozen=[actor.x,actor.z,actor.visualYaw];updateActors(world,20,.1,sim);
  assert.deepEqual([actor.x,actor.z,actor.visualYaw],frozen,'Collected actor kept moving');
  world.collect(regenerated);reload.collectedIds.add(regenerated.id);
  const again=reload.generate(...originalCoordinates,{x:0,z:0,diameter:.32});
  assert.ok(again.items.find(i=>i.id===actor.id).collected,'Collected actor respawned');
  // Population replacement is an in-place transform of surviving IDs.
  const slots=chunk.items.map(i=>({...i,motion:undefined})),ids=slots.map(i=>i.id);
  populateActors(slots,{islandId:island,physical:1,originX:0,originZ:0,level:0},TYPES,hash);
  assert.deepEqual(slots.map(i=>i.id),ids,'Living population added/removed slots');
  evidence.push({island,...counts,routeSamples:world.movers.length*128,collectible:true,streamingStable:true});
}

// Exercise the real loader, geometry normalization, LOD fallback, and instanced
// transforms without requiring unavailable cloud browser infrastructure.
const originalFetch=globalThis.fetch,originalLoad=GLTFLoader.prototype.loadAsync;
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL('../public'+path,import.meta.url),'utf8'))});
GLTFLoader.prototype.loadAsync=function(path){
  const bytes=readFileSync(new URL('../public'+path,import.meta.url));
  return new Promise((resolve,reject)=>this.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
};
const models=await new ToyModelLibrary().load();
globalThis.fetch=originalFetch;GLTFLoader.prototype.loadAsync=originalLoad;
assert.ok(models.pick('guide',0));assert.equal(models.models.size,170);
for(const type of [52,53])for(let seed=0;seed<4;seed++){
  const model=models.pick(type,seed);assert.ok(model);
  assert.ok(model.geometry.getAttribute('color'));
  model.geometry.computeBoundingBox();near(model.geometry.boundingBox.min.y,0,'Actor pivot is not on the ground');
  assert.ok(model.bounds.toArray().every(v=>Number.isFinite(v)&&v>0));
}
const scene=new THREE.Scene(),batches=new WorldItemBatches(scene,models,new THREE.Texture());
const item={type:52,visualSeed:0,size:1.7,x:2,z:3,visualYaw:.5,motion:{kind:'person'}};
batches.begin();batches.put(item,40);batches.end();
item.x=5;item.z=6;item.visualBob=.03;batches.updateMotion();
const entry=batches.movers[0],matrix=new THREE.Matrix4();entry.mesh.getMatrixAt(entry.index,matrix);
near(matrix.elements[12],5);near(matrix.elements[14],6);near(matrix.elements[13],.036);
item.collected=true;batches.updateMotion();entry.mesh.getMatrixAt(entry.index,matrix);
near(new THREE.Vector3().setFromMatrixScale(matrix).length(),0,'Collected actor stayed visible');
batches.dispose();
const pile=new CompoundView(scene,models);pile.prewarm();
assert.ok([...pile.modelBatches.values()].some(batch=>batch.model.type===52),'Neighbors were not prewarmed for the pile');
assert.ok([...pile.modelBatches.values()].every(batch=>batch.model.type!=='guide'),'Guide was treated as a collectible');
pile.reset();
const fixture=new Simulation();
for(const type of [52,53]){
  const model=models.pick(type,0),info=TYPES[type];
  fixture.body.attach({id:'retained:'+type,type,size:info.size,visualSeed:0,x:2,z:3},info,1,0,0,4,model.bounds.toArray());
}
pile.sync(fixture.body,100,false);assert.equal(pile.slots.length,2);
fixture.body.rescale(.5);pile.sync(fixture.body,200,false);assert.equal(pile.slots.length,2);
pile.dispose();models.dispose();
console.log(JSON.stringify({islands:evidence,models:170,actorInstances:'pass',browserQA:'unavailable'},null,2));
