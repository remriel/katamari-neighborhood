// Original toy island inspired by Oahu's south-coast city and parallel ridges.
// All coordinates are physical meters, independent of camera and normalization.
export const ISLAND_HALF=6000;
export const ISLAND_COAST=[
  [-4600,-2100],[-3900,-3700],[-2600,-4800],[-1400,-5050],[-300,-4500],
  [600,-3900],[1900,-3300],[2900,-2300],[3500,-2200],[4400,-1200],
  [4700,-250],[4500,450],[3900,700],[3300,350],[2850,850],[2200,950],
  [1600,1350],[1000,1600],[350,1500],[-100,1260],[-600,1360],
  [-1000,1240],[-1200,680],[-1500,530],[-1650,1120],[-2200,1390],
  [-2700,1070],[-3100,780],[-3900,700],[-4450,100],[-4700,-1000],
];
export const ISLAND_RIDGES=[
  [[-3300,-3000],[-3050,-1900],[-2700,-700]],
  [[-1300,-3900],[-400,-3100],[500,-2300],[1500,-1500],[2400,-750],[3100,-200]],
];
export const STREET_NETWORKS=[
  {unit:1.5,width:1.05,seed:.72,shift:[0,0]},
  {unit:4,width:.80,seed:1.8,shift:[22,20]},
  {unit:14,width:.55,seed:3.1,shift:[18,-28]},
  {unit:50,width:.25,seed:4.2,shift:[-22,34]},
];
const TAU=Math.PI*2;
const wrap=(n,period)=>((n+period/2)%period+period)%period-period/2;
function segmentPoint(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return{x:a[0]+dx*t,z:a[1]+dz*t,dx,dz};
}
export function islandContains(x,z,island='oahu'){
  const coast=islandConfig(island).coast;
  let inside=false;
  for(let i=0,j=coast.length-1;i<coast.length;j=i++){
    const a=coast[i],b=coast[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function nearestCoast(x,z,island='oahu'){
  const coast=islandConfig(island).coast;
  let result=null,distance=Infinity;
  for(let i=0;i<coast.length;i++){
    const a=coast[i],b=coast[(i+1)%coast.length],p=segmentPoint(x,z,a,b);
    const d=Math.hypot(x-p.x,z-p.z);
    if(d<distance){distance=d;result=p;}
  }
  return{...result,distance,inside:islandContains(x,z,island)};
}
export function islandDistance(x,z,island='oahu'){const p=nearestCoast(x,z,island);return p.inside?p.distance:-p.distance;}
export function constrainToIsland(x,z,margin=.25,island='oahu'){
  const p=nearestCoast(x,z,island);if(p.inside&&p.distance>=margin)return{x,z};
  const length=Math.hypot(p.dx,p.dz)||1;
  let nx=-p.dz/length,nz=p.dx/length;
  if(!islandContains(p.x+nx*2,p.z+nz*2,island)){nx=-nx;nz=-nz;}
  const candidate={x:p.x+nx*(margin+1),z:p.z+nz*(margin+1)};
  if(islandContains(candidate.x,candidate.z,island))return candidate;
  const direction=Math.atan2(-p.z,-p.x);
  for(let i=0;i<16;i++){
    const angle=direction+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/16;
    const q={x:p.x+Math.cos(angle)*(margin+2),z:p.z+Math.sin(angle)*(margin+2)};
    if(islandContains(q.x,q.z,island))return q;
  }
  return{x:0,z:0};
}
const ellipse=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2)*1.5);
export function islandFields(x,z,island='oahu'){
  const config=islandConfig(island),coast=islandDistance(x,z,island);
  const city=island==='lanai'?Math.max(ellipse(x,z,0,0,560,480),ellipse(x,z,1400,1800,500,430)*.64):
    Math.max(ellipse(x,z,650,200,2450,900),ellipse(x,z,-2200,400,1050,650)*.72,ellipse(x,z,3400,-1300,650,1050)*.66);
  let ridge=0;
  for(const path of config.ridges)for(let i=0;i<path.length-1;i++){
    const p=segmentPoint(x,z,path[i],path[i+1]),d=Math.hypot(x-p.x,z-p.z);
    ridge=Math.max(ridge,Math.exp(-((d/520)**2))*(.78+.12*Math.sin((p.x+p.z)/470)));
  }
  return{coast,city:coast>=0?city:0,ridge:coast>=0?ridge:0};
}
export function islandDistrict(x,z,island='oahu'){
  const f=islandFields(x,z,island);
  if(island==='lanai'){
    if(f.coast<90)return z>1100?'Hulopoʻe Coast':'Lānaʻi Coast';
    if(f.city>.36)return z>900?'Mānele Resorts':'Lānaʻi City';
    if(f.ridge>.30)return'Lānaʻihale';
    if(x<-1000&&z<-500)return'Keahiakawelo';
    if(z<-1700)return'North Lānaʻi';
    return'Central Lānaʻi';
  }
  if(f.coast<90)return z>0?'South Shore Beach':'Island Coast';
  if(f.ridge>.30)return x<-2100?'Waiʻanae Highlands':'Koʻolau Ridge';
  if(x>2800&&z<-700)return'Windward Town';
  if(f.city>.36)return x<-1100?'Harbor Neighborhoods':x>1100?'Waikīkī Skyline':'Honolulu';
  if(z<-3500)return'North Shore';
  if(z<-1500)return'Central Valley';
  return'Island Suburbs';
}
export function nearestStreet(x,z,island='oahu'){
  let best={distance:Infinity,x,z,nx:1,nz:0,width:3.15};
  for(const [network,n] of islandConfig(island).streets.entries()){
    const px=x/n.unit+n.shift[0],pz=z/n.unit+n.shift[1],seed=n.seed;
    const bend=Math.sin(pz*TAU/128+seed)*14+Math.sin(pz*TAU/64+seed*1.7)*5;
    const start=Math.sin(seed)*14+Math.sin(seed*1.7)*5;
    const main=wrap(px-bend+start,64);
    const derivative=14*TAU/128*Math.cos(pz*TAU/128+seed)+5*TAU/64*Math.cos(pz*TAU/64+seed*1.7);
    const norm=Math.hypot(1,derivative),distance=Math.abs(main)*n.unit/norm;
    if(distance<best.distance)best={distance,x:x-main*n.unit,z,nx:1/norm,nz:-derivative/norm,width:n.width*n.unit*2,network,branch:false,line:Math.round((px-bend+start-main)/64)};
    const branchBend=Math.sin(px*TAU/256+seed*1.3)*15+Math.sin(px*TAU/128+seed)*6;
    const branch=wrap(pz-px*.5-branchBend-32,128),slope=.5+15*TAU/256*Math.cos(px*TAU/256+seed*1.3)+6*TAU/128*Math.cos(px*TAU/128+seed);
    const bn=Math.hypot(1,slope),bd=Math.abs(branch)*n.unit/bn;
    if(bd<best.distance)best={distance:bd,x,z:z-branch*n.unit,nx:-slope/bn,nz:1/bn,width:n.width*n.unit*2,network,branch:true,line:Math.round((pz-px*.5-branchBend-32-branch)/128)};
  }
  return best;
}
// Evaluate one street continuously. Holding the street identity avoids snapping
// to a different road at intersections while the world streams or normalizes.
export function streetRoutePoint(route,t,island='oahu'){
  const n=islandConfig(island).streets[route.network],seed=n.seed;
  let x,z,tx,tz;
  if(route.branch){
    x=t;const px=x/n.unit+n.shift[0];
    z=(px*.5+Math.sin(px*TAU/256+seed*1.3)*15+Math.sin(px*TAU/128+seed)*6+32+route.line*128-n.shift[1])*n.unit;
    tx=1;tz=.5+15*TAU/256*Math.cos(px*TAU/256+seed*1.3)+6*TAU/128*Math.cos(px*TAU/128+seed);
  }else{
    z=t;const pz=z/n.unit+n.shift[1];
    x=(Math.sin(pz*TAU/128+seed)*14+Math.sin(pz*TAU/64+seed*1.7)*5-Math.sin(seed)*14-Math.sin(seed*1.7)*5+route.line*64-n.shift[0])*n.unit;
    tx=14*TAU/128*Math.cos(pz*TAU/128+seed)+5*TAU/64*Math.cos(pz*TAU/64+seed*1.7);tz=1;
  }
  const length=Math.hypot(tx,tz);tx/=length;tz/=length;
  return{x:x+tz*(route.lane||0),z:z-tx*(route.lane||0),tx,tz};
}
export const ISLAND_LANDMARKS=[
  ...ISLAND_RIDGES.flatMap((path,range)=>path.map((p,index)=>({type:40,x:p[0],z:p[1],name:(range?'Windward':'Leeward')+' Peak '+(index+1)}))),
  ...[[900,450],[1350,650],[1750,450],[2200,600],[2550,450],[2900,200],[500,650]].map(p=>({type:39,x:p[0],z:p[1],name:'South Coast Tower'})),
  {type:38,x:-800,z:250,name:'Sunport Stadium'},
  {type:36,x:620,z:400,name:'Civic Clock Tower'},
  {type:35,x:-2100,z:-150,name:'Harbor Water Tower'},
  {type:31,x:280,z:-120,name:'City Park Oak'},
  ...[[-420,-190],[0,0],[600,80],[1250,150],[1900,180],[-2000,380],[3100,-950],[3370,-1450]].flatMap((center,block)=>
    Array.from({length:8},(_,plot)=>({type:plot%4===3?51:15,x:center[0]+(plot%4)*14-20,
      z:center[1]+Math.floor(plot/4)*20-8,name:plot%4===3?'Neighborhood Palm':'City Neighborhood House',neighborhood:true}))),
];
const LANAI_COAST=[[-3300,-1200],[-2700,-2700],[-1200,-3350],[400,-3400],
  [2000,-2850],[2900,-1800],[3300,-300],[2850,1400],[2050,2300],
  [850,3050],[-700,3200],[-1950,2550],[-2900,1500],[-3450,100]];
const LANAI_RIDGES=[[[500,-1500],[1100,-600],[1200,150],[650,900]]];
export const ISLANDS={
  oahu:{id:'oahu',name:'Oʻahu',half:6000,coast:ISLAND_COAST,ridges:ISLAND_RIDGES,streets:STREET_NETWORKS,
    landmarks:ISLAND_LANDMARKS,objectives:[[0,0],[28,-6],[145,-35],[640,130],[1700,-340],[2900,-1600],[3800,-1600]]},
  lanai:{id:'lanai',name:'Lānaʻi',half:4500,coast:LANAI_COAST,ridges:LANAI_RIDGES,
    streets:[{unit:2,width:.95,seed:.92,shift:[0,0]},{unit:16,width:.34,seed:2.1,shift:[22,-17]},{unit:42,width:.20,seed:3.8,shift:[-28,33]}],
    landmarks:[{type:40,x:1100,z:-600,name:'Lānaʻihale'},{type:47,x:-1900,z:-1000,name:'Keahiakawelo Rocks'},
      {type:47,x:-2250,z:-1500,name:'Garden Rock Spires'},{type:47,x:-1250,z:-1500,name:'Highland Rock Spires'},
      {type:49,x:-2400,z:900,name:'Kāholo Cliffs'},{type:49,x:2450,z:900,name:'Eastern Cliffs'},
      {type:48,x:1400,z:1750,name:'Mānele Resort'},{type:35,x:240,z:-160,name:'Village Water Tower'},
      {type:33,x:-700,z:-1300,name:'Highland Windmill'},{type:31,x:-180,z:100,name:'Town Square Tree'},
      ...[[0,0],[160,-160],[-180,150]].flatMap(center=>Array.from({length:10},(_,plot)=>({
        type:plot%3===2?50:15,x:center[0]+(plot%5)*16-25,z:center[1]+Math.floor(plot/5)*23-12,
        name:plot%3===2?'Town Square Pine':'Lānaʻi Village House',neighborhood:true})))],
    objectives:[[0,0],[28,-6],[130,35],[800,600],[-1100,-1000],[1100,-350],[1800,1700]]},
};
export function islandConfig(id='oahu'){return ISLANDS[id]||ISLANDS.oahu;}
