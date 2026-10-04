// DEV/acceptance only. Drives ordinary controls; never injects growth, objects,
// timer bonuses, chapter progress, or collected attachments.
export class RoutePilot{
  constructor(sim){this.sim=sim;this.world=sim.world;this.target=null;this.chooseAt=0;this.avoid=new Map();this.lastX=sim.x;this.lastZ=sim.z;this.lastLevel=sim.level;this.lastChapter=sim.chapter;this.stuck=0;this.snapshots=[];}
  input(dt){
    const sim=this.sim;
    if(sim.level!==this.lastLevel||sim.chapter!==this.lastChapter){this.lastLevel=sim.level;this.lastChapter=sim.chapter;this.lastX=sim.x;this.lastZ=sim.z;this.stuck=0;this.target=null;}
    if(Math.hypot(sim.x-this.lastX,sim.z-this.lastZ)<dt*.12)this.stuck+=dt;else this.stuck=0;
    this.lastX=sim.x;this.lastZ=sim.z;
    if(this.stuck>1.8&&this.target){this.avoid.set(this.target.id,sim.elapsed+8);this.target=null;this.stuck=0;}
    if(!this.target||this.target.collected||sim.elapsed>=this.chooseAt){
      const objective=sim.objective(),usable=i=>!i.collected&&!i.powerup&&sim.canCollect(i)&&(this.avoid.get(i.id)||0)<=sim.elapsed;
      const opening=sim.items.filter(i=>(i.route==='opening'&&sim.chapter===0||i.route==='stage-trail'&&i.stageIndex===sim.chapter)&&usable(i)).sort((a,b)=>(a.route==='opening'?0:1)-(b.route==='opening'?0:1)||a.routeOrder-b.routeOrder)[0];
      let candidates=sim.items.filter(i=>usable(i)&&i.size>=sim.diameter*.18);
      if(!candidates.length)candidates=sim.items.filter(usable);
      candidates.sort((a,b)=>cost(a)-cost(b));
      function cost(i){return Math.hypot(i.x-sim.x,i.z-sim.z)/(.05+(i.size/sim.diameter)**3);}
      this.target=(opening||objective&&usable(objective)&&sim.count>=sim.chapterGoal().count)?opening||objective:candidates[0];this.chooseAt=sim.elapsed+.4;
    }
    const objective=sim.objective();
    let x=(this.target?.x??objective?.x??sim.x+7)-sim.x,z=(this.target?.z??objective?.z??sim.z-5)-sim.z;
    const distance=Math.hypot(x,z)||1;
    x/=distance;z/=distance;
    if(this.stuck>.4){const a=.8*sim.navSide,s=Math.sin(a),c=Math.cos(a);[x,z]=[x*c-z*s,x*s+z*c];}
    return {x,z,boost:sim.boostEnergy>35&&distance>Math.max(1,sim.diameter*.5)};
  }
}
