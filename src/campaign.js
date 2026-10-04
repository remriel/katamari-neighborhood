export const MAP_HALF_METERS=6000;
export const STAGE_SECONDS=60;
export const STAGE_COUNT=4;
export const CAMPAIGN_START_SECONDS=STAGE_SECONDS;
export const CAMPAIGN_MAX_SECONDS=STAGE_SECONDS*STAGE_COUNT;

// Each stop stays on the selected island. Physical object sizes rise from
// treats to beach furniture, neighborhood traffic and finally landmarks.
const SNACKS=[0,1,2,3,4,5,6,7,18,19,20,21];
const BEACH=[59,60,61,7,54,55,56,57,58,51,67];
const NEIGHBORHOOD=[0,6,9,11,13,14,15,17,22,24,26,27,29,30,31,32,33,42,43,44,45,46];
const LANDMARKS=[2,7,12,16,31,32,33,34,35,36,37,38,39,40,47,48,50,65];
export const CHAPTERS=[
  {name:'Snack market',icon:'🍬',size:1,count:20,type:null,start:[0,0],heading:[0,-1],props:SNACKS,hint:'Treats and toys · reach 1 m.',arc:'Feed the ball with treats and toys.'},
  {name:'Beach party',icon:'🏖️',size:6,count:45,type:58,start:[900,1450],heading:[0,-1],target:[935,1330],props:BEACH,hint:'Beach furniture and boats · reach 6 m.',arc:'Umbrellas, loungers and boats are next.'},
  {name:'Neighborhood feast',icon:'🏘️',size:30,count:70,type:32,start:[650,200],heading:[0,-1],target:[725,80],props:NEIGHBORHOOD,hint:'Vehicles and houses · reach 30 m.',arc:'Turn the traffic and houses into food.'},
  {name:'Highland haul',icon:'🏰',size:120,count:95,type:37,start:[-2100,-1100],heading:[1,0],target:[-1940,-1220],props:LANDMARKS,hint:'Large buildings and landmarks · reach 120 m.',arc:'Finish with a heap of giant landmarks.'},
];
const LANAI_CHAPTERS=CHAPTERS.map((chapter,i)=>({...chapter,
  name:['Town square snacks','Lānaʻi beach party','Resort neighborhood','Highland landmarks'][i],
  start:[[0,0],[850,2890],[1270,1630],[-1700,-1100]][i],
  target:[null,[900,2770],[1300,1500],[-1550,-1250]][i],
  type:i===3?48:chapter.type,
}));
export function chaptersForIsland(id){return id==='lanai'?LANAI_CHAPTERS:CHAPTERS;}
for(const chapters of [CHAPTERS,LANAI_CHAPTERS])chapters.forEach((chapter,i)=>{
  chapter.radius=[180,360,500,1100][i];chapter.maxObjectSize=[.8,6,30,900][i];
});

export const STAGE_GOLD_SECONDS=[20,35,40,45];
export function stageMedal(seconds,index){
  if(seconds===null)return'Played';
  const gold=STAGE_GOLD_SECONDS[index]||45;
  return seconds<=gold?'Gold':seconds<=STAGE_SECONDS*.85?'Silver':'Bronze';
}
export function runGrade(stages,won){if(!won)return'Keep rolling';const points=stages.reduce((sum,s)=>sum+({Gold:3,Silver:2,Bronze:1}[s.medal]||0),0)/Math.max(1,stages.length);return points>=2.6?'S':points>=2?'A':points>=1?'B':'C';}
