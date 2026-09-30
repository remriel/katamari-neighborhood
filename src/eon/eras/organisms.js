import {EraModule} from './base.js';
import {clamp,distance} from '../config.js';
const HABITATS=[{name:'Shallow water',needed:['swim','armor','flora'],kinds:[0,1,4],count:8},{name:'Living land',needed:['land','flora','ally'],kinds:[2,4,7],count:10},{name:'Cold frontier',needed:['insulation','cold','ally'],kinds:[3,5,7],count:12}];
export class OrganismsEra extends EraModule{
  constructor(campaign){
    super('organisms',campaign);Object.assign(this.state,{habitat:0,recruited:[],habitatCounts:[0,0,0],dash:0,latch:false,migration:0,hitTimer:0});
    for(let habitat=0;habitat<3;habitat++)for(let i=0;i<18;i++){const angle=i*2.3999,r=5+(i%5)*2.9,cx=(habitat-1)*25,cz=this.variant?(habitat%2?18:-14):0,kind=HABITATS[habitat].kinds[i%3];this.entity(`life-${habitat}-${i}`,kind,cx+Math.cos(angle)*r,cz+Math.sin(angle)*r,{size:1+(i%3)*.35,habitat});}
    for(let i=0;i<4;i++)this.entity('predator-'+i,6,(i-1.5)*19,this.variant?-18:18,{size:4.4,role:'predator',originX:(i-1.5)*19,originZ:this.variant?-18:18,phase:i});
    this.entity('migration-exit',8,38,31,{size:4,role:'exit'});
  }
  get actions(){return[{id:'dash',label:'Dash',key:'Space',hint:'Evade a pursuing predator'},{id:'latch',label:this.state.latch?'Release latch':'Latch allies',key:'KeyE',hint:'Hold compatible life close to your ecosystem'}];}
  action(id){if(id==='latch')this.state.latch=!this.state.latch;if(id==='dash'&&this.state.abilityCooldown<=0){this.state.dash=.9;this.state.abilityCooldown=this.mods.burst?2.4:4;}}
  update(dt,input){
    this.tick(dt);this.state.dash=Math.max(0,this.state.dash-dt);this.state.hitTimer=Math.max(0,this.state.hitTimer-dt);this.move(dt,input,(this.state.dash>0?14:6.5)*(this.state.habitat===2?.9:1));
    const habitat=HABITATS[this.state.habitat];
    for(const e of this.entities){
      if(e.role==='predator'){
        const d=distance(e,this.state),distracted=this.mods.cooperate&&this.state.recruited.includes('ally');
        if(d<14&&!distracted){e.x+=(this.state.x-e.x)/Math.max(1,d)*dt*4;e.z+=(this.state.z-e.z)/Math.max(1,d)*dt*4;}else{e.x=e.originX+Math.sin(this.state.time*.17+e.phase)*7;e.z=e.originZ+Math.cos(this.state.time*.2+e.phase)*6;}
        if(d<3.4&&this.state.hitTimer<=0){this.damage(30,'Your ecosystem regrouped at a safe habitat. Every recruited organism remains attached.');this.state.hitTimer=3;}continue;
      }
      if(e.habitat===this.state.habitat&&!this.campaign.has(e.id)&&distance(e,this.state)<3.4&&this.state.latch&&this.collect(e)){this.state.habitatCounts[e.habitat]++;if(!this.state.recruited.includes(e.role))this.state.recruited.push(e.role);this.state.health=clamp(this.state.health+5,0,100);}
    }
    if(this.state.stage<3&&this.state.habitatCounts[this.state.habitat]>=habitat.count&&habitat.needed.every(role=>this.state.recruited.includes(role))){
      this.state.stage++;if(this.state.stage<3){this.state.habitat=this.state.stage;this.checkpoint(HABITATS[this.state.habitat].name+' opens. Your body carries its old adaptations.');}else this.checkpoint('Three habitats mastered. Follow the final migration route.');
    }
    if(this.state.stage>=3){const exit=this.entities.find(e=>e.role==='exit');if(distance(exit,this.state)<7)this.state.migration+=dt;else this.state.migration=Math.max(0,this.state.migration-dt*.08);if(this.state.migration>=65)this.finish();}
  }
  recover(){super.recover();this.state.hitTimer=5;this.state.migration=0;}
  get objective(){return this.state.stage>=3?`Lead your whole ecosystem to the final habitat and weather the pursuit: ${Math.floor(this.state.migration)}/65 s.`:`${HABITATS[this.state.habitat].name}: latch ${this.state.habitatCounts[this.state.habitat]}/${HABITATS[this.state.habitat].count} organisms. Recruit ${HABITATS[this.state.habitat].needed.join(', ')}.`;}
  get progress(){return(this.state.stage+this.state.migration/65)/4;}
  get resource(){return{label:`Ecosystem integrity · ${this.state.recruited.length} functional adaptations`,value:Math.round(this.state.health),max:100};}
  get viewConfig(){return{...super.viewConfig,camera:'ground',span:33,playerKind:8,physical:true,mode:'move',habitat:this.state.habitat,goal:this.state.stage>=3?this.entities.find(e=>e.role==='exit'):null,hazards:this.entities.filter(e=>e.role==='predator')};}
}
