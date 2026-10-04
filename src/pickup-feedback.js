import * as THREE from 'three';
const CAPACITY=144;
export class PickupFeedback{
  constructor(scene){
    this.scene=scene;this.geometry=new THREE.BufferGeometry();this.positions=new Float32Array(CAPACITY*3);this.positions.fill(-10000);this.colors=new Float32Array(CAPACITY*3);
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.material=new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.85,depthWrite:false});this.mesh=new THREE.Points(this.geometry,this.material);this.mesh.frustumCulled=false;scene.add(this.mesh);
    this.slots=Array(CAPACITY).fill(null);this.cursor=0;this.pulse=0;
    this.palette=['#fff1a8','#ff88c9','#91f1fc'].map(color=>new THREE.Color(color));
  }
  collect(item,ground,diameter){
    const importance=item.importance||1,count=importance>=3?18:importance>=2?10:4;
    this.pulse=Math.max(this.pulse,importance===3?1:importance===2?.6:.2);
    for(let i=0;i<count;i++){
      const slot=this.cursor++%CAPACITY,a=i/count*Math.PI*2+(item.visualSeed%25),speed=diameter*(importance>=2?.75:.4),color=this.palette[(item.visualSeed+i)%3];
      this.positions.set([item.x,ground+diameter*.25,item.z],slot*3);this.colors.set(color.toArray(),slot*3);
      this.slots[slot]={life:importance>=2?.55:.28,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,vy:speed*.7};
    }
    this.geometry.attributes.color.needsUpdate=true;this.geometry.attributes.position.needsUpdate=true;
  }
  update(dt,diameter,animate=true){
    this.pulse*=Math.exp(-dt*9);this.material.size=Math.max(.012,diameter*.035);let visible=false;
    for(let i=0;i<CAPACITY;i++){
      const slot=this.slots[i];if(!slot)continue;slot.life-=dt;
      if(slot.life<=0||!animate){this.slots[i]=null;this.positions.set([-10000,-10000,-10000],i*3);continue;}
      visible=true;slot.vy-=diameter*dt*1.8;this.positions[i*3]+=slot.vx*dt;this.positions[i*3+1]+=slot.vy*dt;this.positions[i*3+2]+=slot.vz*dt;
    }
    this.mesh.visible=visible;this.geometry.attributes.position.needsUpdate=true;
    if(!animate)this.pulse=0;
  }
  transform(transform){
    for(let i=0;i<CAPACITY;i++){const slot=this.slots[i];if(!slot)continue;this.positions[i*3]=this.positions[i*3]*transform.scale+transform.x;this.positions[i*3+1]*=transform.scale;this.positions[i*3+2]=this.positions[i*3+2]*transform.scale+transform.z;slot.vx*=transform.scale;slot.vy*=transform.scale;slot.vz*=transform.scale;}
  }
  reset(){this.slots.fill(null);this.positions.fill(-10000);this.mesh.visible=false;this.pulse=0;this.geometry.attributes.position.needsUpdate=true;}
  dispose(){this.scene.remove(this.mesh);this.geometry.dispose();this.material.dispose();}
}
