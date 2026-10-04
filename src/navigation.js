// Navigation uses a compact gameplay envelope. The full compound remains
// responsible for floor contact, rocking and visible protrusions.
export const navigationRadius=(diameter,coreRadius)=>Math.max(coreRadius,diameter*.34);
export function slidePastObstacles(x,z,vx,vz,radius,obstacles,dt,options={}){
  const speed=Math.hypot(vx,vz),distance=speed*dt;
  const clear=(px,pz)=>obstacles.every(o=>(px-o.x)**2+(pz-o.z)**2>=(radius+o.radius)**2-1e-8);
  const fromX=options.fromX??x-vx*dt,fromZ=options.fromZ??z-vz*dt;
  if(distance>0&&!clear(x,z)&&clear(fromX,fromZ)){
    const ix=options.intentX??vx,iz=options.intentZ??vz,length=Math.hypot(ix,iz)||1;
    // Find a free short step around a corner, always trying the same side first.
    // Includes backward angles so opposite blockers cannot cage the controller.
    for(const side of [options.side||1,-(options.side||1)])for(let turn=1;turn<=12;turn++){
      const angle=turn*Math.PI/12*side,c=Math.cos(angle),s=Math.sin(angle);
      const sx=(ix*c-iz*s)/length*speed,sz=(ix*s+iz*c)/length*speed;
      const px=fromX+sx*dt,pz=fromZ+sz*dt;
      if(clear(px,pz))return{x:px,z:pz,vx:sx,vz:sz,assisted:true};
    }
  }
  let assisted=false;
  for(let pass=0;pass<4;pass++){
    let overlapFound=false;
    for(const obstacle of obstacles){
      const dx=x-obstacle.x,dz=z-obstacle.z,reach=radius+obstacle.radius,dist=Math.hypot(dx,dz);
      if(dist>=reach)continue;
      overlapFound=true;
      const nx=dist>1e-7?dx/dist:(speed?vx/speed:1),nz=dist>1e-7?dz/dist:(speed?vz/speed:0);
      x+=nx*(reach-dist+1e-5);z+=nz*(reach-dist+1e-5);
      const inward=vx*nx+vz*nz;
      if(inward<0){
        vx-=inward*nx;vz-=inward*nz;
        // Straight-on input automatically glides around the obstacle instead
        // of reducing both velocity components to zero forever.
        if(!assisted&&Math.hypot(vx,vz)<speed*.3&&distance>0){
          const side=(obstacle.visualSeed>>>0)%2?1:-1;
          vx=-nz*side*speed*.75;vz=nx*side*speed*.75;
          x+=vx*dt*.7;z+=vz*dt*.7;assisted=true;
        }
      }
    }
    if(!overlapFound)break;
  }
  return{x,z,vx,vz,assisted};
}
