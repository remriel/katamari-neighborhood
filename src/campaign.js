export const MAP_HALF_METERS=6000;
export const STAGE_COUNT=5;
export const RACE_GOAL_METERS=400;
export const RACE_CHECKPOINTS=[100,200,300,RACE_GOAL_METERS];
export const ISLAND_PICKUP_METERS=2200*1.08;

// Each stop stays on the selected island. Physical object sizes rise from
// treats to beach furniture, neighborhood traffic and finally landmarks.
const SNACKS=[0,1,2,3,4,5,6,7,18,19,20,21,9,10,11,13,14,15,16,17,22,24,25,26,27,29,30,31,32,33,34,35,36,37,38,48];
const BEACH=[59,60,61,7,54,55,56,57,58,51,67,31,32,33,34,35,36,37,38,48];
const NEIGHBORHOOD=[0,6,9,11,13,14,15,17,22,24,26,27,29,30,31,32,33,42,43,44,45,46,34,35,36,37,38,39];
const LANDMARKS=[2,7,12,16,31,32,33,34,35,36,37,38,39,47,48,50,65];
export const CHAPTERS=[
  {name:'Snack market',icon:'🍬',size:100,count:0,type:null,start:[0,0],heading:[0,-1],props:SNACKS,hint:'Treats and toys · race to 100 m.',arc:'Feed the ball with treats and toys.'},
  {name:'Beach party',icon:'🏖️',size:200,count:0,type:null,start:[900,1450],heading:[0,-1],target:[935,1330],props:BEACH,hint:'Beach furniture and boats · race to 200 m.',arc:'Umbrellas, loungers and boats are next.'},
  {name:'Neighborhood feast',icon:'🏘️',size:300,count:0,type:null,start:[650,200],heading:[0,-1],target:[725,80],props:NEIGHBORHOOD,hint:'Vehicles and houses · race to 300 m.',arc:'Turn the traffic and houses into food.'},
  {name:'Highland haul',icon:'🏰',size:400,count:0,type:null,start:[-2100,-1100],heading:[1,0],target:[-1940,-1220],props:LANDMARKS,hint:'Large buildings and landmarks · unlock the island sweep at 400 m.',arc:'Unlock the island sweep at 400 m.'},
  {name:'Island sweep',icon:'🌴',size:ISLAND_PICKUP_METERS,count:0,type:41,start:[-1000,-500],heading:[1,0],target:[0,0],props:[38,39,47,49,40],hint:'Clear giant landmarks, then collect the island to win!',arc:'The whole island is your final pickup.'},
];
const LANAI_CHAPTERS=CHAPTERS.map((chapter,i)=>({...chapter,
  name:['Town square snacks','Lānaʻi beach party','Resort neighborhood','Highland landmarks','Clear Lānaʻi'][i],
  start:[[0,0],[850,2890],[1270,1630],[-1700,-1100],[-1000,-500]][i],
  target:[null,[900,2770],[1300,1500],[-1550,-1250],[0,0]][i],
  type:chapter.type,
}));
export function chaptersForIsland(id){return id==='lanai'?LANAI_CHAPTERS:CHAPTERS;}

export const STAGE_GOLD_SECONDS=[45,15,15,15,90];
export function stageMedal(seconds,index){
  if(seconds===null)return'Played';
  const gold=STAGE_GOLD_SECONDS[index]||20;
  return seconds<=gold?'Gold':seconds<=gold*1.5?'Silver':'Bronze';
}
export function runGrade(stages,won){if(!won)return'Keep rolling';const points=stages.reduce((sum,s)=>sum+({Gold:3,Silver:2,Bronze:1}[s.medal]||0),0)/Math.max(1,stages.length);return points>=2.6?'S':points>=2?'A':points>=1?'B':'C';}
