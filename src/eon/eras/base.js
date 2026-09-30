import {ERAS,modifiers,randomSeed,hash,clamp,distance} from '../config.js';
export class EraModule{
  constructor(id,campaign){this.id=id;this.campaign=campaign;this.meta=ERAS.find(era=>era.id===id);this.index=ERAS.indexOf(this.meta);this.mods=modifiers(campaign.state.build);this.variant=campaign.state.variants[this.index];this.random=randomSeed(hash(campaign.state.seed,id,this.variant));this.entities=[];this.effects=[];this.state={x:0,z:0,vx:0,vz:0,stage:0,time:0,health:100,abilityCooldown:0,shieldCooldown:0,checkpoint:{x:0,z:0},complete:false};this.view=null;}
  enter(saved){if(saved){this.state={...this.state,...structuredClone(saved)};for(const actor of saved.actors||[]){const entity=this.entities.find(e=>e.id===actor.id);if(entity){entity.x=actor.x;entity.z=actor.z;}}}return this;}
  entity(id,kind,x,z,extra={}){const entity={id,kind,x,z,size:1,name:this.meta.names[kind],role:this.meta.roles[kind],...extra};this.entities.push(entity);return entity;}
  collect(entity,transform){if(this.campaign.collect(entity,transform)){this.campaign.saveEra(this);return true;}return false;}
  nearest(role,range=4){let closest=null,d=range;for(const e of this.entities){if(e.role!==role||this.campaign.has(e.id))continue;const n=distance(e,this.state);if(n<d){d=n;closest=e;}}return closest;}
  move(dt,input,speed=7){const t=1-Math.exp(-dt*8);this.state.vx+=(input.x*speed*this.mods.mobility-this.state.vx)*t;this.state.vz+=(input.z*speed*this.mods.mobility-this.state.vz)*t;this.state.x=clamp(this.state.x+this.state.vx*dt,-45,45);this.state.z=clamp(this.state.z+this.state.vz*dt,-40,40);}
  tick(dt){this.state.time+=dt;this.state.abilityCooldown=Math.max(0,this.state.abilityCooldown-dt);this.state.shieldCooldown=Math.max(0,this.state.shieldCooldown-dt);this.effects=this.effects.filter(effect=>effect.until>this.state.time);}
  damage(amount,message='You returned to a safe place. Your collected history is intact.'){
    if(this.mods.shield&&this.state.shieldCooldown<=0){this.state.shieldCooldown=20;this.campaign.emit({type:'feedback',message:'Your cohesive shell absorbed the impact.'});return;}
    this.state.health-=amount/this.mods.tolerance;if(this.state.health<=0)this.campaign.recovery(this,message);
  }
  checkpoint(message){this.state.checkpoint={x:this.state.x,z:this.state.z};this.campaign.saveEra(this,true);if(message)this.campaign.emit({type:'checkpoint',message});}
  recover(){this.state.x=this.state.checkpoint.x;this.state.z=this.state.checkpoint.z;this.state.vx=this.state.vz=0;this.state.health=100;this.state.abilityCooldown=0;}
  finish(){if(this.state.complete)return;this.state.complete=true;this.campaign.completeEra(this);}
  serialize(){return structuredClone({...this.state,actors:this.entities.map(e=>({id:e.id,x:e.x,z:e.z}))});}
  action(){}
  select(){}
  build(){}
  get actions(){return[];}
  get objective(){return'';}
  get progress(){return 0;}
  get resource(){return{label:'Integrity',value:Math.round(this.state.health),max:100};}
  get viewConfig(){return{camera:this.meta.camera,span:25,playerKind:8,ground:this.id,entities:this.entities,links:[],slots:[],mode:'move'};}
  createRenderer(api){this.view=api.createEraView(this);return this.view;}
  dispose(){this.view?.dispose();this.view=null;}
}
