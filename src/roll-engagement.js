const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const CHAIN_WINDOW=2.2,CHAIN_BANK=4.2,CHAIN_GRACE=.9;
export function chainMultiplier(count){return Math.min(5,1+Math.floor(count/4));}
export class RollChain{
  constructor(){this.count=0;this.best=0;this.remaining=0;this.last=-100;this.milestones=new Set();}
  step(dt){
    if(!this.count)return;
    this.remaining-=dt;
    if(this.remaining<=-CHAIN_GRACE){this.count=0;this.remaining=0;this.milestones.clear();}
  }
  pickup(time){
    this.remaining=Math.min(CHAIN_BANK,Math.max(CHAIN_WINDOW,this.remaining+(time-this.last<.6?.45:.15)));
    this.last=time;this.count++;this.best=Math.max(this.best,this.count);
    const threshold=[10,25,50,100,250,500,1000].find(n=>this.count>=n&&!this.milestones.has(n));
    if(threshold)this.milestones.add(threshold);
    return threshold;
  }
  get fade(){return this.remaining>=0?1:clamp(1+this.remaining/CHAIN_GRACE,0,1);}
  get multiplier(){return Math.max(1,Math.ceil(chainMultiplier(this.count)*this.fade));}
  get charge(){return this.count?clamp((this.remaining+CHAIN_GRACE)/(CHAIN_BANK+CHAIN_GRACE),0,1):0;}
}
const family=type=>type<6||[18,19,20,21].includes(type)?'Treats':
  [6,14,29,30,46].includes(type)?'Vehicles':[8,23,52,53].includes(type)?'Neighbors & creatures':
  [12,16,31,50,51,64].includes(type)?'Garden':type>=54&&type<=61||type===67?'Beach finds':
  [15,32,37,39,48].includes(type)?'Buildings':'Street treasures';
const SIZE_MOMENTS=[
  [.5,'Half a meter. Keep feeding it!'],[1.124,'Cats are on the menu.'],[3.37,'Vans are yours now.'],
  [4.968,'You can take the convertible!'],[5.508,'Houses are food now.'],[9.72,'Buses. Whole buses.'],
  [23.76,'Apartment buildings are yours.'],[51.84,'Take the Ferris wheel!'],[102.6,'Castles and resorts are food.'],
  [280.8,'The skyline is yours.'],[540,'Cliffs are rolling-sized.'],[972,'You can move a mountain!'],[2376,'The island is within reach.'],
];
export class RollEngagement{
  constructor(diagnostics=false){
    this.chain=new RollChain();this.diagnostics=diagnostics;this.events=[];this.celebrated=new Set();this.families=new Map();this.districts=new Set();this.memories=new Map();
    this.nextNotice=0;this.nextObserve=0;this.prize=null;this.lastGrowthAt=0;this.lastGrowthSize=.32;this.nextSpurt=12;
    this.metrics={firstPickup:null,firstHalfMeter:null,gaps:[],deadStretches:[],dashSeconds:0,distanceMeters:0,failedContacts:0};this.lastCollectedAt=0;this.contactTimes=new Map();
    this.accomplishments=[];
  }
  offer(key,text,time,priority=1){
    if(this.celebrated.has(key))return;this.celebrated.add(key);
    this.events.push({key,text,time,priority});if(this.events.length>8)this.events.shift();
    if(priority>=2){this.accomplishments.push(text);if(this.accomplishments.length>12)this.accomplishments.shift();}
  }
  notice(time){
    this.events=this.events.filter(e=>time-e.time<7);
    if(time<this.nextNotice||!this.events.length)return null;
    this.events.sort((a,b)=>b.priority-a.priority);const event=this.events.shift();this.events=[];this.nextNotice=time+5;return event;
  }
  collect(item,sim){
    const time=sim.elapsed,threshold=this.chain.pickup(time);
    if(threshold)this.offer('chain:'+threshold,threshold+' in a row! Keep rolling.',time,2);
    for(const count of [20,50,100,250,500,1000])if(sim.count===count)this.offer('count:'+count,count+' things in your magnificent heap.',time);
    const category=family(item.type),count=(this.families.get(category)||0)+1;this.families.set(category,count);
    if(count===12)this.offer('family:'+category,category+' sweep · 12 collected',time,2);
    if(this.diagnostics){
      this.metrics.firstPickup??=time;const gap=time-this.lastCollectedAt;this.metrics.gaps.push(gap);if(this.metrics.gaps.length>4096)this.metrics.gaps.shift();
      if(gap>8){this.metrics.deadStretches.push({at:this.lastCollectedAt,seconds:gap});if(this.metrics.deadStretches.length>32)this.metrics.deadStretches.shift();}
    }
    this.lastCollectedAt=time;
  }
  step(sim,dt,boosting,distanceMeters){
    const meters=sim.diameter*2**sim.level;
    if(this.diagnostics){this.metrics.dashSeconds+=boosting?dt:0;this.metrics.distanceMeters+=distanceMeters;if(meters>=.5)this.metrics.firstHalfMeter??=sim.elapsed;}
    for(const [size,text] of SIZE_MOMENTS)if(meters>=size)this.offer('size:'+size,text,sim.elapsed,3);
    const district=sim.world.district(sim.x,sim.z);
    if(!this.districts.has(district)){this.districts.add(district);if(sim.elapsed>5)this.offer('district:'+district,'Now rolling through '+district,sim.elapsed);}
    if(sim.elapsed-this.lastGrowthAt>=8){
      if(meters/this.lastGrowthSize>=1.3&&sim.elapsed>=this.nextSpurt){this.offer('spurt:'+Math.floor(sim.elapsed/30),'Growth spurt · '+Math.round((meters/this.lastGrowthSize-1)*100)+'% bigger',sim.elapsed,2);this.nextSpurt=sim.elapsed+30;}
      this.lastGrowthSize=meters;this.lastGrowthAt=sim.elapsed;
    }
    if(sim.elapsed>=this.nextObserve){this.nextObserve=sim.elapsed+.3;this.observe(sim);}
  }
  observe(sim){
    const physical=2**sim.level,ox=Number(sim.world.originX)*18,oz=Number(sim.world.originZ)*18;
    const radius=Math.min(sim.visibleRadius*.55,Math.max(sim.diameter*2.5,3/physical));
    const items=sim.world.nearby(sim.x,sim.z,radius).filter(i=>!i.collected&&!i.powerup&&i.size*1.08>sim.diameter&&i.size*1.08<sim.diameter*1.6);
    items.sort((a,b)=>Math.hypot(a.x-sim.x,a.z-sim.z)-Math.hypot(b.x-sim.x,b.z-sim.z));
    for(const item of items.slice(0,3)){
      this.memories.delete(item.id);this.memories.set(item.id,{id:item.id,type:item.type,name:item.name,size:item.size*physical,x:(item.x+ox)*physical,z:(item.z+oz)*physical,seen:sim.elapsed,blocked:true});
    }
    while(this.memories.size>6)this.memories.delete(this.memories.keys().next().value);
    let ready=null;
    for(const [id,item] of this.memories){
      if(sim.world.collectedIds.has(id)||sim.elapsed-item.seen>25){this.memories.delete(id);continue;}
      const distance=Math.hypot(item.x/physical-ox-sim.x,item.z/physical-oz-sim.z);
      if(item.blocked&&item.size*1.08<=sim.diameter*physical){
        item.blocked=false;if(distance<sim.visibleRadius){this.offer('ready:'+id,'You can get that '+(item.name||'prize')+' now!',sim.elapsed,4);ready=item;}
      }
    }
    const current=this.prize&&this.memories.get(this.prize.id);
    this.prize=(ready||current&&!current.blocked&&sim.elapsed-current.seen<12)?ready||current:items[0]?this.memories.get(items[0].id):null;
  }
  failedContact(item,time){
    if(!this.diagnostics)return;
    if(time-(this.contactTimes.get(item.id)??-10)>1){this.metrics.failedContacts++;this.contactTimes.set(item.id,time);}
    if(this.contactTimes.size>64)this.contactTimes.delete(this.contactTimes.keys().next().value);
  }
  report(sim){
    const gaps=[...this.metrics.gaps].sort((a,b)=>a-b);
    return {...this.metrics,gaps:undefined,currentDeadStretch:sim.elapsed-this.lastCollectedAt,averagePickupGap:gaps.reduce((a,b)=>a+b,0)/(gaps.length||1),p95PickupGap:gaps[Math.floor(gaps.length*.95)]??null,
      largestCombo:this.chain.best,pickupsPerMinute:sim.count/Math.max(1,sim.elapsed)*60,stages:sim.chapterStats,accomplishments:this.accomplishments};
  }
}
