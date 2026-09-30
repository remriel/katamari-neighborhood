import {EraModule} from './base.js';
import {clamp} from '../config.js';
export class CivilizationsEra extends EraModule{
  constructor(campaign){
    super('civilizations',campaign);Object.assign(this.state,{cities:[{goods:12,energy:10,hubs:[]},{goods:12,energy:10,hubs:[]},{goods:12,energy:10,hubs:[]}],links:[],selected:null,tick:0,trade:0,industry:0,storm:0,science:0,launch:0,outageTimer:0});
    const positions=this.variant?[[-26,16],[0,-22],[28,18]]:[[-26,-15],[0,23],[28,-12]];
    for(let i=0;i<3;i++)this.entity('city-'+i,i,...positions[i],{size:7,role:'city',node:i,interactive:true});
    this.entity('launch',6,0,0,{size:5,role:'launch'});
  }
  get actions(){return[{id:'energy',label:'Energy hub · 4 goods',key:'Digit1',hint:'Build at the selected city'},{id:'trade',label:'Trade hub · 4 goods',key:'Digit2',hint:'Improve the city’s goods production'},{id:'research',label:'Research · 5 goods',key:'Digit3',hint:'Support the orbital project'},{id:'repair',label:'Repair / reroute',key:'Space',hint:'Restore an interrupted link'},{id:'launch',label:'Launch project',key:'KeyE',hint:'Complete the final orbital project'}];}
  select(id){const entity=this.entities.find(e=>e.id===id);if(entity?.node===undefined)return;const node=entity.node;
    if(this.state.selected!==null&&this.state.selected!==node){const a=Math.min(node,this.state.selected),b=Math.max(node,this.state.selected);if(!this.state.links.some(link=>link.a===a&&link.b===b)){this.state.links.push({a,b,down:0});this.collect({id:`link-${a}-${b}`,kind:7,name:`Connection: ${this.meta.names[a]} ↔ ${this.meta.names[b]}`,role:'connection',size:1});this.checkpoint('Two regions connected. Tap another pair to extend the network.');}}
    this.state.selected=node;
  }
  action(id){
    if(['energy','trade','research'].includes(id)){const index=this.state.selected;if(index===null){this.campaign.emit({type:'feedback',message:'Select a city, then choose its new hub.'});return;}const city=this.state.cities[index],cost=id==='research'?5:4;if(city.hubs.includes(id)||city.goods<cost)return;city.goods-=cost;city.hubs.push(id);const kind={energy:3,trade:4,research:5}[id];this.collect({id:`hub-${index}-${id}`,kind,name:this.meta.names[kind]+' at '+this.meta.names[index],role:id,size:3},{position:[this.entities[index].x+3,1,this.entities[index].z+3],fixed:true});this.checkpoint('A '+id+' hub began operating.');}
    if(id==='repair'&&this.state.abilityCooldown<=0){const broken=this.state.links.find(link=>link.down>0);if(broken){broken.down=0;this.state.abilityCooldown=this.mods.burst?3:6;this.campaign.emit({type:'feedback',message:'Essential route restored.'});}}
    if(id==='launch'&&this.state.stage>=2&&this.state.science>=60)this.state.stage=3;
  }
  connectedGroups(){const remaining=new Set([0,1,2]),groups=[];while(remaining.size){const start=remaining.values().next().value,group=[],queue=[start];remaining.delete(start);while(queue.length){const node=queue.shift();group.push(node);for(const link of this.state.links){if(link.down>0)continue;const next=link.a===node?link.b:link.b===node?link.a:null;if(next!==null&&remaining.has(next)){remaining.delete(next);queue.push(next);}}}groups.push(group);}return groups;}
  update(dt){
    this.tick(dt);this.state.tick+=dt;for(const link of this.state.links)link.down=Math.max(0,link.down-dt);
    const groups=this.connectedGroups(),connected=groups.some(group=>group.length===3);
    if(this.state.tick>=5){this.state.tick=0;
      for(const city of this.state.cities){city.goods=clamp(city.goods+(1.5+(city.hubs.includes('trade')?2:0))*this.mods.yield-1,0,60);city.energy=clamp(city.energy+.5+(city.hubs.includes('energy')?2:0)-1,0,40);}
      for(const group of groups){if(group.length<2)continue;const goods=group.reduce((n,i)=>n+this.state.cities[i].goods,0)/group.length,energy=group.reduce((n,i)=>n+this.state.cities[i].energy,0)/group.length;for(const i of group){this.state.cities[i].goods=goods;this.state.cities[i].energy=energy;}}
      const healthy=this.state.cities.every(city=>city.goods>1&&city.energy>1);if(!healthy)this.damage(6,'The network resumed from a safe checkpoint with emergency reserves. Built regions and connections remain.');else this.state.health=clamp(this.state.health+4,0,100);
    }
    const hubs=this.state.cities.flatMap(city=>city.hubs),operating=this.state.cities.every(city=>city.energy>1&&city.goods>1);
    if(this.state.stage===0&&connected){this.state.trade+=dt;if(this.state.trade>=60){this.state.stage=1;this.checkpoint('Three regions share supplies. Add energy, trade, and research.');}}
    if(this.state.stage>=1){if(operating)this.state.science=Math.min(100,this.state.science+dt*this.state.cities.filter(city=>city.hubs.includes('research')).length*.8*this.mods.yield);}
    if(this.state.stage===1&&hubs.filter(h=>h==='energy').length>=3&&hubs.filter(h=>h==='trade').length>=2&&hubs.includes('research')&&connected&&operating){this.state.industry+=dt;if(this.state.industry>=90){this.state.stage=2;this.state.outageTimer=15;this.checkpoint('A global project is ready. Keep services running through the disruption.');}}
    if(this.state.stage===2){this.state.outageTimer-=dt;if(this.state.outageTimer<=0&&this.state.links.length){const index=Math.floor(this.state.time/15)%this.state.links.length;this.state.links[index].down=this.mods.shield?8:16;this.state.outageTimer=15;this.campaign.emit({type:'feedback',message:'A route is disrupted. Repair it or use a redundant connection.'});}if(connected&&operating)this.state.storm+=dt;else this.state.storm=Math.max(0,this.state.storm-dt*.3);}
    if(this.state.stage===3){if(connected&&operating&&this.state.storm>=90)this.state.launch+=dt;else this.state.stage=2;if(this.state.launch>=45){this.collect({id:'orbital-project-complete',kind:6,name:'Completed orbital project',role:'launch',size:5});this.finish();}}
  }
  recover(){super.recover();for(const city of this.state.cities){city.goods=Math.max(12,city.goods);city.energy=Math.max(12,city.energy);}for(const link of this.state.links)link.down=0;this.state.storm=0;this.state.launch=0;this.state.outageTimer=20;}
  get objective(){return this.state.stage===0?`Tap pairs of regions to connect all three. Maintain shared trade for ${Math.floor(this.state.trade)}/60 s.`:this.state.stage===1?`Build 3 energy hubs, 2 trade hubs, and 1 research hub. Maintain a healthy industrial network: ${Math.floor(this.state.industry)}/90 s.`:this.state.stage===2?`Repair and reroute disruptions: ${Math.floor(this.state.storm)}/90 stable seconds. Research ${Math.floor(this.state.science)}/60; then launch.`:`Keep every region supplied through launch: ${Math.floor(this.state.launch)}/45 s.`;}
  get progress(){return(this.state.stage+(this.state.stage===0?this.state.trade/60:this.state.stage===1?this.state.industry/90:this.state.stage===2?this.state.storm/90:this.state.launch/45))/4;}
  get resource(){return{label:`Goods ${Math.floor(this.state.cities.reduce((n,c)=>n+c.goods,0))} · Energy ${Math.floor(this.state.cities.reduce((n,c)=>n+c.energy,0))} · Research ${Math.floor(this.state.science)}`,value:Math.round(this.state.health),max:100};}
  get viewConfig(){return{...super.viewConfig,camera:'network',span:79,playerKind:8,mode:'network',links:this.state.links.map(link=>({...link,a:this.entities[link.a],b:this.entities[link.b],broken:link.down>0})),cities:this.state.cities,selected:this.state.selected,goal:this.state.stage>=2?this.entities.find(e=>e.role==='launch'):null};}
}
