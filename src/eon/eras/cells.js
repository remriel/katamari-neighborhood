import {EraModule} from './base.js';
import {clamp,distance} from '../config.js';
export class CellsEra extends EraModule{
  constructor(campaign){
    super('cells',campaign);Object.assign(this.state,{energy:90,stocks:[0,0,0],symbionts:[],cycles:0,metabolism:0,gate:false,plume:0,hitTimer:0});
    for(let kind=0;kind<3;kind++)for(let i=0;i<16;i++){const angle=i*.82+kind*2.1,r=9+(i%6)*4.5;this.entity(`nutrient-${kind}-${i}`,kind,Math.cos(angle)*r,Math.sin(angle)*r*(this.variant?.85:1),{size:1.05,phase:angle});}
    const positions=this.variant?[[-25,18],[25,12],[0,-29]]:[[-25,-16],[26,-8],[14,26]];
    for(let i=0;i<3;i++)this.entity('partner-'+i,i+3,...positions[i],{size:2.2,role:'partner'});
    for(let i=0;i<12;i++)this.entity('toxin-'+i,6,Math.cos(i)*20,Math.sin(i)*28,{size:1.7,phase:i,role:'toxin'});
    this.entity('plume-exit',8,this.variant?29:-29,29,{size:3,role:'exit'});
  }
  get actions(){return[{id:'gate',label:this.state.gate?'Seal membrane':'Open membrane',key:'Space',hint:'Open to ingest; close to keep toxins out'},{id:'purge',label:'Purge / burst',key:'KeyE',hint:'Push toxins back and cross the current'}];}
  action(id){if(id==='gate')this.state.gate=!this.state.gate;if(id==='purge'&&this.state.abilityCooldown<=0&&this.state.energy>10){this.state.energy-=10;this.state.abilityCooldown=this.mods.burst?3:5;for(const e of this.entities.filter(e=>e.role==='toxin')){const d=distance(e,this.state);if(d<12){e.x+=(e.x-this.state.x)/Math.max(1,d)*7;e.z+=(e.z-this.state.z)/Math.max(1,d)*7;}}this.state.vx*=2;this.state.vz*=2;}}
  update(dt,input){
    this.tick(dt);this.move(dt,input,6);this.state.x=clamp(this.state.x+Math.sin(this.state.z*.1+this.state.time*.13)*dt*1.5,-45,45);this.state.z=clamp(this.state.z+Math.cos(this.state.x*.13)*dt*.8,-40,40);
    this.state.energy=Math.max(0,this.state.energy-dt*(.07+Math.hypot(this.state.vx,this.state.vz)*.012+(this.state.gate?.10:0)));this.state.hitTimer=Math.max(0,this.state.hitTimer-dt);
    for(const e of this.entities){
      if(this.campaign.has(e.id))continue;const d=distance(e,this.state);
      if(e.kind<3&&d<2.5&&this.state.gate&&this.collect(e)){this.state.stocks[e.kind]+=4*this.mods.yield;if(e.kind===0)this.state.energy=clamp(this.state.energy+20*this.mods.yield,0,100);if(e.kind===1)this.state.health=clamp(this.state.health+10,0,100);}
      if(e.role==='partner'&&d<3&&this.state.gate&&this.collect(e)){this.state.symbionts.push(e.kind);this.checkpoint(e.name+' joined your membrane.');}
      if(e.role==='toxin'){e.x+=Math.sin(this.state.time*.2+e.phase)*dt*.4;e.z+=Math.cos(this.state.time*.17+e.phase)*dt*.3;if(d<2.5&&this.state.hitTimer<=0){this.damage(this.state.gate?25:8);this.state.energy=Math.max(0,this.state.energy-(this.state.gate?8:2));this.state.hitTimer=2;}}
    }
    this.state.metabolism+=dt;
    if(this.state.cycles<3&&this.state.stocks.every(n=>n>=8)&&this.state.metabolism>=25){this.state.stocks=this.state.stocks.map(n=>n-8);this.state.metabolism=0;this.state.cycles++;this.collect({id:'metabolism-'+this.state.cycles,kind:7,name:'Living membrane cycle '+this.state.cycles,role:'membrane',size:1.8});this.checkpoint('A metabolic cycle completed. Matter became part of your living structure.');}
    if(this.mods.cooperate&&this.state.symbionts.length)this.state.energy=clamp(this.state.energy+dt*.13*this.state.symbionts.length,0,100);
    if(this.state.energy<=0)this.campaign.recovery(this,'Your cell rested at its checkpoint. Its collected history survived.');
    if(this.state.cycles>=3&&this.state.symbionts.length>=3){this.state.stage=2;const exit=this.entities.find(e=>e.role==='exit');if(distance(exit,this.state)<5&&this.state.energy>20)this.state.plume+=dt;else this.state.plume=Math.max(0,this.state.plume-dt*.1);if(this.state.plume>=45)this.finish();}
  }
  recover(){super.recover();this.state.energy=80;this.state.gate=false;this.state.hitTimer=4;this.state.plume=0;this.state.stocks=this.state.stocks.map(n=>Math.max(n,8));}
  get objective(){return this.state.stage===2?`Cross the hostile plume to the ancestral spark. Maintain energy above 20: ${Math.floor(this.state.plume)}/45 s.`:`Complete ${this.state.cycles}/3 metabolic cycles and recruit ${this.state.symbionts.length}/3 partners. Each cycle uses 8 energy, lipid, and protein units.`;}
  get progress(){return(this.state.cycles/3+this.state.symbionts.length/3+this.state.plume/45)/3;}
  get resource(){return{label:`Energy · E ${Math.floor(this.state.stocks[0])} / L ${Math.floor(this.state.stocks[1])} / P ${Math.floor(this.state.stocks[2])}`,value:Math.round(this.state.energy),max:100};}
  get viewConfig(){return{...super.viewConfig,span:31,playerKind:7,mode:'move',gate:this.state.gate,goal:this.state.stage===2?this.entities.find(e=>e.role==='exit'):null,hazards:this.entities.filter(e=>e.role==='toxin')};}
}
