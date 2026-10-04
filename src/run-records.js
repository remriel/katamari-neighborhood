import {runGrade} from './campaign.js';
const finite=(v,fallback=0)=>Number.isFinite(v)&&v>=0?v:fallback;
const recordKey=(island,mode)=>'katamari:'+island+':'+(mode==='campaign'?'island-race':mode)+'-best';
export function readRecord(storage,island,mode){
  try{
    const raw=JSON.parse(storage.getItem(recordKey(island,mode))||(mode==='quick'&&island==='oahu'?storage.getItem('katamari:'+mode+'-best'):null)||'null');
    if(!raw||typeof raw!=='object')return null;
    return {score:finite(raw.score),combo:finite(raw.combo),count:finite(raw.count),seconds:finite(raw.seconds,null),
      stages:Array.isArray(raw.stages)?raw.stages.slice(0,5).map(s=>({seconds:finite(s?.seconds,null),goalSeconds:finite(s?.goalSeconds,null),pickups:finite(s?.pickups),score:finite(s?.score),medal:['Gold','Silver','Bronze','Played'].includes(s?.medal)?s.medal:'Played'})):[],
      splits:Array.isArray(raw.splits)?raw.splits.slice(0,45).filter(s=>Number.isFinite(s?.time)&&Number.isFinite(s?.score)):[],completed:Boolean(raw.completed||raw.seconds>0)};
  }catch{return null;}
}
export function scorePace(record,sim){
  const splits=record?.splits;if(!splits?.length||sim.elapsed<15)return null;
  let before={time:0,score:0},after=null;
  for(const split of splits){if(split.time<=sim.elapsed)before=split;else{after=split;break;}}
  if(!after&&sim.elapsed>before.time+15)return null;
  const expected=after?before.score+(after.score-before.score)*(sim.elapsed-before.time)/(after.time-before.time):before.score;
  return Math.round(sim.score-expected);
}
export function finishRecord(sim,previous,splits=[]){
  const labels=[],comparisons=[];
  if(sim.score>(previous?.score||0))labels.push('NEW SCORE BEST');
  if(sim.bestCombo>(previous?.combo||0))labels.push('NEW CHAIN BEST');
  const seconds=sim.elapsed,faster=sim.won&&(!previous?.seconds||seconds<previous.seconds);
  if(faster)labels.unshift('FASTEST FINISH');
  if(previous?.score&&sim.score<previous.score)comparisons.push((previous.score-sim.score).toLocaleString()+' points from your best');
  if(previous?.combo&&sim.bestCombo<previous.combo)comparisons.push((previous.combo-sim.bestCombo)+' pickups from your best chain');
  if(sim.won&&previous?.seconds&&!faster)comparisons.push((seconds-previous.seconds).toFixed(2)+' seconds from your fastest finish');
  const stages=Array.from({length:Math.max(previous?.stages?.length||0,sim.chapterStats.length)},(_,i)=>{
    const current=sim.chapterStats[i],old=previous?.stages?.[i];
    const fasterGoal=current?.goalSeconds!==null&&current?.goalSeconds!==undefined&&(old?.goalSeconds===null||old?.goalSeconds===undefined||current.goalSeconds<old.goalSeconds);
    return current&&(!old||fasterGoal||current.score>old.score)?{seconds:current.seconds,goalSeconds:current.goalSeconds??null,pickups:current.pickups,score:current.score,medal:current.medal}:old;
  });
  const record={version:2,score:Math.max(previous?.score||0,sim.score),combo:Math.max(previous?.combo||0,sim.bestCombo),count:Math.max(previous?.count||0,sim.count),
    seconds:sim.won?Math.min(previous?.seconds??Infinity,seconds):previous?.seconds??null,completed:Boolean(sim.won||previous?.completed),stages,
    splits:sim.score>(previous?.score||0)?splits:previous?.splits||[]};
  const improving=sim.chapterStats.map((stage,i)=>({stage,index:i,delta:(previous?.stages?.[i]?.pickups??stage.pickups)-stage.pickups})).sort((a,b)=>b.delta-a.delta);
  const target=improving[0];
  const nextTry=comparisons.slice(0,2);
  if(nextTry.length<2&&target){const goal=target.stage.medal==='Gold'?'a cleaner chain':'the next medal';nextTry.push(target.stage.name+': try for '+goal);}
  if(!nextTry.length)nextTry.push('Keep the chain through the turns. Dash into the next cluster.');
  return {record,labels,comparisons,nextTry:nextTry.slice(0,2),grade:runGrade(sim.chapterStats,sim.won)};
}
export function saveRecord(storage,sim,record){try{storage.setItem(recordKey(sim.islandId,sim.runMode),JSON.stringify(record));return true;}catch{return false;}}
