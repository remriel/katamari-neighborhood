import * as THREE from 'three';

export class WorldItemBatches{
  constructor(scene,models,shadowTexture){
    this.scene=scene;this.models=models;this.groups=new Map();this.shadow={pages:[],used:0};
    this.shadowGeometry=new THREE.PlaneGeometry(1,1);
    this.shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.72});
    this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();
    this.up=new THREE.Vector3(0,1,0);this.shadowRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
    this.visibleCount=0;this.modelCount=0;
  }
  page(group,index){
    if(group.pages[index])return group.pages[index];
    const mesh=new THREE.InstancedMesh(group.model?.geometry||this.shadowGeometry,group.model?this.models.material:this.shadowMaterial,256);
    mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);group.pages[index]=mesh;return mesh;
  }
  begin(){
    for(const group of [...this.groups.values(),this.shadow]){group.used=0;for(const mesh of group.pages)mesh.count=0;}
    this.visibleCount=0;this.modelCount=0;
  }
  put(item,pixelsPerUnit){
    const base=this.models.pick(item.type,item.visualSeed);
    if(!base)throw new Error('Missing 3D model for collectible '+item.type);
    const pixels=item.size*1.05*pixelsPerUnit;
    const detailed=pixels>=(item.renderDetailed?28:38),model=detailed?base:base.lod||base;
    item.renderModel=true;item.renderDetailed=detailed;
    let group=this.groups.get(model.name);
    if(!group){group={model,pages:[],used:0};this.groups.set(model.name,group);}
    const slot=group.used++,index=slot%256,mesh=this.page(group,Math.floor(slot/256));mesh.count=index+1;
    this.position.set(item.x,.006,item.z);this.rotation.setFromAxisAngle(this.up,item.visualYaw??(item.visualSeed>>>0)/4294967296*Math.PI*2);
    const variation=[12,16,31,50,51].includes(item.type)?.96+((item.visualSeed>>>24)/255)*.08:1;
    this.scale.setScalar(item.size*1.05*variation);this.matrix.compose(this.position,this.rotation,this.scale);
    mesh.setMatrixAt(index,this.matrix);mesh.instanceMatrix.needsUpdate=true;this.visibleCount++;this.modelCount++;
    if(item.size>.3){
      const slot=this.shadow.used++,index=slot%256,shadow=this.page(this.shadow,Math.floor(slot/256));shadow.count=index+1;
      this.position.set(item.x,.012,item.z);this.scale.setScalar(item.size*.85);this.matrix.compose(this.position,this.shadowRotation,this.scale);
      shadow.setMatrixAt(index,this.matrix);shadow.instanceMatrix.needsUpdate=true;
    }
  }
  end(){
    for(const group of [...this.groups.values(),this.shadow])for(let page=0;page<group.pages.length;page++){
      const mesh=group.pages[page];mesh.count=Math.min(256,Math.max(0,group.used-page*256));mesh.visible=mesh.count>0;
    }
  }
  dispose(){
    for(const group of [...this.groups.values(),this.shadow])for(const mesh of group.pages){this.scene.remove(mesh);mesh.dispose();}
    this.shadowMaterial.dispose();this.shadowGeometry.dispose();
  }
}
