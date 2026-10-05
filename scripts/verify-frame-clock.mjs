import assert from 'node:assert/strict';
import {FrameClock} from '../src/frame-clock.js';
import {Simulation} from '../src/simulation.js';
const results=[];
for(const fps of [20,30,60,120,144]){
  const clock=new FrameClock(),sim=new Simulation();sim.reset('quick','oahu',123456);
  for(let frame=0;frame<fps*3;frame++)clock.advance(1/fps,dt=>sim.step(dt,{x:0,z:-1,boost:false}));
  results.push({fps,elapsed:sim.elapsed,x:sim.x,z:sim.z,count:sim.count,size:sim.diameter,score:sim.score});
}
for(const result of results)assert.deepEqual({...result,fps:20},results[0],'Refresh rate changed gameplay');
const clock=new FrameClock();let calls=0;
clock.advance(1/120,()=>calls++);clock.reset();clock.advance(1/120,()=>calls++);assert.equal(calls,0,'Pause retained fractional time');
clock.reset();clock.advance(1,()=>{calls++;return false;});assert.equal(calls,1,'Terminal state received extra ticks');assert.equal(clock.remaining,0);
console.log(JSON.stringify({refreshRateIndependent:results,pauseAndFinish:true},null,2));

for(const island of ['oahu','lanai']){
  const sim=new Simulation();sim.reset('campaign',island,123456);
  const first=sim.guidanceTarget();assert.ok(first&&sim.canCollect(first));
  sim.engagement.prize={id:first.id,type:first.type,size:first.size,x:first.x,z:first.z};
  sim.world.collect(first);assert.notEqual(sim.guidanceTarget()?.id,first.id);assert.equal(sim.prize(),null);
  sim.chapter=4;sim.world.installObjectives(sim.chapters,4);
  const islandTarget=sim.objective();sim.diameter=islandTarget.size*1.08;
  assert.equal(sim.guidanceTarget(),islandTarget,'Eligible island should override ordinary guidance');
}
console.log('Growth guidance and immediate collected-prize cleanup pass on both islands.');
