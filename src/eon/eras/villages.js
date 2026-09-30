import {EraModule} from './base.js';
import {clamp,distance} from '../config.js';
const COSTS={farm:{timber:3},granary:{timber:4,stone:1},home:{timber:2,stone:1},workshop:{timber:4,stone:2},bridge:{timber:6,stone:3},well:{stone:4}};
const KINDS={farm:0,granary:1,home:2,workshop:3,bridge:6,well:7};
export class VillagesEra extends EraModule{
  constructor(campaign){
    super('villages',campaign);Object.assign(this.state,{food:20,timber:12,stone:6,buildings:[{slot:8,type:'farm'},{slot:9,type:'home'}],destination:null,route:[],selected:'home',visited:{},production:0,supplied:0,crossing:0,stability:100,steady:0});
    const layout=this.variant?[[-26,-18],[25,-22],[-22,24]]:[[25,12],[-28,22],[12,-25]];
    this.entity('forest',5,...layout[0],{size:5,role:'forest',interactive:true});this.entity('quarry',4,...layout[1],{size:5,role:'quarry',interactive:true});this.entity('fields',0,...layout[2],{size:5,role:'fields',interactive:true});this.entity('crossing',6,36,31,{size:5,role:'crossing',interactive:true});
    this.slots=Array.from({length:24},(_,i)=>({id:i,x:(i%6-2.5)*2.3,z:(Math.floor(i/6)-1.5)*2.3}));
  }
  get actions(){return this.state.stage>=2?[{id:'steady',label:'Steady the raft',key:'Space',hint:'Counter the river surge'},{id:'cross',label:'Cross the river',key:'KeyE',hint:'Set course for the final crossing'}]:[{id:'farm',label:'Farm · 3 wood',build:true},{id:'granary',label:'Granary · 4 wood / 1 stone',build:true},{id:'home',label:'Home · 2 wood / 1 stone',build:true},{id:'workshop',label:'Workshop · 4 wood / 2 stone',build:true},{id:'bridge',label:'Bridge · 6 wood / 3 stone',build:true},{id:'well',label:'Well · 4 stone',build:true}];}
  action(id){if(id==='steady'){this.state.steady=2;return;}if(id==='cross'){this.select('crossing');return;}if(COSTS[id])this.state.selected=id;}
  select(id){const entity=this.entities.find(e=>e.id===id);if(!entity)return;if(entity.role==='crossing'&&this.state.stage<2){this.campaign.emit({type:'feedback',message:'Prepare three supply chains, eight homes, and crossing supplies first.'});return;}this.state.destination=entity.id;}
  build(type,slotId){
    if(!COSTS[type]||!this.slots[slotId]||this.state.buildings.some(b=>b.slot===slotId))return;
    if(Object.entries(COSTS[type]).some(([resource,cost])=>this.state[resource]<cost)){this.campaign.emit({type:'feedback',message:'Visit the forest or quarry for the missing building materials.'});return;}
    for(const[resource,cost]of Object.entries(COSTS[type]))this.state[resource]-=cost;
    this.state.buildings.push({type,slot:slotId});const slot=this.slots[slotId];this.collect({id:'building-'+slotId,kind:KINDS[type],name:this.meta.names[KINDS[type]],role:type,size:2},{position:[slot.x,1.5,slot.z],rotation:[0,0,0,1],fixed:true});this.checkpoint(type+' joined the village. Adjacent buildings share supplies.');
  }
  chains(){
    const buildings=this.state.buildings,seen=new Set(),groups=[];
    for(const b of buildings){if(seen.has(b.slot))continue;const group=[],queue=[b];seen.add(b.slot);while(queue.length){const current=queue.shift();group.push(current);for(const other of buildings){if(!seen.has(other.slot)&&distance(this.slots[current.slot],this.slots[other.slot])<2.6){seen.add(other.slot);queue.push(other);}}}groups.push(group);}
    const types=groups.map(group=>new Set(group.map(b=>b.type)));
    return[types.some(t=>t.has('farm')&&t.has('granary')&&t.has('home')),types.some(t=>t.has('workshop')&&t.has('bridge'))&&(this.state.visited.forest||0)>0,types.some(t=>t.has('workshop')&&t.has('well'))&&(this.state.visited.quarry||0)>0];
  }
  update(dt){
    this.tick(dt);this.state.steady=Math.max(0,this.state.steady-dt);
    const destination=this.entities.find(e=>e.id===this.state.destination);
    if(destination){const d=distance(destination,this.state),speed=6*this.mods.mobility;if(d>1){this.state.vx=(destination.x-this.state.x)/d*speed;this.state.vz=(destination.z-this.state.z)/d*speed;this.state.x+=this.state.vx*dt;this.state.z+=this.state.vz*dt;}else{
      this.state.vx=this.state.vz=0;if(destination.role!=='crossing'){const visits=this.state.visited[destination.role]||0;this.state.visited[destination.role]=visits+1;
        const resource=destination.role==='forest'?'timber':destination.role==='quarry'?'stone':'food',amount=resource==='timber'?14:resource==='stone'?10:16;
        this.state[resource]+=amount*this.mods.yield;this.collect({id:`resource-${destination.id}-${visits}`,kind:destination.kind,name:destination.name+' supplies',role:resource,size:1.1});this.state.destination=null;this.checkpoint(destination.name+' supplies loaded.');}
    }}else this.state.vx=this.state.vz=0;
    const farms=this.state.buildings.filter(b=>b.type==='farm').length,homes=this.state.buildings.filter(b=>b.type==='home').length;
    this.state.food=clamp(this.state.food+dt*(farms*.34*this.mods.yield-homes*.02),0,99);this.state.production+=dt;
    if(this.state.food<=0){this.damage(dt*4,'The village rested at a safe stop with emergency food. Every building remained attached.');}else this.state.health=clamp(this.state.health+dt*.3,0,100);
    const chains=this.chains();
    if(this.state.stage===0&&chains.every(Boolean)){this.state.stage=1;this.checkpoint('Three supply chains work. Support eight homes for one full season.');}
    if(this.state.stage===1){if(homes>=8&&this.state.food>=8)this.state.supplied+=dt;else this.state.supplied=Math.max(0,this.state.supplied-dt*.15);if(this.state.supplied>=60&&this.state.timber>=6&&this.state.stone>=4){this.state.stage=2;this.checkpoint('Your village is supplied. Cross the river together.');}}
    if(this.state.stage===2&&distance(this.state,this.entities.find(e=>e.role==='crossing'))<6){
      const surge=(Math.sin(this.state.time*.85)+Math.sin(this.state.time*1.37))*.5;
      this.state.stability=clamp(this.state.stability+dt*(this.state.steady>0?12:3-7*Math.abs(surge)/this.mods.tolerance),0,100);
      if(this.state.stability<=0){this.campaign.recovery(this,'The river attempt restarted. Your whole village and its supplies stayed together.');}
      else this.state.crossing+=dt;if(this.state.crossing>=60)this.finish();
    }
  }
  recover(){super.recover();this.state.food=Math.max(12,this.state.food);this.state.timber=Math.max(6,this.state.timber);this.state.stone=Math.max(4,this.state.stone);this.state.crossing=0;this.state.stability=100;this.state.destination=null;}
  get objective(){const chains=this.chains(),homes=this.state.buildings.filter(b=>b.type==='home').length;return this.state.stage===0?`Build connected food, timber, and stone chains: ${chains.filter(Boolean).length}/3. Drag buildings onto neighboring plots; tap resource destinations to travel.`:this.state.stage===1?`Support ${homes}/8 homes with food for ${Math.floor(this.state.supplied)}/60 s. Keep 6 timber and 4 stone for the crossing.`:`Bring everyone across the river: ${Math.floor(this.state.crossing)}/60 s. Use Steady when the surge threatens your raft.`;}
  get progress(){return(this.state.stage+(this.state.stage===0?this.chains().filter(Boolean).length/3:this.state.stage===1?this.state.supplied/60:this.state.crossing/60))/3;}
  get resource(){return{label:`Food ${Math.floor(this.state.food)} · Timber ${Math.floor(this.state.timber)} · Stone ${Math.floor(this.state.stone)}`,value:Math.round(this.state.stage===2?this.state.stability:this.state.health),max:100};}
  get viewConfig(){return{...super.viewConfig,camera:'settlement',span:43,playerKind:8,mode:'route',slots:this.slots,buildings:this.state.buildings,links:this.state.buildings.flatMap((b,i)=>this.state.buildings.slice(i+1).filter(other=>distance(this.slots[b.slot],this.slots[other.slot])<2.6).map(other=>({a:this.slots[b.slot],b:this.slots[other.slot],local:true}))),goal:this.entities.find(e=>e.id===this.state.destination)};}
}
