import * as THREE from 'three';

export class CompoundView{
  constructor(scene,models){
    this.root=new THREE.Group();scene.add(this.root);this.models=models;this.modelBatches=new Map();this.slots=[];this.body=null;this.scaleRevision=-1;
    this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();this.modelOffset=new THREE.Vector3();
  }
  reset(){
    for(const batch of this.modelBatches.values()){
      batch.used=0;batch.piece=null;batch.detailed=false;
      for(const mesh of batch.pages){mesh.count=0;mesh.visible=false;}
    }
    this.slots=[];this.body=null;this.scaleRevision=-1;
  }
  prewarm(){
    for(const model of this.models.models.values())if(model.type!=='guide'){
      const slot=this.allocateModel(model);slot.mesh.setMatrixAt(slot.index,new THREE.Matrix4());slot.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  prewarmFar(){
    for(const batch of this.modelBatches.values())for(const mesh of batch.pages)mesh.geometry=(batch.model.lod||batch.model).geometry;
  }
  dispose(){
    for(const batch of this.modelBatches.values())for(const mesh of batch.pages){this.root.remove(mesh);mesh.dispose();}
    this.modelBatches.clear();this.slots=[];
  }
  allocateModel(model){
    let batch=this.modelBatches.get(model.name);
    if(!batch){batch={used:0,pages:[],model,detailed:true,piece:null};this.modelBatches.set(model.name,batch);}
    const page=Math.floor(batch.used/256),index=batch.used%256;
    if(!batch.pages[page]){
      const mesh=new THREE.InstancedMesh(model.geometry,this.models.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(mesh);batch.pages.push(mesh);
    }
    batch.used++;const mesh=batch.pages[page];mesh.count=index+1;mesh.visible=true;return{mesh,index,model,batch};
  }
  write(piece,slot,progress=1){
    this.position.fromArray(piece.center);
    if(piece.source&&progress<1){const eased=1-(1-progress)**3;this.position.fromArray(piece.source.map((v,i)=>v+(piece.center[i]-v)*eased));}
    this.rotation.fromArray(piece.rotation);
    if(slot.model){
      this.scale.setScalar(piece.size*1.05);
      this.modelOffset.set(0,-slot.model.bounds.y*this.scale.x*.5,0).applyQuaternion(this.rotation);
      this.position.add(this.modelOffset);
    }else this.scale.fromArray(piece.dimensions);
    this.matrix.compose(this.position,this.rotation,this.scale);slot.mesh.setMatrixAt(slot.index,this.matrix);slot.mesh.instanceMatrix.needsUpdate=true;
  }
  sync(body,now=performance.now(),animate=true,pixelsPerUnit=100){
    if(this.body!==body){this.reset();this.body=body;}
    const rescaled=this.scaleRevision!==body.scaleRevision;
    for(let i=this.slots.length;i<body.pieces.length;i++){
      const piece=body.pieces[i],model=this.models.pick(piece.type,piece.visualSeed);
      if(!model)throw new Error('Missing attached 3D model '+piece.type);
      const slot=this.allocateModel(model);
      slot.batch.piece??=piece;
      slot.born=animate?now:now-180;this.slots.push(slot);this.write(piece,slot,animate?0:1);
    }
    // A family's physical size is fixed, so every instance in a variant batch
    // shares the projected size. Change cached geometry without reallocating
    // slots, restarting attachment motion, or dropping any collected object.
    for(const batch of this.modelBatches.values()){
      if(!batch.piece)continue;
      const detailed=batch.piece.size*pixelsPerUnit>=(batch.detailed?28:38);
      const geometry=(!detailed&&batch.model.lod?batch.model.lod:batch.model).geometry;
      batch.detailed=detailed;for(const mesh of batch.pages)if(mesh.geometry!==geometry)mesh.geometry=geometry;
    }
    for(let i=0;i<body.pieces.length;i++){const slot=this.slots[i],progress=Math.min(1,(now-slot.born)/180);if(rescaled||progress<1||slot.animating)this.write(body.pieces[i],slot,progress);slot.animating=progress<1;}
    this.scaleRevision=body.scaleRevision;
  }
  pose(x,y,z,orientation){this.root.position.set(x,y,z);this.root.quaternion.fromArray(orientation);}
}
