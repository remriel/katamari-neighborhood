export const CHUNK_SIZE = 18;
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
export function hash(...parts){let h=2166136261;for(const ch of parts.join(':')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const DISTRICTS=['Pocket Parks','Flower Market','Sunny Side Streets','Orchard Walk'];
const FOOTPRINT=[.28,.3,.3,.33,.32,.32,.48,.38,.38,.4,.43,.54,.45,.42,.52,.52,.44,.6];
const floorHalf=n=>n>=0n?n/2n:(n-1n)/2n;
function newSeed(){const values=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(values);return values[0];}return(Math.random()*4294967296)>>>0;}

class ProceduralWorld{
  constructor(seed){this.seed=seed;this.level=0;this.originX=0n;this.originZ=0n;this.chunks=new Map();this.history=new Map();this.legacy=[];this.guards=[];this.items=[];this.stamp='';this.generated=0;this.opening();}
  opening(){
    const random=seededRandom(this.seed);
    for(let i=0;i<92;i++){const angle=random()*Math.PI*2,r=.65+Math.sqrt(random())*5.8,type=i%6;
      this.legacy.push({id:`opening:${i}`,type,x:Math.cos(angle)*r,z:Math.sin(angle)*r,size:TYPES[type].size,collected:false,visualSeed:hash(this.seed,i),owner:null});}
  }
  remember(chunk){
    if(!chunk.mask)return;this.history.delete(chunk.id);this.history.set(chunk.id,chunk.mask);
    while(this.history.size>384)this.history.delete(this.history.keys().next().value);
  }
  generate(cx,cz,player){
    const ax=this.originX+BigInt(cx),az=this.originZ+BigInt(cz),id=`${this.level}:${ax}:${az}`;
    const seed=hash(this.seed,id),random=seededRandom(seed),biome=seed%4;
    const chunk={id,cx,cz,biome,mask:this.history.get(id)||0n,items:[]};this.generated++;
    const themed=[[7,12,16,17],[3,5,7,13],[9,10,11,14,15],[1,2,7,12,16]][biome];
    const add=(type,x,z,slot)=>{
      const size=TYPES[type].size;
      // A growth transition cannot populate the space already on screen.
      // Remember skipped slots so unloading/reloading this block stays stable.
      if(this.guards.some(guard=>Math.hypot(x-guard.x,z-guard.z)<guard.radius+size)){
        chunk.mask|=1n<<BigInt(slot);return;
      }
      // Keep clear lanes between blocks; old-scale pickups keep their positions.
      if(size>1&&Math.hypot(x,z)<6.5&&this.level===0&&this.originX===0n&&this.originZ===0n)return;
      if(this.level>0&&Math.hypot(x-player.x,z-player.z)<player.diameter*.65+size*.5)return;
      for(const old of this.legacy){if(old.collected)continue;const gap=(size+old.size)*.3;if(Math.abs(x-old.x)<gap&&Math.abs(z-old.z)<gap&&Math.hypot(x-old.x,z-old.z)<gap)return;}
      chunk.items.push({id:`${id}:${slot}`,type,x,z,size,collected:Boolean(chunk.mask&(1n<<BigInt(slot))),visualSeed:hash(seed,slot),slot,owner:chunk});
    };
    for(let slot=0;slot<16;slot++){
      const gx=slot%4,gz=Math.floor(slot/4);
      const x=cx*CHUNK_SIZE+2.8+gx*4.1+(random()-.5)*.8,z=cz*CHUNK_SIZE+2.8+gz*4.1+(random()-.5)*.8;
      const type=random()<.38?themed[Math.floor(random()*themed.length)]:Math.floor(random()*TYPES.length);
      add(type,x,z,slot);
    }
    // Snack trails and mid-size props keep every fresh block useful for growth.
    for(let slot=16;slot<36;slot++){
      const x=cx*CHUNK_SIZE+1.8+random()*14.4,z=cz*CHUNK_SIZE+1.8+random()*14.4;
      add(2+Math.floor(random()*10),x,z,slot);
    }
    return chunk;
  }
  sync(player,radius){
    const cx=Math.floor(player.x/CHUNK_SIZE),cz=Math.floor(player.z/CHUNK_SIZE),stamp=`${this.level}:${cx}:${cz}:${radius}`;
    if(stamp===this.stamp)return;this.stamp=stamp;
    for(const[key,chunk]of this.chunks){if(Math.abs(chunk.cx-cx)>radius||Math.abs(chunk.cz-cz)>radius){this.remember(chunk);this.chunks.delete(key);}}
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
      const key=`${x}:${z}`;if(!this.chunks.has(key))this.chunks.set(key,this.generate(x,z,player));
    }
    this.legacy=this.legacy.filter(item=>!item.collected&&Math.hypot(item.x-player.x,item.z-player.z)<Math.max(CHUNK_SIZE*(radius+1),player.visibleRadius||0));
    this.items=[...this.legacy,...Array.from(this.chunks.values()).flatMap(chunk=>chunk.items)];
  }
  nearby(x,z,radius){
    const reach=radius+3.2,result=[];
    for(const chunk of this.chunks.values()){
      if(x+reach<chunk.cx*CHUNK_SIZE||x-reach>(chunk.cx+1)*CHUNK_SIZE||z+reach<chunk.cz*CHUNK_SIZE||z-reach>(chunk.cz+1)*CHUNK_SIZE)continue;
      result.push(...chunk.items);
    }
    for(const item of this.legacy)if(Math.abs(item.x-x)<reach&&Math.abs(item.z-z)<reach)result.push(item);
    return result;
  }
  collect(item){item.collected=true;if(item.owner)item.owner.mask|=1n<<BigInt(item.slot);}
  rebase(sx,sz){
    this.originX+=BigInt(sx);this.originZ+=BigInt(sz);
    const dx=sx*CHUNK_SIZE,dz=sz*CHUNK_SIZE;
    for(const item of this.items){item.x-=dx;item.z-=dz;}
    for(const guard of this.guards){guard.x-=dx;guard.z-=dz;}
    const moved=new Map();for(const chunk of this.chunks.values()){chunk.cx-=sx;chunk.cz-=sz;moved.set(`${chunk.cx}:${chunk.cz}`,chunk);}this.chunks=moved;this.stamp='';
    return{dx,dz};
  }
  rescale(player){
    const ox=floorHalf(this.originX),oz=floorHalf(this.originZ);
    const shiftX=Number(this.originX-2n*ox)*CHUNK_SIZE/2,shiftZ=Number(this.originZ-2n*oz)*CHUNK_SIZE/2;
    const retentionRadius=Math.max(player.visibleRadius||0,CHUNK_SIZE*(player.viewRadius+1));
    // Retain the entire visible population, not just the closest 512 objects.
    // Old tiny objects leave naturally as the player travels into fresh areas.
    this.legacy=this.items.filter(item=>!item.collected&&Math.hypot(item.x-player.x,item.z-player.z)<retentionRadius)
      .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
    const retainedVisible=this.legacy.filter(item=>Math.hypot(item.x-player.x,item.z-player.z)<(player.visibleRadius||0));
    const visibleIds=new Set(retainedVisible.map(item=>item.id));
    this.legacy=[...retainedVisible,...this.legacy.filter(item=>!visibleIds.has(item.id)).slice(0,Math.max(0,4096-retainedVisible.length))];
    for(const item of this.legacy){item.x=item.x/2+shiftX;item.z=item.z/2+shiftZ;item.size/=2;item.owner=null;}
    for(const chunk of this.chunks.values())this.remember(chunk);
    for(const guard of this.guards){guard.x=guard.x/2+shiftX;guard.z=guard.z/2+shiftZ;guard.radius/=2;}
    this.guards.push({x:player.x/2+shiftX,z:player.z/2+shiftZ,radius:retentionRadius/2});
    this.guards=this.guards.slice(-8);
    this.originX=ox;this.originZ=oz;this.level++;this.chunks.clear();this.stamp='';this.items=this.legacy;
    return{shiftX,shiftZ};
  }
  district(x,z){return DISTRICTS[this.chunks.get(`${Math.floor(x/CHUNK_SIZE)}:${Math.floor(z/CHUNK_SIZE)}`)?.biome??0];}
}

export class Simulation{
  constructor(){this.reset(true);this.mode='menu';}
  get items(){return this.world.items;}
  get level(){return this.world.level;}
  reset(free=true){this.world=new ProceduralWorld(newSeed());this.x=0;this.z=0;this.vx=0;this.vz=0;this.diameter=.32;this.volume=.32**3;this.elapsed=0;this.count=0;this.free=free;this.mode='playing';this.milestone=0;this.won=false;this.combo=0;this.lastPickup=-100;this.nextGoal=0;this.viewRadius=2;this.visibleRadius=18;this.world.sync(this,this.viewRadius);}
  setViewRadius(radius){this.viewRadius=Math.max(2,Math.min(4,radius));}
  setVisibleRadius(radius){this.visibleRadius=radius;}
  step(dt,input){
    if(this.mode!=='playing')return {pickups:[],distance:0,transform:{scale:1,x:0,z:0}};
    this.elapsed+=dt;
    const speed=(1.7+Math.sqrt(this.diameter)*1.5)*(input.boost?1.7:1);
    const smoothing=1-Math.exp(-dt*9);
    this.vx+=(input.x*speed-this.vx)*smoothing;this.vz+=(input.z*speed-this.vz)*smoothing;
    const oldX=this.x,oldZ=this.z;
    this.world.sync(this,this.viewRadius);
    const pickups=[],nearby=this.world.nearby(this.x,this.z,this.diameter*.5);
    const substeps=Math.min(10,Math.max(1,Math.ceil(Math.hypot(this.vx,this.vz)*dt/Math.max(.06,this.diameter*.16))));
    for(let step=0;step<substeps;step++){
      this.x+=this.vx*dt/substeps;this.z+=this.vz*dt/substeps;
      for(let pass=0;pass<2;pass++)for(const item of nearby){
        if(item.collected)continue;
        const dx=this.x-item.x,dz=this.z-item.z,dist=Math.hypot(dx,dz),reach=this.diameter*.5+item.size*FOOTPRINT[item.type];
        if(dist>=reach)continue;
        if(item.size*1.08<=this.diameter){
          this.world.collect(item);this.count++;this.volume+=item.size**3*.82;this.diameter=Math.cbrt(this.volume);pickups.push({...item,owner:null});
          this.combo=this.elapsed-this.lastPickup<1.5?this.combo+1:1;this.lastPickup=this.elapsed;
        }else{
          const nx=dist>.00001?dx/dist:1,nz=dist>.00001?dz/dist:0,overlap=reach-dist+.001;
          this.x+=nx*overlap;this.z+=nz*overlap;
          const dot=this.vx*nx+this.vz*nz;if(dot<0){this.vx-=dot*nx;this.vz-=dot*nz;}
        }
      }
    }
    let dx=this.x-oldX,dz=this.z-oldZ;
    const transform={scale:1,x:0,z:0};
    let milestone=null;
    const stages=[.65,1.2,2.2,3.8];
    while(this.milestone<stages.length&&this.diameter>=stages[this.milestone]){milestone=this.milestone++;}
    while(Math.log2(this.diameter)+this.level>=Math.log2(GOAL)+this.nextGoal){milestone=4;this.nextGoal++;}
    if(!this.free&&(this.nextGoal>0||this.elapsed>=ROUND_SECONDS)){this.won=this.nextGoal>0;this.mode='result';}
    // Normalize the simulation as size grows; numbers and camera precision stay
    // small while the logical Katamari size continues to increase without a cap.
    while(this.diameter>=8){
      const offset=this.world.rescale(this);this.x=this.x/2+offset.shiftX;this.z=this.z/2+offset.shiftZ;this.vx/=2;this.vz/=2;this.diameter/=2;this.volume/=8;this.visibleRadius/=2;
      dx/=2;dz/=2;transform.scale/=2;transform.x=transform.x/2+offset.shiftX;transform.z=transform.z/2+offset.shiftZ;
    }
    if(Math.abs(this.x)>CHUNK_SIZE*64||Math.abs(this.z)>CHUNK_SIZE*64){
      const shift=this.world.rebase(Math.floor(this.x/CHUNK_SIZE),Math.floor(this.z/CHUNK_SIZE));this.x-=shift.dx;this.z-=shift.dz;transform.x-=shift.dx;transform.z-=shift.dz;
    }
    this.world.sync(this,this.viewRadius);
    return{pickups,distance:Math.hypot(dx,dz),dx,dz,milestone,transform};
  }
  progress(){const relative=this.diameter/2**(this.nextGoal-this.level);return this.nextGoal===0?Math.max(0,(relative-.32)/(GOAL-.32)):Math.max(0,(relative-3)/3);}
  nextGoalSize(){return formatSize(GOAL,this.nextGoal);}
  snapshot(){return{mode:this.mode,map:'Endless Sunny Side',size:formatSize(this.diameter,this.level),normalizedDiameter:this.diameter,scaleExponent:this.level,collected:this.count,nearbyRemaining:this.items.filter(i=>!i.collected).length,loadedBlocks:this.world.chunks.size,generatedBlocks:this.world.generated,seed:this.world.seed,secondsRemaining:this.free?null:Math.max(0,Math.ceil(ROUND_SECONDS-this.elapsed)),freeRoll:this.free,goalMeters:GOAL};}
}
export function sizeParts(d,level=0){
  const exponent=Math.log10(d)+level*Math.log10(2);
  if(exponent<0)return{value:String(Math.round(d*2**level*100)),unit:'cm'};
  if(exponent<3)return{value:(d*2**level).toFixed(exponent<1?2:1),unit:'m'};
  if(exponent<6)return{value:(d*2**level/1000).toFixed(exponent<4?2:1),unit:'km'};
  const power=Math.floor(exponent)-3;return{value:`${(10**(exponent-Math.floor(exponent))).toFixed(1)}e${power}`,unit:'km'};
}
export function formatSize(d,level=0){const size=sizeParts(d,level);return`${size.value} ${size.unit}`;}
