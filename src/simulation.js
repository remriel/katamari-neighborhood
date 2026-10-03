import {CompoundBall} from './compound-ball.js';
import {MAP_HALF_METERS,CHAPTERS,CAMPAIGN_START_SECONDS,CHAPTER_BONUS_SECONDS,CAMPAIGN_MAX_SECONDS} from './campaign.js';
export const CHUNK_SIZE = 18;
export const GOAL = 6;
export const ROUND_SECONDS = 240;
export const REGULAR_PICKUP_DENSITY = .8;
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
  {name:'Cupcake',size:.2,art:20,footprint:.32,fitSize:true},
  {name:'Sushi tray',size:.16,art:21,footprint:.4,fitSize:true},
  {name:'Teapot',size:.45,art:22,footprint:.4,fitSize:true},
  {name:'Rubber duck',size:.33,art:23,footprint:.35,fitSize:true},
  {name:'Skateboard',size:.85,art:24,footprint:.48,fitSize:true},
  {name:'Golden dog',size:1.15,art:25,footprint:.38,fitSize:true},
  {name:'Armchair',size:1.65,art:26,footprint:.42,fitSize:true},
  {name:'Suitcase',size:.75,art:27,footprint:.4,fitSize:true},
  {name:'Streetlamp',size:3.2,art:28,footprint:.2,fitSize:true},
  {name:'Food cart',size:2.4,art:29,footprint:.45,fitSize:true},
  {name:'Telephone booth',size:2.6,art:30,footprint:.36,fitSize:true},
  {name:'Convertible',size:4.6,art:31,footprint:.5,fitSize:true},
  {name:'City bus',size:9,art:32,footprint:.5,fitSize:true},
  {name:'Ancient oak',size:14,art:33,footprint:.45,fitSize:true},
  {name:'Apartment building',size:22,art:34,footprint:.4,fitSize:true},
  {name:'Windmill',size:28,art:35,footprint:.32,fitSize:true},
  {name:'Ferris wheel',size:48,art:36,footprint:.4,fitSize:true},
  {name:'Water tower',size:36,art:37,footprint:.3,fitSize:true},
  {name:'Clock tower',size:65,art:38,footprint:.3,fitSize:true},
  {name:'Castle',size:95,art:39,footprint:.48,fitSize:true},
  {name:'Stadium',size:150,art:40,footprint:.52,fitSize:true},
  {name:'Skyscraper',size:260,art:41,footprint:.28,fitSize:true},
  {name:'Mountain',size:900,art:42,footprint:.5,fitSize:true},
  {name:'Island',size:2200,art:43,footprint:.55,fitSize:true},
];
export const PROP_ART_COUNT=44;
function seededRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function hash(...parts){let h=2166136261;for(const ch of parts.join(':')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function reducePopulation(items){
  const keep=Math.round(items.length*REGULAR_PICKUP_DENSITY);
  const ranked=items.map(item=>({id:item.id,rank:hash(item.visualSeed,item.id,'density')})).sort((a,b)=>a.rank-b.rank);
  const ids=new Set(ranked.slice(0,keep).map(item=>item.id));
  return items.filter(item=>ids.has(item.id));
}
const DISTRICTS=['Pocket Parks','Flower Market','Sunny Side Streets','Orchard Walk'];
const FOOTPRINT=[.28,.3,.3,.33,.32,.32,.48,.38,.38,.4,.43,.54,.45,.42,.52,.52,.44,.6];
const footprint=type=>TYPES[type].footprint??FOOTPRINT[type]??.4;
const localSize=(type,level)=>TYPES[type].size*2**(-level);
const SCALE_STAGES=[
  {size:0,label:'POCKET SCALE',message:'Small things. Big dreams.'},
  {size:1,label:'STREET SCALE',message:'The street is yours!'},
  {size:6,label:'HOUSE SCALE',message:'Bigger than houses!'},
  {size:12,label:'TOWN SCALE',message:'Here come the buses and giant trees!'},
  {size:30,label:'LANDMARK SCALE',message:'Roll up the landmarks!'},
  {size:100,label:'CITY SCALE',message:'A whole city of glorious stuff!'},
  {size:500,label:'MOUNTAIN SCALE',message:'Move mountains. Literally.'},
  {size:1600,label:'ISLAND SCALE',message:'Islands? Absolutely.'},
  {size:4000,label:'WORLD SCALE',message:'Island chains and mountain ranges!'},
];
const floorHalf=n=>n>=0n?n/2n:(n-1n)/2n;
function newSeed(){const values=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(values);return values[0];}return(Math.random()*4294967296)>>>0;}

class ProceduralWorld{
  constructor(seed){this.seed=seed;this.level=0;this.originX=0n;this.originZ=0n;this.chunks=new Map();this.preloaded=new Map();this.prefetchQueue=[];this.prefetchStamp='';this.prefetchToken=0;this.history=new Map();this.collectedIds=new Set();this.legacy=[];this.guards=[];this.items=[];this.stamp='';this.generated=0;this.opening();}
  opening(){
    const random=seededRandom(this.seed);
    for(let i=0;i<92;i++){const angle=random()*Math.PI*2,r=.65+Math.sqrt(random())*5.8,type=i%6;
      this.legacy.push({id:`opening:${i}`,type,x:Math.cos(angle)*r,z:Math.sin(angle)*r,size:TYPES[type].size,collected:false,visualSeed:hash(this.seed,i),owner:null});}
    this.legacy=reducePopulation(this.legacy);
  }
  installObjectives(){
    const positions=[[0,0],[28,-6],[145,-35],[640,130],[1700,-340],[2900,800],[3800,-1600]];
    for(let index=1;index<CHAPTERS.length;index++){
      const type=CHAPTERS[index].type,[x,z]=positions[index];
      this.legacy.push({id:`objective:${index}`,type,name:index===6?'Sunny Side Island':TYPES[type].name,x,z,size:TYPES[type].size,collected:false,visualSeed:hash(this.seed,'objective',index),owner:null,objectiveIndex:index});
    }
  }
  remember(chunk){
    if(!chunk.mask)return;this.history.delete(chunk.id);this.history.set(chunk.id,chunk.mask);
    while(this.history.size>384)this.history.delete(this.history.keys().next().value);
  }
  generate(cx,cz,player){
    const ax=this.originX+BigInt(cx),az=this.originZ+BigInt(cz),id=`${this.level}:${ax}:${az}`;
    const seed=hash(this.seed,id),random=seededRandom(seed),biome=seed%4;
    const chunk={id,cx,cz,biome,mask:this.history.get(id)||0n,items:[]};this.generated++;
    const catalogue=TYPES.map((_,type)=>type).filter(type=>{const size=localSize(type,this.level);return size>=.1&&size<=12;});
    if(!catalogue.length)return chunk;
    const theme=[[7,12,16,17,21,23,31,33,34,35,40,41],[3,5,7,13,18,19,20,27,28,30,32,36,38],[9,10,11,14,15,22,24,25,26,29,30,32,36,37,39],[1,2,7,12,16,19,21,23,31,33,35,37,40,41]][biome];
    const themed=theme.filter(type=>catalogue.includes(type));
    const large=catalogue.filter(type=>localSize(type,this.level)>=1.6);
    const small=catalogue.filter(type=>localSize(type,this.level)<=1.6);
    const medium=catalogue.filter(type=>{const size=localSize(type,this.level);return size>=.65&&size<=5.4;});
    const select=pool=>{const entries=pool.length?pool:catalogue;return entries[Math.floor(random()*entries.length)];};
    const add=(type,x,z,slot)=>{
      const info=TYPES[type],size=localSize(type,this.level);
      const half=MAP_HALF_METERS*2**(-this.level),absoluteX=x+Number(this.originX)*CHUNK_SIZE,absoluteZ=z+Number(this.originZ)*CHUNK_SIZE;
      if(Math.abs(absoluteX)+size*.6>half||Math.abs(absoluteZ)+size*.6>half){chunk.mask|=1n<<BigInt(slot);return;}
      // A growth transition cannot populate the space already on screen.
      // Remember skipped slots so unloading/reloading this block stays stable.
      if(this.guards.some(guard=>Math.hypot(x-guard.x,z-guard.z)<guard.radius+size)){
        chunk.mask|=1n<<BigInt(slot);return;
      }
      // Keep clear lanes between blocks; old-scale pickups keep their positions.
      if(size>1&&Math.hypot(x,z)<6.5&&this.level===0&&this.originX===0n&&this.originZ===0n)return;
      if(this.level>0&&Math.hypot(x-player.x,z-player.z)<player.diameter*.65+size*.5)return;
      for(const old of this.legacy){if(old.collected)continue;const gap=(size+old.size)*.3;if(Math.abs(x-old.x)<gap&&Math.abs(z-old.z)<gap&&Math.hypot(x-old.x,z-old.z)<gap)return;}
      for(const other of chunk.items){const gap=size*footprint(type)+other.size*footprint(other.type)+.08;if(Math.abs(x-other.x)<gap&&Math.abs(z-other.z)<gap&&Math.hypot(x-other.x,z-other.z)<gap)return;}
      const name=info.name;
      const itemId=`${id}:${slot}`;
      chunk.items.push({id:itemId,type,name,x,z,size,collected:this.collectedIds.has(itemId)||Boolean(chunk.mask&(1n<<BigInt(slot))),visualSeed:hash(seed,slot),slot,owner:chunk});
    };
    for(let slot=0;slot<16;slot++){
      const gx=slot%4,gz=Math.floor(slot/4);
      const x=cx*CHUNK_SIZE+2.8+gx*4.1+(random()-.5)*.8,z=cz*CHUNK_SIZE+2.8+gz*4.1+(random()-.5)*.8;
      const themedLarge=themed.filter(type=>localSize(type,this.level)>=1.6);
      const type=select(random()<.55&&themedLarge.length?themedLarge:large);
      add(type,x,z,slot);
    }
    // Snack trails and mid-size props keep every fresh block useful for growth.
    for(let slot=16;slot<80;slot++){
      const x=cx*CHUNK_SIZE+1.8+random()*14.4,z=cz*CHUNK_SIZE+1.8+random()*14.4;
      add(select(random()<.25?medium:small),x,z,slot);
    }
    for(let slot=80;slot<96;slot++){const x=cx*CHUNK_SIZE+1.8+random()*14.4,z=cz*CHUNK_SIZE+1.8+random()*14.4;add(select(medium),x,z,slot);}
    chunk.items=reducePopulation(chunk.items);
    return chunk;
  }
  sync(player,radius){
    const cx=Math.floor(player.x/CHUNK_SIZE),cz=Math.floor(player.z/CHUNK_SIZE),stamp=`${this.level}:${cx}:${cz}:${radius}`;
    if(stamp===this.stamp)return;this.stamp=stamp;
    for(const[key,chunk]of this.chunks){if(Math.abs(chunk.cx-cx)>radius||Math.abs(chunk.cz-cz)>radius){this.remember(chunk);this.chunks.delete(key);}}
    for(const[id,chunk]of this.preloaded){if(Math.abs(chunk.cx-cx)>radius+1||Math.abs(chunk.cz-cz)>radius+1)this.preloaded.delete(id);}
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
      const key=`${x}:${z}`;if(!this.chunks.has(key)){const id=`${this.level}:${this.originX+BigInt(x)}:${this.originZ+BigInt(z)}`,cached=this.preloaded.get(id);if(cached){this.preloaded.delete(id);this.chunks.set(key,cached);}else this.chunks.set(key,this.generate(x,z,player));}
    }
    this.legacy=this.legacy.filter(item=>!item.collected&&(item.objectiveIndex!==undefined||Math.hypot(item.x-player.x,item.z-player.z)<Math.max(CHUNK_SIZE*(radius+1),player.visibleRadius||0)));
    this.items=[...this.legacy,...Array.from(this.chunks.values()).flatMap(chunk=>chunk.items)];
    this.prefetch(player,radius,cx,cz);
  }
  prefetch(player,radius,cx=Math.floor(player.x/CHUNK_SIZE),cz=Math.floor(player.z/CHUNK_SIZE)){
    if(typeof window==='undefined')return;
    const stamp=`${this.seed}:${this.level}:${this.originX}:${this.originZ}:${cx}:${cz}:${radius}`;if(stamp===this.prefetchStamp)return;
    this.prefetchStamp=stamp;const token=++this.prefetchToken,outer=radius+1,queue=[];
    for(let z=-outer;z<=outer;z++)for(let x=-outer;x<=outer;x++){
      if(Math.max(Math.abs(x),Math.abs(z))!==outer||this.chunks.has(`${cx+x}:${cz+z}`))continue;
      const wx=cx+x,wz=cz+z,id=`${this.level}:${this.originX+BigInt(wx)}:${this.originZ+BigInt(wz)}`;
      if(this.preloaded.has(id))continue;
      const length=Math.hypot(player.vx||0,player.vz||0)||1,heading=((x*(player.vx||0)+z*(player.vz||0))/length);
      queue.push({x:wx,z:wz,id,heading,distance:x*x+z*z});
    }
    queue.sort((a,b)=>b.heading-a.heading||a.distance-b.distance);this.prefetchQueue=queue;
    const snapshot={x:player.x,z:player.z,diameter:player.diameter,visibleRadius:player.visibleRadius,viewRadius:player.viewRadius};
    const work=deadline=>{
      if(token!==this.prefetchToken)return;let made=0;
      while(this.prefetchQueue.length&&made<2&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>3)){
        const next=this.prefetchQueue.shift();if(this.chunks.has(`${next.x}:${next.z}`)||this.preloaded.has(next.id))continue;
        this.preloaded.set(next.id,this.generate(next.x,next.z,snapshot));made++;
      }
      while(this.preloaded.size>64)this.preloaded.delete(this.preloaded.keys().next().value);
      if(this.prefetchQueue.length){if(window.requestIdleCallback)window.requestIdleCallback(work,{timeout:700});else window.setTimeout(()=>work(null),40);}
    };
    if(this.prefetchQueue.length){if(window.requestIdleCallback)window.requestIdleCallback(work,{timeout:700});else window.setTimeout(()=>work(null),40);}
  }
  invalidatePrefetch(){this.prefetchToken++;this.prefetchQueue=[];this.prefetchStamp='';this.preloaded.clear();}
  nearby(x,z,radius){
    const reach=radius+8,result=[];
    for(const chunk of this.chunks.values()){
      if(x+reach<chunk.cx*CHUNK_SIZE||x-reach>(chunk.cx+1)*CHUNK_SIZE||z+reach<chunk.cz*CHUNK_SIZE||z-reach>(chunk.cz+1)*CHUNK_SIZE)continue;
      result.push(...chunk.items);
    }
    for(const item of this.legacy){const itemReach=radius+item.size*footprint(item.type);if(Math.abs(item.x-x)<itemReach&&Math.abs(item.z-z)<itemReach)result.push(item);}
    return result;
  }
  collect(item){item.collected=true;this.collectedIds.add(item.id);if(item.owner)item.owner.mask|=1n<<BigInt(item.slot);}
  rebase(sx,sz){
    this.invalidatePrefetch();
    this.originX+=BigInt(sx);this.originZ+=BigInt(sz);
    const dx=sx*CHUNK_SIZE,dz=sz*CHUNK_SIZE;
    for(const item of this.items){item.x-=dx;item.z-=dz;}
    for(const guard of this.guards){guard.x-=dx;guard.z-=dz;}
    const moved=new Map();for(const chunk of this.chunks.values()){chunk.cx-=sx;chunk.cz-=sz;moved.set(`${chunk.cx}:${chunk.cz}`,chunk);}this.chunks=moved;this.stamp='';
    return{dx,dz};
  }
  rescale(player){
    this.invalidatePrefetch();
    const ox=floorHalf(this.originX),oz=floorHalf(this.originZ);
    const shiftX=Number(this.originX-2n*ox)*CHUNK_SIZE/2,shiftZ=Number(this.originZ-2n*oz)*CHUNK_SIZE/2;
    const retentionRadius=Math.max(player.visibleRadius||0,CHUNK_SIZE*(player.viewRadius+1));
    // Retain the entire visible population, not just the closest 512 objects.
    // Old tiny objects leave naturally as the player travels into fresh areas.
    this.legacy=this.items.filter(item=>!item.collected&&(item.objectiveIndex!==undefined||Math.hypot(item.x-player.x,item.z-player.z)<retentionRadius))
      .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
    const retainedVisible=this.legacy.filter(item=>item.objectiveIndex!==undefined||Math.hypot(item.x-player.x,item.z-player.z)<(player.visibleRadius||0));
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
  district(x,z){const biome=this.chunks.get(`${Math.floor(x/CHUNK_SIZE)}:${Math.floor(z/CHUNK_SIZE)}`)?.biome??0;const districts=this.level>=8?['Mountain Pass','Island Coast','Island Chain','Highland Valley']:this.level>=4?['Landmark Park','Town Square','City Center','Castle Grounds']:this.level>=1?['Giant Oaks','Market District','Town Center','Windmill Fields']:DISTRICTS;return districts[biome];}
}

export class Simulation{
  constructor(){this.artRatios=[];this.reset('campaign');this.mode='menu';}
  get items(){return this.world.items;}
  get level(){return this.world.level;}
  reset(runMode='campaign'){
    this.contact?.dispose();
    this.world?.invalidatePrefetch();
    this.runMode=runMode==='quick'||runMode===false?'quick':'campaign';this.free=false;this.world=new ProceduralWorld(newSeed());this.body=new CompoundBall();
    if(this.runMode==='campaign')this.world.installObjectives();
    this.x=0;this.z=0;this.vx=0;this.vz=0;this.diameter=.32;this.volume=.32**3;this.elapsed=0;this.count=0;this.mode='playing';this.milestone=0;this.scaleStage=0;this.won=false;this.combo=0;this.bestCombo=0;this.lastPickup=-100;this.nextGoal=0;this.viewRadius=2;this.visibleRadius=18;
    this.chapter=0;this.capturedObjectives=new Set();this.score=0;this.chapterStarted=0;this.chapterStats=[];this.boostEnergy=100;this.boostExhausted=false;this.timeLimit=this.runMode==='campaign'?CAMPAIGN_START_SECONDS:ROUND_SECONDS;this.world.sync(this,this.viewRadius);this.contact=this.Contact?new this.Contact(this.body,this.x,this.z):null;
  }
  setContact(Contact){this.Contact=Contact;this.contact?.dispose();this.contact=new Contact(this.body,this.x,this.z);}
  setArtRatios(ratios){this.artRatios=ratios;}
  setViewRadius(radius){this.viewRadius=Math.max(2,Math.min(4,radius));}
  setVisibleRadius(radius){this.visibleRadius=radius;}
  step(dt,input){
    if(this.mode!=='playing')return {pickups:[],distance:0,transform:{scale:1,x:0,z:0}};
    this.elapsed+=dt;
    if(this.boostEnergy<2)this.boostExhausted=true;if(this.boostEnergy>=30)this.boostExhausted=false;
    const boosting=Boolean(input.boost)&&!this.boostExhausted;
    this.boostEnergy=Math.max(0,Math.min(100,this.boostEnergy+dt*(boosting?-24:17)));
    const speed=(1.7+Math.sqrt(this.diameter)*1.5)*(boosting?1.7:1)*(1-this.body.impact*.24);
    const smoothing=1-Math.exp(-dt*9);
    this.vx+=(input.x*speed-this.vx)*smoothing;this.vz+=(input.z*speed-this.vz)*smoothing;
    const oldX=this.x,oldZ=this.z;
    this.world.sync(this,this.viewRadius);
    const pickups=[],nearby=this.world.nearby(this.x,this.z,Math.max(this.diameter*.5,this.body.boundRadius));
    const substeps=Math.min(10,Math.max(1,Math.ceil(Math.hypot(this.vx,this.vz)*dt/Math.max(.06,this.diameter*.16))));
    for(let step=0;step<substeps;step++){
      const beforeX=this.x,beforeZ=this.z;
      this.x+=this.vx*dt/substeps;this.z+=this.vz*dt/substeps;
      for(let pass=0;pass<2;pass++)for(const item of nearby){
        // A short pickup cadence keeps the next size band readable and stops
        // a dense patch from consuming an entire progression in one frame.
        if(pickups.length>=3)break;
        if(item.collected)continue;
        const dx=this.x-item.x,dz=this.z-item.z,dist=Math.hypot(dx,dz),itemRadius=item.size*footprint(item.type);
        if(dist>=this.body.boundRadius+itemRadius)continue;
        const reach=this.body.supportWorld(dist>.00001?-dx/dist:-1,0,dist>.00001?-dz/dist:0)+itemRadius;
        if(dist>=reach)continue;
        if(item.size*1.08<=this.diameter){
          this.world.collect(item);this.count++;this.volume+=item.size**3*.82;this.boostEnergy=Math.min(100,this.boostEnergy+7);
          this.body.attach(item,TYPES[item.type],this.artRatios[TYPES[item.type].art]||1,this.x,this.z,this.diameter);
          // Progression is mass based. The visible heap can protrude and bump,
          // while pickup eligibility advances one material band at a time.
          const materialDiameter=Math.max(.32,Math.cbrt(this.volume));
          // Early growth is deliberately legible. A single pickup can add
          // mass, but it cannot skip an entire size band or reveal a landmark
          // before the player has earned the intervening trail.
          const growthStep=this.diameter<1?.035:this.diameter<4?.09:this.diameter<12?.18:this.diameter*.1;
          this.diameter=Math.max(this.diameter,Math.min(materialDiameter,this.diameter+growthStep));
          pickups.push({...item,owner:null,sizeLevel:this.level});
          this.combo=this.elapsed-this.lastPickup<1.5?this.combo+1:1;this.lastPickup=this.elapsed;
          this.bestCombo=Math.max(this.bestCombo,this.combo);const multiplier=Math.min(5,1+Math.floor(this.combo/4));
          this.score+=Math.round((10+Math.min(2500,item.size*2**this.level)*8)*multiplier);
          if(item.objectiveIndex!==undefined)this.capturedObjectives.add(item.objectiveIndex);
        }else{
          const nx=dist>.00001?dx/dist:1,nz=dist>.00001?dz/dist:0,overlap=reach-dist+.001;
          this.x+=nx*overlap;this.z+=nz*overlap;
          const dot=this.vx*nx+this.vz*nz;if(dot<0){this.vx-=dot*nx;this.vz-=dot*nz;}
        }
      }
      if(this.contact){const pose=this.contact.step(dt/substeps,this.body,this.x,this.z,this.x-beforeX,this.z-beforeZ);this.x=pose.x;this.z=pose.z;}else this.body.advance(this.x-beforeX,this.z-beforeZ,dt/substeps);
    }
    let dx=this.x-oldX,dz=this.z-oldZ;
    const transform={scale:1,x:0,z:0};
    let milestone=null;
    const stages=[.65,1.2,2.2,3.8];
    while(this.milestone<stages.length&&this.diameter>=stages[this.milestone]){milestone=this.milestone++;}
    if(this.nextGoal===0&&Math.log2(this.diameter)+this.level>=Math.log2(GOAL)){milestone=4;this.nextGoal=1;}
    let unlock=null;
    if(this.scaleStage<SCALE_STAGES.length-1&&Math.log2(this.diameter)+this.level>=Math.log2(SCALE_STAGES[this.scaleStage+1].size)){this.scaleStage++;unlock=SCALE_STAGES[this.scaleStage].message;}
    let checkpoint=null;
    if(this.runMode==='campaign'){
      if(this.chapter<CHAPTERS.length){
        const goal=CHAPTERS[this.chapter],largeEnough=Math.log2(this.diameter)+this.level>=Math.log2(goal.size);
        const ready=largeEnough&&this.count>=goal.count&&(goal.type===null||this.capturedObjectives.has(this.chapter));
        if(ready){
          const finished=this.chapter;this.chapterStats.push({name:goal.name,seconds:Math.round(this.elapsed-this.chapterStarted),count:this.count,size:formatSize(this.diameter,this.level)});this.chapterStarted=this.elapsed;this.chapter++;this.score+=1500*this.chapter;
          if(this.chapter===CHAPTERS.length){this.won=true;this.mode='result';this.score+=Math.max(0,Math.ceil(this.timeLimit-this.elapsed))*50;checkpoint='THE WHOLE ISLAND. WHAT A MONSTROSITY!';}
          else {this.timeLimit=Math.min(CAMPAIGN_MAX_SECONDS,this.timeLimit+CHAPTER_BONUS_SECONDS);checkpoint=`${CHAPTERS[finished].name} complete! +60 seconds`;}
        }
      }
    }else if(this.nextGoal>0){this.won=true;this.mode='result';}
    if(this.mode==='playing'&&this.elapsed>=this.timeLimit){this.won=false;this.mode='result';}
    // Normalize the simulation as size grows; numbers and camera precision stay
    // small throughout the finite island campaign.
    while(this.diameter>=8){
      const offset=this.world.rescale(this);this.x=this.x/2+offset.shiftX;this.z=this.z/2+offset.shiftZ;this.vx/=2;this.vz/=2;this.diameter/=2;this.volume/=8;this.visibleRadius/=2;this.body.rescale(.5);
      dx/=2;dz/=2;transform.scale/=2;transform.x=transform.x/2+offset.shiftX;transform.z=transform.z/2+offset.shiftZ;
    }
    // Steer the seed inside the coast. Long appendages may overhang the shore;
    // the whole outer radius must not block access to the final island target.
    const half=MAP_HALF_METERS*2**(-this.level),margin=Math.min(this.body.coreRadius,half*.05),ox=Number(this.world.originX)*CHUNK_SIZE,oz=Number(this.world.originZ)*CHUNK_SIZE;
    this.x=Math.max(-half+margin-ox,Math.min(half-margin-ox,this.x));this.z=Math.max(-half+margin-oz,Math.min(half-margin-oz,this.z));
    if(Math.abs(this.x)>CHUNK_SIZE*64||Math.abs(this.z)>CHUNK_SIZE*64){
      const shift=this.world.rebase(Math.floor(this.x/CHUNK_SIZE),Math.floor(this.z/CHUNK_SIZE));this.x-=shift.dx;this.z-=shift.dz;transform.x-=shift.dx;transform.z-=shift.dz;
    }
    this.world.sync(this,this.viewRadius);
    return{pickups,distance:Math.hypot(dx,dz),dx,dz,milestone,unlock,checkpoint,transform};
  }
  scaleLabel(){return SCALE_STAGES[this.scaleStage].label;}
  chapterGoal(){return CHAPTERS[Math.min(this.chapter,CHAPTERS.length-1)];}
  objective(){return this.world.legacy.find(item=>!item.collected&&item.objectiveIndex===this.chapter);}
  progress(){if(this.mode==='result'&&this.won)return 1;const goal=this.runMode==='quick'?GOAL:this.chapterGoal().size,ratio=Math.max(0,Math.min(1,this.diameter*2**this.level/goal));if(this.runMode==='quick')return ratio;const chapter=this.chapterGoal(),values=[ratio,Math.min(1,this.count/chapter.count)];if(chapter.type!==null)values.push(this.capturedObjectives.has(this.chapter)?1:0);return values.reduce((sum,v)=>sum+v,0)/values.length;}
  nextGoalSize(){return formatSize(this.runMode==='quick'?GOAL:this.chapterGoal().size);}
  snapshot(){return{mode:this.mode,runMode:this.runMode,map:'Sunny Side Island',chapter:Math.min(this.chapter+1,CHAPTERS.length),chapters:CHAPTERS.length,objective:this.chapterGoal().hint,size:formatSize(this.diameter,this.level),normalizedDiameter:this.diameter,scaleExponent:this.level,collected:this.count,attachedPieces:this.body.pieces.length,score:this.score,bestCombo:this.bestCombo,nearbyRemaining:this.items.filter(i=>!i.collected).length,loadedBlocks:this.world.chunks.size,seed:this.world.seed,secondsRemaining:Math.max(0,Math.ceil(this.timeLimit-this.elapsed)),freeRoll:false,goalMeters:this.runMode==='quick'?GOAL:this.chapterGoal().size};}
}
export function sizeParts(d,level=0){
  const exponent=Math.log10(d)+level*Math.log10(2);
  if(exponent<0)return{value:String(Math.round(d*2**level*100)),unit:'cm'};
  if(exponent<3)return{value:(d*2**level).toFixed(exponent<1?2:1),unit:'m'};
  if(exponent<6)return{value:(d*2**level/1000).toFixed(exponent<4?2:1),unit:'km'};
  const power=Math.floor(exponent)-3;return{value:`${(10**(exponent-Math.floor(exponent))).toFixed(1)}e${power}`,unit:'km'};
}
export function formatSize(d,level=0){const size=sizeParts(d,level);return`${size.value} ${size.unit}`;}
