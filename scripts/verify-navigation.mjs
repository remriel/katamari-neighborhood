import assert from 'node:assert/strict';
import {Simulation,TYPES} from '../src/simulation.js';
import {navigationRadius} from '../src/navigation.js';
function fixture(diameter,items){
  const sim=new Simulation();sim.mode='playing';sim.diameter=diameter;sim.volume=diameter**3;
  sim.world.items=items;sim.world.legacy=[];sim.world.sync=()=>{};sim.world.nearby=()=>items;
  return sim;
}
const item=(id,type,x,z,seed=1)=>({id,type,x,z,size:TYPES[type].size,visualSeed:seed,collected:false});
const capped=fixture(.32,[item('a',0,0,0),item('b',0,0,0),item('c',0,0,0),item('blocker',14,0,1.3)]);
const first=capped.step(1/60,{x:0,z:1,boost:true});
assert.equal(first.pickups.length,3);
const blocker=capped.items[3],required=navigationRadius(capped.diameter,capped.body.coreRadius)+blocker.size*.52*.78;
assert.ok(Math.hypot(capped.x-blocker.x,capped.z-blocker.z)>=required-1e-4,'Three pickups skipped the later blocker');
const corridor=fixture(3,[item('left-bus',30,-4.6,2),item('right-bus',30,4.6,2)]);
for(let i=0;i<3;i++){const attachment=item('bench-'+i,17,i-1,.5,i);corridor.body.attach(attachment,TYPES[17],2.2,0,0,3);corridor.count++;}
assert.ok(corridor.body.boundRadius>navigationRadius(3,.16)*1.5,'Fixture lacks a protruding pile');
for(let i=0;i<240;i++)corridor.step(1/60,{x:0,z:1,boost:i<120});
assert.ok(corridor.z>10,'The lumpy heap was trapped between buses');
assert.equal(corridor.count,corridor.body.pieces.length);
const corner=fixture(.7,[item('van-a',14,-1,3,1),item('van-b',14,1,3,2),item('van-c',14,0,5,3)]);
for(let i=0;i<360;i++)corner.step(1/60,{x:0,z:1,boost:i<120});
assert.ok(Math.hypot(corner.x,corner.z)>5,'Straight input did not slide out of the corner: '+JSON.stringify({x:corner.x,z:corner.z,vx:corner.vx,vz:corner.vz}));
const reverse=fixture(.7,[item('house',15,0,3,1)]);
for(let i=0;i<90;i++)reverse.step(1/60,{x:0,z:1,boost:true});
const before=reverse.z;
for(let i=0;i<90;i++)reverse.step(1/60,{x:0,z:-1,boost:true});
assert.ok(reverse.z<before-2,'Backing away from a blocker was trapped');
assert.ok([corridor.body.height,corner.body.height,reverse.body.height,...corridor.body.orientation].every(Number.isFinite));
console.log(JSON.stringify({threePickupsThenBlocker:'pass',lumpyBusCorridor:{z:corridor.z,pieces:corridor.count},cornerEscape:{x:corner.x,z:corner.z},reverseEscape:{before,after:reverse.z}},null,2));
