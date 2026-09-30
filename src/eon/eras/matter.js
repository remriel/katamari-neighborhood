import {EraModule} from './base.js';
import {clamp,distance} from '../config.js';
const RECIPES=[{name:'Water',formula:'H₂O',atoms:[0,0,2],kind:6},{name:'Methane',formula:'CH₄',atoms:[1,0,0,0,0],kind:7},{name:'Ammonia',formula:'NH₃',atoms:[3,0,0,0],kind:8}];
export class MatterEra extends EraModule{
  constructor(campaign){
    super('matter',campaign);Object.assign(this.state,{recipe:0,bonded:0,angle:0,polarity:1,stability:100,bombardment:0,cooling:0,hitTimer:0});
    const layout=this.variant?[[22,-18],[-22,-12],[18,22],[-16,25]]:[[-22,-17],[24,-13],[-18,20],[21,23]];
    for(let kind=0;kind<4;kind++)for(let i=0;i<12;i++){const[cx,cz]=layout[kind],a=i*2.39996,r=3+Math.sqrt(i)*1.8;this.entity(`atom-${kind}-${i}`,kind,cx+Math.cos(a)*r,cz+Math.sin(a)*r,{size:.8,drift:i*.3});}
    this.entity('cooling-pool',5,this.variant?-28:28,-28,{size:5,role:'cooling',interactive:true});
    for(let i=0;i<6;i++)this.entity('heat-'+i,4,-32+i*13,(i%2?11:-9),{size:2.1,role:'heat'});
  }
  get actions(){return[{id:'pulse',label:this.state.polarity>0?'Attract':'Repel',key:'Space',hint:'Switch magnetic polarity'},{id:'rotate',label:'Rotate bonds',key:'KeyE',hint:'Turn the active bonding site'}];}
  action(id){if(id==='pulse'){this.state.polarity*=-1;this.state.abilityCooldown=.2;}if(id==='rotate')this.state.angle+=Math.PI/4;}
  update(dt,input){
    this.tick(dt);this.move(dt,input,6);this.state.hitTimer=Math.max(0,this.state.hitTimer-dt);
    const recipe=RECIPES[Math.min(2,this.state.recipe)],needed=recipe.atoms[this.state.bonded];
    for(const entity of this.entities){
      if(entity.role==='heat'){if(distance(entity,this.state)<2.4&&this.state.hitTimer<=0){this.state.stability=Math.max(0,this.state.stability-22/this.mods.tolerance);this.damage(15);this.state.hitTimer=2;this.campaign.emit({type:'feedback',message:'Heat loosened your bonds. Collected matter stays with you.'});}continue;}
      if(entity.kind>3||this.campaign.has(entity.id))continue;
      const dist=distance(entity,this.state);
      if(dist<10){const force=(entity.kind===needed?this.state.polarity:-1)*dt*2.8;const dx=this.state.x-entity.x,dz=this.state.z-entity.z;entity.x+=dx/Math.max(1,dist)*force;entity.z+=dz/Math.max(1,dist)*force;}
      if(dist<2.4&&entity.kind===needed&&this.state.polarity>0&&this.state.recipe<3){
        const angle=Math.atan2(entity.z-this.state.z,entity.x-this.state.x),alignment=Math.cos(angle-this.state.angle);
        if(alignment>.35||dist<1.0){if(this.collect(entity)){this.state.bonded++;this.state.stability=Math.min(100,this.state.stability+12);this.campaign.emit({type:'feedback',message:`${recipe.formula} · ${this.state.bonded}/${recipe.atoms.length} bonds`});}}
      }
    }
    if(this.state.recipe<3&&this.state.bonded>=recipe.atoms.length){
      this.collect({id:'molecule-'+this.state.recipe,kind:recipe.kind,role:recipe.formula,name:recipe.name+' cluster',size:2});this.state.recipe++;this.state.bonded=0;this.state.stage=this.state.recipe;this.checkpoint(recipe.name+' stabilized. Your first history is taking shape.');
    }
    if(this.state.recipe===3){
      this.state.bombardment+=dt;const pool=this.entities.find(entity=>entity.role==='cooling');
      if(distance(pool,this.state)<5)this.state.cooling+=dt;else this.state.cooling=Math.max(0,this.state.cooling-dt*.2);
      const strike=Math.sin(this.state.time*.8)*25;if(Math.abs(this.state.x-strike)<2&&this.state.hitTimer<=0){this.damage(12);this.state.hitTimer=2;}
      if(this.state.cooling>=35&&this.state.bombardment>=65)this.finish();
    }
    this.state.stability=clamp(this.state.stability+dt*(this.state.polarity<0?5:1),0,100);
  }
  recover(){super.recover();this.state.stability=80;this.state.hitTimer=5;if(this.state.recipe===3){this.state.bombardment=0;this.state.cooling=0;}}
  get objective(){if(this.state.recipe===3)return`Carry all three molecules to the mineral cooling pool. ${Math.floor(this.state.cooling)}/35 s settled; weather ${Math.floor(this.state.bombardment)}/65 s of bombardment.`;const r=RECIPES[this.state.recipe],symbols=['H','C','O','N'];return`Bond ${r.formula}: next ${symbols[r.atoms[this.state.bonded]]}. Align the bright bonding site, attract the matching atom, and stabilize ${this.state.bonded}/${r.atoms.length} sites.`;}
  get progress(){return(this.state.recipe+Math.min(1,this.state.cooling/35))/4;}
  get resource(){return{label:this.state.polarity>0?'Attract · bond stability':'Repel · repairing bonds',value:Math.round(this.state.stability),max:100};}
  get viewConfig(){return{...super.viewConfig,span:28,playerKind:8,mode:'move',bondAngle:this.state.angle,activeKind:RECIPES[Math.min(2,this.state.recipe)].atoms[this.state.bonded],hazards:this.entities.filter(e=>e.role==='heat'),goal:this.entities.find(e=>e.role==='cooling')};}
}
