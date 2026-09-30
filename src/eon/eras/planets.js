import {EraModule} from './base.js';
import {clamp,distance} from '../config.js';
export class PlanetsEra extends EraModule{
  constructor(campaign){
    super('planets',campaign);Object.assign(this.state,{x:-22,z:12,fuel:100,debris:0,moon:false,worlds:[],capture:false,captureProgress:{},stabilized:0,stress:0,burst:0});
    for(let i=0;i<22;i++){const a=i*.8,r=14+(i%5)*5;this.entity('debris-'+i,0,Math.cos(a)*r,Math.sin(a)*r,{size:.8,role:'debris'});}
    this.entity('moon',1,0,0,{size:3,role:'moon',radius:20,phase:this.variant?1.8:.7,omega:.035});
    for(let i=0;i<3;i++)this.entity('world-'+i,i+2,0,0,{size:6+i*2.5,role:['rocky','icy','gas'][i],radius:30+i*11,phase:this.variant?i*2+1:i*2+.4,omega:[.032,.027,.022][i],vx:0,vz:0});
    for(let i=0;i<4;i++)this.entity('beacon-'+i,6,Math.cos(i*Math.PI/2)*25,Math.sin(i*Math.PI/2)*25,{size:2.2,role:'beacon'});
  }
  get actions(){return[{id:'brake',label:'Brake',key:'Space',hold:true,hint:'Match a world’s velocity before capture'},{id:'capture',label:this.state.capture?'Release capture':'Bind a world',key:'KeyE',hint:'Hold close with relative speed under 1.2'},{id:'burst',label:'Gravity burst',key:'KeyR',hint:'A short controlled velocity impulse'}];}
  action(id,value=true){if(id==='brake')this.state.braking=value;if(id==='capture')this.state.capture=!this.state.capture;if(id==='burst'&&this.state.abilityCooldown<=0&&this.state.fuel>=8){this.state.burst=.5;this.state.fuel-=8;this.state.abilityCooldown=this.mods.burst?3:6;}}
  update(dt,input){
    this.tick(dt);this.state.burst=Math.max(0,this.state.burst-dt);
    const r=Math.max(8,Math.hypot(this.state.x,this.state.z)),acceleration=(this.state.burst>0?10:4.8)*this.mods.mobility,thrust=this.state.fuel>0?1:0;
    this.state.vx+=(input.x*acceleration*thrust-this.state.x/r*48/(r*r))*dt;this.state.vz+=(input.z*acceleration*thrust-this.state.z/r*48/(r*r))*dt;
    if(this.state.braking){const drag=Math.exp(-dt*2);this.state.vx*=drag;this.state.vz*=drag;this.state.fuel=Math.max(0,this.state.fuel-dt*.4);}
    const speed=Math.hypot(this.state.vx,this.state.vz);if(speed>9){this.state.vx*=9/speed;this.state.vz*=9/speed;}
    this.state.fuel=clamp(this.state.fuel-dt*Math.hypot(input.x,input.z)*1.2,0,100);this.state.x=clamp(this.state.x+this.state.vx*dt,-68,68);this.state.z=clamp(this.state.z+this.state.vz*dt,-65,65);
    for(const e of this.entities){
      if(e.radius){const a=e.phase+this.state.time*e.omega;e.x=Math.cos(a)*e.radius;e.z=Math.sin(a)*e.radius;e.vx=-Math.sin(a)*e.radius*e.omega;e.vz=Math.cos(a)*e.radius*e.omega;}
      const d=distance(e,this.state);
      if(e.role==='beacon'&&d<5)this.state.fuel=clamp(this.state.fuel+dt*12,0,100);
      if(this.campaign.has(e.id))continue;
      if(e.role==='debris'&&d<3&&this.collect(e)){this.state.debris++;this.state.fuel=clamp(this.state.fuel+5,0,100);}
      const eligible=e.role==='moon'?this.state.debris>=12:('rocky icy gas'.includes(e.role)&&this.state.moon);
      if(eligible&&this.state.capture&&d<e.size*.65+3){const relative=Math.hypot(this.state.vx-(e.vx||0),this.state.vz-(e.vz||0));if(relative<1.2){this.state.captureProgress[e.id]=(this.state.captureProgress[e.id]||0)+dt;this.state.fuel=Math.max(0,this.state.fuel-dt*.2);if(this.state.captureProgress[e.id]>=4&&this.collect(e,{orbital:true,position:[Math.cos(e.phase)*7,1,Math.sin(e.phase)*7],rotation:[0,0,0,1]})){
        this.state.vx=(this.state.vx+e.vx)/2;this.state.vz=(this.state.vz+e.vz)/2;
        if(e.role==='moon'){this.state.moon=true;this.state.stage=1;}else this.state.worlds.push(e.role);
        this.checkpoint(e.name+' is bound to your living cosmos.');
      }}else{this.state.captureProgress[e.id]=Math.max(0,(this.state.captureProgress[e.id]||0)-dt);this.state.stress=Math.min(100,this.state.stress+dt*6/this.mods.tolerance);}}
      if(this.mods.cooperate&&e.role==='rocky'&&d<12)this.state.fuel=clamp(this.state.fuel+dt*1.4,0,100);
    }
    if(r<10){this.state.stress=Math.min(100,this.state.stress+dt*15/this.mods.tolerance);this.damage(dt*6);}else this.state.stress=Math.max(0,this.state.stress-dt*1.6);
    if(this.state.fuel<=0)this.campaign.recovery(this,'Your cosmos recovered fuel at its beacon. Every captured world remains yours.');
    if(this.state.worlds.length===3){this.state.stage=2;const stable=r>=18&&r<=35&&Math.hypot(this.state.vx,this.state.vz)<2.4&&this.state.stress<40;if(stable)this.state.stabilized+=dt;else this.state.stabilized=Math.max(0,this.state.stabilized-dt*.6);if(this.state.stabilized>=30){this.collect({id:'final-cosmic-core',kind:8,name:'A living cosmos carrying Earth’s history',role:'finale',size:9});this.finish();}}
    if(this.state.stress>=100)this.campaign.recovery(this,'The stabilization attempt restarted. Your collected planets and all earlier history survived.');
  }
  recover(){super.recover();this.state.x=-25;this.state.z=0;this.state.fuel=90;this.state.stress=0;this.state.stabilized=0;this.state.capture=false;}
  get objective(){return this.state.stage===0?`Collect ${this.state.debris}/12 debris, then match the moon’s velocity and bind it for 4 seconds.`:this.state.stage===1?`Capture a rocky, icy, and gas-giant world: ${this.state.worlds.length}/3. Brake to match velocity; stay close while binding.`:`Stabilize your complete cosmos for ${Math.floor(this.state.stabilized)}/30 s. Stay in the golden orbit, speed below 2.4, and stress below 40.`;}
  get progress(){return(this.state.debris/12+Number(this.state.moon)+this.state.worlds.length/3+this.state.stabilized/30)/4;}
  get resource(){return{label:`Fuel · Speed ${Math.hypot(this.state.vx,this.state.vz).toFixed(1)} · Tidal stress ${Math.round(this.state.stress)}`,value:Math.round(this.state.fuel),max:100};}
  get viewConfig(){const goal=this.state.stage===0?this.entities.find(e=>e.role==='moon'):this.state.stage===1?this.entities.find(e=>['rocky','icy','gas'].includes(e.role)&&!this.campaign.has(e.id)):null;return{...super.viewConfig,camera:'orbit',span:78,playerKind:5,mode:'move',goal,trajectory:{vx:this.state.vx,vz:this.state.vz},stabilityOrbit:this.state.stage===2,orbits:this.entities.filter(e=>e.radius)};}
}
