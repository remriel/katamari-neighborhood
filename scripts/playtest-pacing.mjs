import {Simulation} from '../src/simulation.js';
import {RoutePilot} from '../src/diagnostics/route-pilot.js';
import {writeFileSync} from 'node:fs';
const evidence=[];
for(const island of ['oahu','lanai']){
 const sim=new Simulation();sim.reset('campaign',island,Number(process.env.PACING_SEED)||123456);sim.setDiagnostics(true);const pilot=new RoutePilot(sim),checkpoints=[];
 for(let frame=0;frame<30*600&&sim.mode==='playing';frame++){
  const chapter=sim.chapter;sim.step(1/30,pilot.input(1/30));
  if(sim.chapter!==chapter)checkpoints.push({chapter:sim.chapter,seconds:sim.elapsed,size:sim.diameter*2**sim.level,count:sim.count});
 }
 const remaining=sim.items.filter(i=>!i.collected),eligible=remaining.filter(i=>i.size*1.08<=sim.diameter);
 const result={island,seed:sim.world.seed,won:sim.won,elapsed:sim.elapsed,chapter:sim.chapter,size:sim.diameter*2**sim.level,materialDiameter:Math.cbrt(sim.volume)*2**sim.level,physicalPosition:[(sim.x+Number(sim.world.originX)*18)*2**sim.level,(sim.z+Number(sim.world.originZ)*18)*2**sim.level],pieces:sim.count,score:sim.score,remainingEligible:eligible.length,remainingTypes:Object.fromEntries([...new Set(eligible.map(i=>i.type))].map(type=>[type,eligible.filter(i=>i.type===type).length])),...sim.engagement.report(sim),checkpoints};evidence.push(result);console.log(JSON.stringify(result));
}
if(process.env.PACING_OUTPUT)writeFileSync(process.env.PACING_OUTPUT,JSON.stringify(evidence,null,2));
if(evidence.some(r=>!r.won))process.exitCode=1;
