export const MAP_HALF = 31;
export const GOAL = 6;
export const ROUND_SECONDS = 240;
export const TYPES = [
  {name:'Candy',size:.12,art:0}, {name:'Cherries',size:.16,art:1},
  {name:'Mushroom',size:.23,art:2}, {name:'Donut',size:.28,art:3},
  {name:'Soda can',size:.36,art:4}, {name:'Milk carton',size:.48,art:5},
  {name:'Toy car',size:.62,art:6}, {name:'Flowerpot',size:.8,art:7},
  {name:'Calico cat',size:1.04,art:8}, {name:'Traffic cone',size:1.24,art:9},
  {name:'Stool',size:1.48,art:10}, {name:'Bicycle',size:1.78,art:11},
  {name:'Flowering bush',size:2.14,art:12}, {name:'Vending machine',size:2.58,art:13},
  {name:'Little van',size:3.12,art:14}, {name:'Peach house',size:5.1,art:15},
  {name:'Neighborhood tree',size:3.78,art:16}, {name:'Park bench',size:2.6,art:17},
];
function seededRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function makeMap(){
  const random=seededRandom(20260930), items=[];
  function add(type,x,z){const info=TYPES[type];items.push({id:items.length,type,x,z,size:info.size,collected:false,angle:random()*Math.PI*2});}
  // A generous pocket of small things makes the opening playable without hunting.
  for(let i=0;i<76;i++){const a=random()*Math.PI*2,r=.7+Math.sqrt(random())*4.8;add(i%5,r*Math.cos(a),r*Math.sin(a));}
  // Continuous size bands overlap spatially; every new size has reachable food.
  for(let type=4;type<15;type++){
    const number=type<9?18:type<12?14:10;
    for(let i=0;i<number;i++){
      const angle=(i/number)*Math.PI*2+random()*.4;
      const radius=4+(type-4)*1.32+random()*5;
      add(type,Math.cos(angle)*radius,Math.sin(angle)*radius);
    }
  }
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;add(16,Math.cos(a)*25,Math.sin(a)*25);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.18;add(17,Math.cos(a)*21,Math.sin(a)*21);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;add(15,Math.cos(a)*28,Math.sin(a)*28);}
  return items;
}
export class Simulation{
  constructor(){this.reset(false);this.mode='menu';}
  reset(free=false){this.items=makeMap();this.x=0;this.z=0;this.vx=0;this.vz=0;this.diameter=.32;this.volume=.32**3;this.elapsed=0;this.count=0;this.free=free;this.mode='playing';this.milestone=0;this.won=false;this.combo=0;this.lastPickup=-100;}
  step(dt,input){
    if(this.mode!=='playing')return {pickups:[],distance:0};
    this.elapsed+=dt;
    const speed=(1.7+Math.sqrt(this.diameter)*1.1)*(input.boost?1.7:1);
    const smoothing=1-Math.exp(-dt*9);
    this.vx+=(input.x*speed-this.vx)*smoothing;this.vz+=(input.z*speed-this.vz)*smoothing;
    const oldX=this.x,oldZ=this.z;
    this.x+=this.vx*dt;this.z+=this.vz*dt;
    const radius=this.diameter*.5,pickups=[];
    for(const item of this.items){
      if(item.collected)continue;
      const dx=this.x-item.x,dz=this.z-item.z,dist=Math.hypot(dx,dz);
      const reach=radius+item.size*.27;
      if(dist>reach)continue;
      if(item.size*1.08<=this.diameter){
        item.collected=true;this.count++;this.volume+=item.size**3*.82;this.diameter=Math.cbrt(this.volume);pickups.push(item);
        this.combo=this.elapsed-this.lastPickup<1.5?this.combo+1:1;this.lastPickup=this.elapsed;
      }else if(dist>0.0001){
        const overlap=reach-dist;this.x+=dx/dist*overlap;this.z+=dz/dist*overlap;
        const dot=this.vx*dx/dist+this.vz*dz/dist;
        if(dot<0){this.vx-=dot*dx/dist*1.35;this.vz-=dot*dz/dist*1.35;}
      }
    }
    this.x=Math.max(-MAP_HALF+radius,Math.min(MAP_HALF-radius,this.x));this.z=Math.max(-MAP_HALF+radius,Math.min(MAP_HALF-radius,this.z));
    const distance=Math.hypot(this.x-oldX,this.z-oldZ);
    let milestone=null;
    const stages=[.65,1.2,2.2,3.8];
    while(this.milestone<stages.length&&this.diameter>=stages[this.milestone]){milestone=this.milestone++;}
    if(!this.free&&(this.diameter>=GOAL||this.elapsed>=ROUND_SECONDS)){this.won=this.diameter>=GOAL;this.mode='result';}
    return{pickups,distance,dx:this.x-oldX,dz:this.z-oldZ,milestone};
  }
  snapshot(){return{mode:this.mode,map:'Sunny Side Neighborhood',diameterMeters:Number(this.diameter.toFixed(3)),collected:this.count,remaining:this.items.length-this.count,secondsRemaining:this.free?null:Math.max(0,Math.ceil(ROUND_SECONDS-this.elapsed)),freeRoll:this.free,goalMeters:GOAL};}
}
export function formatSize(d){return d<1?`${Math.round(d*100)} cm`:`${d.toFixed(2)} m`;}
