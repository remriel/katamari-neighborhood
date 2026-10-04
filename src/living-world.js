import {islandDistance,nearestStreet,streetRoutePoint} from './island-layout.js';

const TAU=Math.PI*2;
const eligible=new Set([6,7,8,9,10,11,13,14,17,22,23,24,25,27,28,29,42,43,44,45,46]);
const fract=x=>x-Math.floor(x);

// Replace at most four surviving ordinary slots. The thinning pass already ran;
// opening snacks, landmarks, objectives and all other placements stay intact.
export function populateActors(items,{islandId,physical,originX,originZ,level},types,hash){
  if(level>7)return;
  const candidates=items.filter(i=>eligible.has(i.type)&&i.size*physical<=10)
    .sort((a,b)=>hash(a.id,'living')-hash(b.id,'living')).slice(0,4);
  for(const [index,item] of candidates.entries()){
    const seed=hash(item.id,'route'),x=(item.x+originX)*physical,z=(item.z+originZ)*physical;
    const road=nearestStreet(x,z,islandId);
    let type,route;
    if(index===0&&road.distance<24&&road.width>=3){
      type=road.width>=5?29:14;
      const center=road.branch?road.x:road.z;
      route={kind:'car',network:road.network,branch:road.branch,line:road.line,lane:road.width*.10,
        center,span:16+(seed%19),speed:1.7+(seed%7)*.17,phase:(seed>>>8)/16777216};
    }else{
      type=index%2===1?52:[8,23,53][seed%3];
      const radius=type===52?1.6:1.0;
      // Short oval walks remain beside their original neighborhood slot.
      route={kind:type===52?'person':'animal',x,z,rx:radius,rz:radius*.65,
        speed:type===52?.55:.7,phase:(seed>>>8)/16777216};
    }
    const physicalSize=types[type].size;
    // Skip replacements whose entire route is not on land or crosses a prop.
    const safe=Array.from({length:16},(_,i)=>actorPose(route,i/16,islandId)).every(p=>{
      if(islandDistance(p.x,p.z,islandId)<physicalSize*.5+.3)return false;
      if(route.kind!=='car'&&nearestStreet(p.x,p.z,islandId).distance<.6)return false;
      return !items.some(other=>other!==item&&other.size*physical>.8&&
        Math.hypot((other.x+originX)*physical-p.x,(other.z+originZ)*physical-p.z)<physicalSize*.27+other.size*physical*.32);
    });
    if(!safe)continue;
    item.type=type;item.name=types[type].name;item.size=physicalSize/physical;item.motion=route;
    const p=actorPose(route,route.phase,islandId);
    item.x=p.x/physical-originX;item.z=p.z/physical-originZ;item.visualYaw=p.yaw;
  }
}

export function actorPose(route,phase,island){
  const angle=fract(phase)*TAU;
  if(route.kind==='car'){
    // Loop along opposite sides of one finite segment. The lateral lane shift
    // makes each end a continuous turn rather than an instantaneous reversal.
    const point=a=>streetRoutePoint({...route,lane:route.lane*Math.cos(a)},route.center+Math.sin(a)*route.span,island);
    const p=point(angle),before=point(angle-.001),after=point(angle+.001);
    // Blender's existing vehicles and creatures point along local +X.
    return{x:p.x,z:p.z,yaw:Math.atan2(before.z-after.z,after.x-before.x)};
  }
  const tx=-route.rx*Math.sin(angle),tz=route.rz*Math.cos(angle);
  return{x:route.x+Math.cos(angle)*route.rx,z:route.z+Math.sin(angle)*route.rz,
    yaw:Math.atan2(-tz,tx)};
}

export function updateActors(world,elapsed,dt,player){
  const physical=2**world.level,ox=Number(world.originX)*18,oz=Number(world.originZ)*18;
  for(const item of world.movers){
    if(item.collected)continue;
    const route=item.motion,period=route.kind==='car'?TAU*route.span/route.speed:TAU*route.rx/route.speed;
    let delay=world.actorDelays.get(item.id)||0;
    let p=actorPose(route,route.phase+(elapsed-delay)/period,world.islandId);
    let x=p.x/physical-ox,z=p.z/physical-oz;
    // Large actors yield to a small ball instead of driving through it. Stop
    // before contact, and retain this delay if their chunk streams out/in.
    const clearance=player.diameter*.65+item.size*.55+.15/physical;
    if(dt>0&&item.size*1.08>player.diameter&&Math.hypot(x-player.x,z-player.z)<clearance){
      delay+=dt;world.actorDelays.set(item.id,delay);
      p=actorPose(route,route.phase+(elapsed-delay)/period,world.islandId);
      x=p.x/physical-ox;z=p.z/physical-oz;
    }
    item.moving=Math.hypot(x-item.x,z-item.z)>1e-7;
    item.x=x;item.z=z;item.visualYaw=p.yaw;
    item.visualBob=route.kind==='car'?0:Math.abs(Math.sin((elapsed-delay)*9+route.phase*TAU))*item.size*.025;
  }
}
