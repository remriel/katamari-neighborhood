export const POWERUPS={
  magnet:{name:'Magnet',seconds:12,type:68},
  turbo:{name:'Turbo',seconds:10,type:69},
  star:{name:'Lucky star',seconds:15,type:70},
};
export function activePowers(sim){return Object.entries(POWERUPS).filter(([id])=>(sim.powerUntil[id]||0)>sim.elapsed).map(([id,p])=>({id,name:p.name,seconds:Math.ceil(sim.powerUntil[id]-sim.elapsed)}));}
export function attractPickups(sim,dt){
  if((sim.powerUntil.magnet||0)<=sim.elapsed)return;
  const reach=Math.min(sim.visibleRadius*.65,Math.max(sim.diameter*2.4,1.8/2**sim.level));
  const nearby=sim.world.nearby(sim.x,sim.z,reach).filter(i=>!i.collected&&!i.motion&&!i.powerup&&sim.canCollect(i)&&Math.hypot(i.x-sim.x,i.z-sim.z)<reach)
    .sort((a,b)=>Math.hypot(a.x-sim.x,a.z-sim.z)-Math.hypot(b.x-sim.x,b.z-sim.z)).slice(0,12);
  const scale=2**sim.level,ox=Number(sim.world.originX)*18,oz=Number(sim.world.originZ)*18;
  for(const item of nearby){
    const amount=1-Math.exp(-dt*3.2);item.x+=(sim.x-item.x)*amount;item.z+=(sim.z-item.z)*amount;item.magnetized=true;
    sim.world.magnetPositions.set(item.id,{x:(item.x+ox)*scale,z:(item.z+oz)*scale});
  }
}
