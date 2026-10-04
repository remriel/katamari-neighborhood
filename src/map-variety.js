import {islandFields,nearestStreet,islandDistance} from './island-layout.js';

export function dressRegion(items,world,types,hash){
  const {physical,originX,originZ,islandId}=world;
  const allowPowerup=hash(world.chunkId,islandId,'powerup-frequency')%100<30;
  const candidates=items.filter(i=>!i.motion&&types[i.type].size<=12&&i.type<52)
    .sort((a,b)=>hash(a.id,'region')-hash(b.id,'region'));
  let dressed=0,powered=false;
  for(const item of candidates){
    const x=(item.x+originX)*physical,z=(item.z+originZ)*physical,f=islandFields(x,z,islandId);
    const seed=hash(item.id,'region-type');
    const beach=f.coast<180&&f.ridge<.42;
    let pool=beach?[54,55,56,57,58,59,60,61,67]:f.ridge>.34?[65,65,64]:
      f.city>.3?[62,63,64,66]:islandId==='lanai'?[62,64,65,66]:[62,64,66];
    // Preserve ordinary snack trails inland. On the coast they become small
    // shells and crabs rather than bulky furniture.
    if(types[item.type].size<.65){if(!beach)continue;pool=[59,60];}
    let type=pool[seed%pool.length];
    if(allowPowerup&&!powered&&seed%11===0){type=68+(seed>>>8)%3;powered=true;}
    else if(dressed>=6)continue;
    const size=types[type].size;
    if(size>(world.maxObjectSize??Infinity))continue;
    if(islandDistance(x,z,islandId)<size*.55+.3)continue;
    const street=nearestStreet(x,z,islandId);
    if(type<68&&size>1&&street.distance<street.width*.5+size*.25)continue;
    if(items.some(other=>other!==item&&Math.hypot((other.x+originX)*physical-x,(other.z+originZ)*physical-z)<size*.28+other.size*physical*.25))continue;
    item.type=type;item.name=types[type].name;item.size=size/physical;
    item.region=beach?'beach':f.ridge>.34?'highland':f.city>.3?'market':'garden';
    item.visualYaw=beach?Math.atan2(street.nx,street.nz):item.visualYaw;
    if(type>=68)item.powerup=['magnet','turbo','star'][type-68];else dressed++;
  }
}
