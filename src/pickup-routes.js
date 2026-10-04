import {islandDistance,nearestStreet} from './island-layout.js';

// Reuse the 74 thinned opening slots. The first sweep teaches collection and
// growth by touch, with two honest, initially oversized prizes beside it.
export function arrangeOpening(items,types,seed,island,hash){
  const inventory=[...items].sort((a,b)=>hash(seed,a.id,'trail')-hash(seed,b.id,'trail'));
  const prizes=inventory.splice(-2);
  let mass=.32**3,diameter=.32;
  const ordered=[];
  while(inventory.length){
    const eligible=inventory.filter(i=>i.size*1.08<=diameter).sort((a,b)=>b.size-a.size);
    const item=eligible[ordered.length%4===3?eligible.length-1:0]||inventory[0];
    inventory.splice(inventory.indexOf(item),1);ordered.push(item);mass+=item.size**3*.82;diameter=Math.cbrt(mass);
  }
  const side=island==='lanai'?-1:1;
  for(const [i,item] of ordered.entries()){
    if(i<36){item.x=side*Math.sin(i*.17)*(i<16?.22:.55);item.z=-.34-i*.29;}
    else{const a=(i-36)*Math.PI*1.65/36;item.x=side*(Math.sin(a)*2.4);item.z=-10.5+(1-Math.cos(a))*2.4;}
    item.route='opening';item.routeOrder=i;
  }
  for(const [i,item] of prizes.entries()){
    item.type=6+i;item.size=types[item.type].size;item.name=types[item.type].name;item.x=side*(i?1.8:-1.6);item.z=i?-4.3:-1.8;item.route='opening-prize';
  }
}

// Place a short ordered sweep beside an existing large prop. No extra slots,
// size changes, actor-route changes, or growth-region pop-in are introduced.
export function arrangeChunkRoute(items,world,types,hash,guards,legacy){
  const {physical,originX,originZ,islandId,cx,cz}=world;
  const anchors=items.filter(i=>!i.motion&&!i.powerup&&i.size>=1.6&&i.size<=5.4).sort((a,b)=>hash(a.id,'prize')-hash(b.id,'prize'));
  const snacks=items.filter(i=>!i.motion&&!i.powerup&&i.size<=1.2).sort((a,b)=>a.size-b.size||hash(a.id,'trail')-hash(b.id,'trail')).slice(0,10);
  const anchor=anchors[0];if(!anchor||snacks.length<4)return;
  const street=nearestStreet((anchor.x+originX)*physical,(anchor.z+originZ)*physical,islandId);
  const angle=Math.atan2(street.z/physical-originZ-anchor.z,street.x/physical-originX-anchor.x),dx=Math.cos(angle),dz=Math.sin(angle);
  const radius=anchor.size*(types[anchor.type].footprint||.5)+.8,step=.5;
  const original=new Map(snacks.map(i=>[i.id,{x:i.x,z:i.z}]));
  for(const [index,item] of snacks.entries()){
    const along=radius+(snacks.length-1-index)*step,curve=Math.sin(index*.6)*.38;
    const x=anchor.x+dx*along-dz*curve,z=anchor.z+dz*along+dx*curve;
    if(x<cx*18+.5||x>(cx+1)*18-.5||z<cz*18+.5||z>(cz+1)*18-.5)continue;
    if(guards.some(g=>Math.hypot(x-g.x,z-g.z)<g.radius+item.size))continue;
    if(islandDistance((x+originX)*physical,(z+originZ)*physical,islandId)<item.size*physical*.5+.3)continue;
    const footprint=types[item.type].footprint||.35;
    if([...items,...legacy].some(other=>other!==item&&!original.has(other.id)&&Math.hypot(x-other.x,z-other.z)<item.size*footprint+other.size*(types[other.type].footprint||.4)+.12))continue;
    if(snacks.slice(0,index).some(other=>Math.hypot(x-other.x,z-other.z)<(item.size+other.size)*.35+.08))continue;
    item.x=x;item.z=z;item.route='prize-trail';item.routeAnchor=anchor.id;
  }
}
