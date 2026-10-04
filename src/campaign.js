export const MAP_HALF_METERS=6000;
export const CHAPTERS=[
  {name:'Snack attack',size:1,count:20,type:null,hint:'Collect 20 little things and reach 1 m.'},
  {name:'Street sweeper',size:6,count:45,type:29,hint:'Roll up a convertible. Reach 6 m and 45 things.'},
  {name:'Town trouble',size:30,count:70,type:32,hint:'Roll up an apartment building. Reach 30 m and 70 things.'},
  {name:'Landmark mayhem',size:120,count:95,type:37,hint:'Roll up a castle. Reach 120 m and 95 things.'},
  {name:'City collector',size:500,count:115,type:39,hint:'Roll up a skyscraper. Reach 500 m and 115 things.'},
  {name:'Mountain mover',size:1800,count:135,type:40,hint:'Roll up a mountain. Reach 1.8 km and 135 things.'},
  {name:'The whole island',size:2500,count:150,type:41,hint:'Collect 150 things, reach 2.5 km, and roll up the marked island.'},
];
export const CAMPAIGN_START_SECONDS=150;
export const CHAPTER_BONUS_SECONDS=60;
export const CAMPAIGN_MAX_SECONDS=600;
const LANAI_CHAPTERS=[
  {name:'Town square snacks',size:1,count:20,type:null,hint:'Collect 20 little things in Lānaʻi City and reach 1 m.'},
  {name:'Village wanderer',size:6,count:45,type:14,hint:'Roll up the village van. Reach 6 m and 45 things.'},
  {name:'Highland houses',size:30,count:70,type:32,hint:'Roll up the marked village building. Reach 30 m and 70 things.'},
  {name:'Resort roller',size:120,count:95,type:48,hint:'Roll up the coastal resort. Reach 120 m and 95 things.'},
  {name:'Rock garden giant',size:500,count:115,type:47,hint:'Roll up a rock spire. Reach 500 m and 115 things.'},
  {name:'Lānaʻihale lift',size:1800,count:135,type:40,hint:'Roll up Lānaʻihale. Reach 1.8 km and 135 things.'},
  {name:'All of Lānaʻi',size:2500,count:150,type:41,hint:'Collect 150 things, reach 2.5 km, and roll up the marked island.'},
];
export function chaptersForIsland(id){return id==='lanai'?LANAI_CHAPTERS:CHAPTERS;}

const ARCS=['Chain the snack trail. The toys are next.','Turn the traffic into a feast.','The houses have become snacks.','Sweep the landmarks. Leave a ridiculous skyline.','Devour the skyline. Look toward the ridges.','Mountains are food. The island is next.','Finish the island. Make the whole map yours.'];
export const STAGE_GOLD_SECONDS=[20,40,45,60,65,75,65];
for(const chapters of [CHAPTERS,LANAI_CHAPTERS])chapters.forEach((chapter,i)=>{chapter.arc=ARCS[i];});
export function stageMedal(seconds,index){const gold=STAGE_GOLD_SECONDS[index]||60;return seconds<=gold?'Gold':seconds<=gold*1.6?'Silver':seconds<=gold*2.5?'Bronze':'Cleared';}
export function runGrade(stages,won){if(!won)return'Keep rolling';const points=stages.reduce((sum,s)=>sum+({Gold:3,Silver:2,Bronze:1}[s.medal]||0),0)/Math.max(1,stages.length);return points>=2.6?'S':points>=2?'A':points>=1?'B':'C';}
