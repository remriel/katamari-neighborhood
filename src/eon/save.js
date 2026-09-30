import {SAVE_VERSION,ERA_IDS} from './config.js';
const DB_NAME='eon-roll',STORE='campaign',FALLBACK='eon-roll:save:v1';
function valid(data){return data&&data.version===SAVE_VERSION&&Number.isInteger(data.era)&&data.era>=0&&data.era<ERA_IDS.length&&Array.isArray(data.ledger)&&data.build&&data.eraStates&&typeof data.runId==='string';}
export class SaveStore{
  constructor(){this.db=null;this.error=null;this.profile={runs:0,completed:false,discoveries:{},chapters:[]};this.queue=Promise.resolve();}
  async open(){
    try{this.db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Local save is blocked'));});}catch(error){this.error=error;}
    const profile=await this.read('profile');if(profile?.discoveries)this.profile=profile;
    return this;
  }
  async read(key){
    if(this.db)try{return await new Promise((resolve,reject)=>{const req=this.db.transaction(STORE,'readonly').objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch(error){this.error=error;}
    try{return JSON.parse(localStorage.getItem(FALLBACK+':'+key)||'null');}catch{return null;}
  }
  async write(entries){
    if(this.db)try{await new Promise((resolve,reject)=>{const tx=this.db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const[key,value]of entries)store.put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}catch(error){this.error=error;}
    try{for(const[key,value]of entries)localStorage.setItem(FALLBACK+':'+key,JSON.stringify(value));return true;}catch(error){this.error=error;return false;}
  }
  async load(){const current=await this.read('current');if(valid(current))return current;const checkpoint=await this.read('checkpoint');return valid(checkpoint)?checkpoint:null;}
  save(data,checkpoint=false){const snapshot=structuredClone(data);this.queue=this.queue.then(()=>this.write([['current',snapshot],['profile',this.profile],...(checkpoint?[['checkpoint',snapshot]]:[])]));return this.queue;}
}
