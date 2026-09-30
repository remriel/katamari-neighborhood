import {SAVE_VERSION,ERAS,ERA_IDS,hash} from './config.js';
export class CampaignController{
  constructor(store){this.store=store;this.state=null;this.listeners=new Set();this.collected=new Set();}
  newRun(){
    const replay=this.store.profile.completed,seed=replay?(crypto.getRandomValues(new Uint32Array(1))[0]):450000000;
    this.store.profile.runs++;this.state={version:SAVE_VERSION,runId:'eon-'+Date.now().toString(36),seed,era:0,checkpoint:'beginning',build:{cohesion:0,motion:0,symbiosis:0},choices:[],ledger:[],layers:[],eraStates:{},variants:ERA_IDS.map((id,i)=>replay?(hash(seed,id,i)%2):0),timeline:ERAS[0].date,status:'playing',elapsed:0,failures:0};this.collected=new Set();return this.state;
  }
  restore(data){this.state=data;this.collected=new Set(data.ledger.map(item=>item.id));return data;}
  onEvent(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(event){for(const fn of this.listeners)fn(event);}
  collect(entity,transform={}){
    const id=`${this.state.runId}:${ERA_IDS[this.state.era]}:${entity.id}`;if(this.collected.has(id))return false;
    const era=ERAS[this.state.era],record={id,entityId:entity.id,eraId:era.id,era:this.state.era,assetKey:`${era.id}:${entity.kind}`,name:entity.name||era.names[entity.kind],role:entity.role||era.roles[entity.kind],parentId:`layer:${this.state.runId}:${era.id}`,physicalScaleExp:era.exponent,relativeTransform:transform,discoveryKey:`${era.id}:${entity.kind}`};
    this.collected.add(id);this.state.ledger.push(record);this.store.profile.discoveries[record.discoveryKey]={name:record.name,eraId:record.eraId,assetKey:record.assetKey};this.emit({type:'collection',record});return true;
  }
  has(entityId){return this.collected.has(`${this.state.runId}:${ERA_IDS[this.state.era]}:${entityId}`);}
  saveEra(module,checkpoint=false){this.state.eraStates[module.id]=module.serialize();this.state.timeline=module.timeline||ERAS[this.state.era].date;if(checkpoint)this.state.checkpoint=module.id+':'+module.state.stage;return this.store.save(this.state,checkpoint);}
  completeEra(module){
    this.state.eraStates[module.id]=module.serialize();if(!this.state.layers.some(layer=>layer.era===this.state.era))this.state.layers.push({id:`layer:${this.state.runId}:${module.id}`,era:this.state.era,name:ERAS[this.state.era].name,body:module.state.bodySnapshot||null,children:this.state.era?[`layer:${this.state.runId}:${ERA_IDS[this.state.era-1]}`]:[],logScale:ERAS[this.state.era].exponent});
    if(!this.store.profile.chapters.includes(this.state.era))this.store.profile.chapters.push(this.state.era);
    this.state.status=this.state.era===5?'finished':'adaptation';if(this.state.status==='finished')this.store.profile.completed=true;
    this.store.save(this.state,true);this.emit({type:this.state.status});
  }
  choose(path){if(this.state.status!=='adaptation'||!['cohesion','motion','symbiosis'].includes(path))return false;this.state.build[path]++;this.state.choices.push({era:this.state.era,path});this.state.era++;this.state.timeline=ERAS[this.state.era].date;this.state.status='transition';this.store.save(this.state,true);this.emit({type:'transition',era:this.state.era});return true;}
  beginEra(){this.state.status='playing';this.store.save(this.state,true);}
  recovery(module,message){this.state.failures++;module.recover();this.saveEra(module,true);this.emit({type:'recovery',message});}
}
