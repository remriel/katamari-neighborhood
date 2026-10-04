import * as THREE from 'three';
import {POWERUP_VISUALS,powerupVisual,itemDisplaySize,powerupLift,powerupGlowVertex,powerupGlowFragment} from './powerup-visuals.js';

export class WorldItemBatches{
  constructor(scene,models,shadowTexture){
    this.scene=scene;this.models=models;this.groups=new Map();this.shadow={pages:[],used:0};
    this.shadowGeometry=new THREE.PlaneGeometry(1,1);
    this.shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.72});
    this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();
    this.up=new THREE.Vector3(0,1,0);this.shadowRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
    this.powerTilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
    this.powerRock=new THREE.Quaternion();this.screenAxis=new THREE.Vector3(0,0,1);
    this.billboardRotation=new THREE.Quaternion();this.identityRotation=new THREE.Quaternion();
    this.powerMaterials=new Map();this.effects=new Map();this.pixelsPerUnit=1;
    this.effectGeometry={halo:new THREE.PlaneGeometry(1,1),ring:new THREE.RingGeometry(.43,.49,40),beacon:new THREE.CylinderGeometry(.07,.19,1,12,1,true)};
    for(const power of Object.values(POWERUP_VISUALS)){
      const material=models.material.clone();material.emissive.set(power.color);material.emissiveIntensity=.65;material.roughness=.45;material.fog=false;material.toneMapped=false;
      this.powerMaterials.set(power.id,material);
      for(const kind of ['halo','ring','beacon']){
        const material=kind==='ring'?new THREE.MeshBasicMaterial({color:power.color,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,fog:false,toneMapped:false,forceSinglePass:true}):
          new THREE.ShaderMaterial({uniforms:{glowColor:{value:new THREE.Color(power.color)},beacon:{value:kind==='beacon'}},vertexShader:powerupGlowVertex,fragmentShader:powerupGlowFragment,
            transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,forceSinglePass:true});
        this.effects.set(power.id+':'+kind,{geometry:this.effectGeometry[kind],material,pages:[],used:0});
      }
    }
    this.visibleCount=0;this.modelCount=0;
    this.movers=[];
    this.heightAt=()=>0;
  }
  page(group,index){
    if(group.pages[index])return group.pages[index];
    const mesh=new THREE.InstancedMesh(group.geometry||group.model?.geometry||this.shadowGeometry,group.material||(group.model?this.models.material:this.shadowMaterial),256);
    mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);group.pages[index]=mesh;return mesh;
  }
  begin(){
    this.movers=[];
    for(const group of [...this.groups.values(),this.shadow,...this.effects.values()]){group.used=0;for(const mesh of group.pages)mesh.count=0;}
    this.visibleCount=0;this.modelCount=0;
  }
  put(item,pixelsPerUnit){
    const base=this.models.pick(item.type,item.visualSeed);
    if(!base)throw new Error('Missing 3D model for collectible '+item.type);
    this.pixelsPerUnit=pixelsPerUnit;
    const power=powerupVisual(item),displaySize=itemDisplaySize(item,pixelsPerUnit),pixels=displaySize*pixelsPerUnit;
    const detailed=Boolean(power)||pixels>=(item.renderDetailed?28:38),model=detailed?base:base.lod||base;
    item.renderModel=true;item.renderDetailed=detailed;
    const key=power?model.name+':'+power.id:model.name;
    let group=this.groups.get(key);
    if(!group){group={model,material:power?this.powerMaterials.get(power.id):this.models.material,pages:[],used:0};this.groups.set(key,group);}
    const slot=group.used++,index=slot%256,mesh=this.page(group,Math.floor(slot/256));mesh.count=index+1;
    const ground=this.heightAt(item.x,item.z);
    this.position.set(item.x,ground+.006,item.z);this.rotation.setFromAxisAngle(this.up,item.visualYaw??(item.visualSeed>>>0)/4294967296*Math.PI*2);
    const variation=[12,16,31,50,51].includes(item.type)?.96+((item.visualSeed>>>24)/255)*.08:1;
    this.scale.setScalar(displaySize*variation);this.matrix.compose(this.position,this.rotation,this.scale);
    mesh.setMatrixAt(index,this.matrix);mesh.instanceMatrix.needsUpdate=true;this.visibleCount++;this.modelCount++;
    const moving={item,mesh,index,scale:displaySize*variation,power};this.movers.push(moving);
    if(power){
      moving.effects=['halo','ring','beacon'].map(kind=>{
        const group=this.effects.get(power.id+':'+kind),slot=group.used++,index=slot%256,mesh=this.page(group,Math.floor(slot/256));mesh.count=index+1;
        return {kind,mesh,index};
      });
      this.updatePower(moving,ground,0,false);
    }
    if(item.size>.3){
      const slot=this.shadow.used++,index=slot%256,shadow=this.page(this.shadow,Math.floor(slot/256));shadow.count=index+1;
      this.position.set(item.x,ground+.012,item.z);this.scale.setScalar(power?displaySize*.85:item.size*.85);this.matrix.compose(this.position,this.shadowRotation,this.scale);
      shadow.setMatrixAt(index,this.matrix);shadow.instanceMatrix.needsUpdate=true;
      if(moving){moving.shadow=shadow;moving.shadowIndex=index;}
    }
  }
  end(){
    for(const group of [...this.groups.values(),this.shadow,...this.effects.values()])for(let page=0;page<group.pages.length;page++){
      const mesh=group.pages[page];mesh.count=Math.min(256,Math.max(0,group.used-page*256));mesh.visible=mesh.count>0;
    }
  }
  updatePower(entry,ground,time,animate){
    const {item}=entry,size=itemDisplaySize(item,this.pixelsPerUnit),lift=powerupLift(size,time,animate),visible=item.collected?0:1;
    entry.scale=size;
    this.position.set(item.x,ground+lift,item.z);
    // Keep the 3D symbol facing the player; a full spin can hide its thin face.
    this.powerRock.setFromAxisAngle(this.screenAxis,animate?Math.sin(time*1.5)*.14:0);
    this.rotation.copy(this.billboardRotation).multiply(this.powerRock).multiply(this.powerTilt);
    this.scale.setScalar(size*visible);this.matrix.compose(this.position,this.rotation,this.scale);
    entry.mesh.setMatrixAt(entry.index,this.matrix);entry.mesh.instanceMatrix.needsUpdate=true;
    const pulse=animate?1+Math.sin(time*3)*.07:1;
    for(const effect of entry.effects){
      if(effect.kind==='halo'){
        this.position.set(item.x,ground+lift+size*.3,item.z);this.rotation.copy(this.billboardRotation);this.scale.setScalar(size*2.65*pulse*visible);
      }else if(effect.kind==='ring'){
        this.position.set(item.x,ground+size*.025,item.z);this.rotation.copy(this.shadowRotation);this.scale.setScalar(size*2.05*pulse*visible);
      }else{
        this.position.set(item.x,ground+size*1.5,item.z);this.rotation.copy(this.identityRotation);this.scale.set(size*visible,size*3*visible,size*visible);
      }
      this.matrix.compose(this.position,this.rotation,this.scale);effect.mesh.setMatrixAt(effect.index,this.matrix);effect.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  updateMotion(time=0,animate=true,cameraRotation=null,pixelsPerUnit=this.pixelsPerUnit){
    this.pixelsPerUnit=pixelsPerUnit;if(cameraRotation)this.billboardRotation.copy(cameraRotation);
    for(const entry of this.movers){
      const {item,mesh,index}=entry;
      if(!item.motion&&!item.magnetized&&!entry.power)continue;
      const ground=this.heightAt(item.x,item.z);
      this.position.set(item.x,ground+.006+(item.visualBob||0),item.z);this.rotation.setFromAxisAngle(this.up,item.visualYaw);
      if(entry.power){this.updatePower(entry,ground,time,animate);}else{
        this.scale.setScalar(item.collected?0:entry.scale);this.matrix.compose(this.position,this.rotation,this.scale);
        mesh.setMatrixAt(index,this.matrix);mesh.instanceMatrix.needsUpdate=true;
      }
      if(entry.shadow){
        this.position.set(item.x,ground+.012,item.z);this.scale.setScalar(item.collected?0:entry.power?entry.scale*.85:item.size*.85);
        this.matrix.compose(this.position,this.shadowRotation,this.scale);entry.shadow.setMatrixAt(entry.shadowIndex,this.matrix);entry.shadow.instanceMatrix.needsUpdate=true;
      }
    }
  }
  dispose(){
    for(const group of [...this.groups.values(),this.shadow,...this.effects.values()])for(const mesh of group.pages){this.scene.remove(mesh);mesh.dispose();}
    for(const material of this.powerMaterials.values())material.dispose();
    for(const group of this.effects.values())group.material.dispose();
    for(const geometry of Object.values(this.effectGeometry))geometry.dispose();
    this.shadowMaterial.dispose();this.shadowGeometry.dispose();
  }
}
