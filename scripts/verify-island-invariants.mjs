import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,TYPES,PROP_ART_COUNT} from '../src/simulation.js';
import {islandContains,islandDistance,islandConfig,constrainToIsland,islandDistrict} from '../src/island-layout.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,'Physical world position/size changed');
const evidence=[];
for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island);
  assert.equal(sim.snapshot().map,islandConfig(island).name);
  assert.equal(sim.world.legacy.filter(i=>i.id.startsWith('opening:')).length,74);
  assert.equal(sim.world.legacy.filter(i=>i.objectiveIndex!==undefined).length,3);
  sim.setViewRadius(9);assert.equal(sim.viewRadius,9,'Camera coverage was clamped to a small chunk radius');
  assert.ok(islandContains(0,0,island));
  assert.ok(islandDistrict(0,0,island).includes(island==='oahu'?'Honolulu':'Lānaʻi City'));
  for(const p of islandConfig(island).objectives)assert.ok(islandContains(...p,island),'Objective outside island');
  const clamped=constrainToIsland(9000,9000,.25,island);assert.ok(islandContains(clamped.x,clamped.z,island));
  const World=sim.world.constructor,a=new World(123456,island),b=new World(123456,island);
  a.installObjectives(sim.chapters);b.installObjectives(sim.chapters);a.installLandmarks();b.installLandmarks();
  const player={x:0,z:0,diameter:.32,viewRadius:2,visibleRadius:18};
  const ca=a.generate(1,0,player),cb=b.generate(1,0,player);
  assert.deepEqual(ca.items.map(i=>[i.id,i.type,i.x,i.z,i.visualYaw]),cb.items.map(i=>[i.id,i.type,i.x,i.z,i.visualYaw]));
  for(const i of ca.items)assert.ok(islandDistance(i.x,i.z,island)>0,'Ordinary pickup spawned in ocean');
  const objective=sim.world.legacy.find(i=>i.objectiveIndex===3),before={x:objective.x,z:objective.z,size:objective.size,id:objective.id};
  sim.world.rescale(sim);
  const after=sim.world.legacy.find(i=>i.id===before.id);
  near((after.x+Number(sim.world.originX)*18)*2,before.x);near((after.z+Number(sim.world.originZ)*18)*2,before.z);near(after.size*2,before.size);
  sim.world.rebase(2,-3);
  near((after.x+Number(sim.world.originX)*18)*2,before.x);near((after.z+Number(sim.world.originZ)*18)*2,before.z);
  sim.reset('campaign',island);
  for(let i=0;i<360;i++)sim.step(1/60,{x:Math.cos(i/100),z:Math.sin(i/100),boost:i<120});
  assert.equal(sim.count,sim.body.pieces.length,'Pickup did not persist in the compound');
  near(sim.body.coreRadius*2*2**sim.level,.32);
  assert.ok([sim.x,sim.z,sim.diameter,sim.body.height,...sim.body.orientation].every(Number.isFinite));
  const pieces=sim.body.pieces.map(p=>({id:p.id,center:[...p.center],rotation:[...p.rotation]}));
  sim.body.rescale(.5);
  for(let i=0;i<pieces.length;i++){assert.equal(sim.body.pieces[i].id,pieces[i].id);assert.deepEqual(sim.body.pieces[i].rotation,pieces[i].rotation);pieces[i].center.forEach((v,j)=>near(sim.body.pieces[i].center[j],v*.5));}
  sim.reset('campaign',island);
  for(let i=0;i<4;i++){
    sim.elapsed=sim.timeLimit-.01;sim.step(.02,{x:0,z:0,boost:false});
  }
  assert.equal(sim.mode,'result');assert.equal(sim.won,true);assert.equal(sim.chapter,4);assert.equal(sim.elapsed,120);
  const terminal=sim.snapshot();sim.step(1,{x:1,z:1,boost:true});assert.deepEqual(sim.snapshot(),terminal,'Finished level continued running');
  evidence.push({island,opening:74,goals:3,ordinarySample:ca.items.length,finiteEnding:true});
}
const data=readFileSync(new URL('../public/models/toy-town.glb',import.meta.url));
assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);
const length=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+length).toString('utf8'));
const manifest=JSON.parse(readFileSync(new URL('../public/models/manifest.json',import.meta.url),'utf8'));
const libraries=[gltf,...(manifest.extraLibraries||[]).map(path=>{const bytes=readFileSync(new URL('../public'+path,import.meta.url));return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));})];
const named=new Map(libraries.flatMap(lib=>lib.nodes.filter(n=>n.mesh!==undefined).map(n=>[n.name,{node:n,lib}])));
let triangles=0,maxTriangles=0;
for(const [name,meta] of Object.entries(manifest.models)){
  const entry=named.get(name);assert.ok(entry,'Missing GLB model '+name);const {node,lib}=entry;
  let count=0;
  for(const p of lib.meshes[node.mesh].primitives){
    assert.ok(p.attributes.COLOR_0!==undefined,'Model lost shared vertex colors');
    assert.ok(p.attributes.NORMAL!==undefined,'Model has no normals');
    count+=(p.indices!==undefined?lib.accessors[p.indices].count:lib.accessors[p.attributes.POSITION].count)/3;
  }
  assert.ok(count<=3000,'Model exceeds the landmark budget');
  if([42,43,44,45].includes(meta.type))assert.ok(count<=500,'Street prop exceeds normal prop budget');
  if(meta.type===46)assert.ok(count<=1000,'Truck exceeds vehicle budget');
  if([0,1,2,3,4,5,7,18,19,20,21].includes(meta.type))assert.ok(count<=150,'Tiny pickup exceeds cheap mesh budget');
  triangles+=count;maxTriangles=Math.max(maxTriangles,count);
}
assert.equal(named.size,Object.keys(manifest.models).length);
assert.equal(gltf.materials.length,1,'Palette was split into unique materials');
assert.ok(!gltf.images?.length,'Model kit unexpectedly uses bitmap textures');
assert.equal(PROP_ART_COUNT,54);assert.equal(TYPES.length,71);
for(let type=0;type<TYPES.length;type++)assert.ok(manifest.types[String(type)]?.models.length,'Missing collectible 3D family '+type);
assert.ok(manifest.types.guide?.models.length,'Rolling guide has no 3D mesh');
assert.equal(manifest.artRatios.length,54,'Original physical attachment proportions were lost');
const farData=readFileSync(new URL('../public'+manifest.lod,import.meta.url));
const far=JSON.parse(farData.subarray(20,20+farData.readUInt32LE(12)).toString('utf8'));
assert.equal(far.nodes.filter(n=>n.mesh!==undefined).length,Object.values(manifest.models).filter(m=>!m.supplemental).length,'Far LOD dropped a model');
let farTriangles=0;for(const mesh of far.meshes)for(const p of mesh.primitives)farTriangles+=far.accessors[p.indices].count/3;
assert.ok(farTriangles<triangles*.65,'Far LOD is not materially cheaper');
console.log(JSON.stringify({simulation:evidence,models:named.size,materials:gltf.materials.length,triangles,farTriangles,maxTriangles,bytes:data.length,farBytes:farData.length},null,2));
