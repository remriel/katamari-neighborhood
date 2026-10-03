import * as THREE from 'three';

function objectGeometry(){
  const positions=[],uvs=[],indices=[];
  for(const angle of[0,Math.PI/2,Math.PI/4]){
    const base=positions.length/3;
    for(const[x,y]of[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){positions.push(x*Math.cos(angle),y,x*Math.sin(angle));uvs.push(x+.5,y+.5);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);return geometry;
}
export class CompoundView{
  constructor(scene,assets,models){
    this.root=new THREE.Group();scene.add(this.root);this.assets=assets;this.models=models;this.geometry=objectGeometry();this.materials=new Map();this.batches=new Map();this.modelBatches=new Map();this.slots=[];this.body=null;this.scaleRevision=-1;
    this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();this.modelOffset=new THREE.Vector3();
  }
  reset(){
    for(const batch of this.batches.values())for(const mesh of batch.pages){this.root.remove(mesh);mesh.dispose?.();}
    for(const batch of this.modelBatches.values())for(const mesh of batch.pages){this.root.remove(mesh);mesh.dispose?.();}
    this.batches.clear();this.modelBatches.clear();this.slots=[];this.body=null;this.scaleRevision=-1;
  }
  allocate(art){
    let batch=this.batches.get(art);if(!batch){batch={used:0,pages:[]};this.batches.set(art,batch);}
    const page=Math.floor(batch.used/256),index=batch.used%256;
    if(!batch.pages[page]){
      if(!this.materials.has(art))this.materials.set(art,new THREE.MeshBasicMaterial({map:this.assets[art],side:THREE.DoubleSide,alphaTest:.28,depthWrite:true}));
      const mesh=new THREE.InstancedMesh(this.geometry,this.materials.get(art),256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(mesh);batch.pages.push(mesh);
    }
    batch.used++;const mesh=batch.pages[page];mesh.count=index+1;return{mesh,index};
  }
  allocateModel(model){
    let batch=this.modelBatches.get(model.name);
    if(!batch){batch={used:0,pages:[]};this.modelBatches.set(model.name,batch);}
    const page=Math.floor(batch.used/256),index=batch.used%256;
    if(!batch.pages[page]){
      const mesh=new THREE.InstancedMesh(model.geometry,this.models.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(mesh);batch.pages.push(mesh);
    }
    batch.used++;const mesh=batch.pages[page];mesh.count=index+1;return{mesh,index,model};
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
  sync(body,now=performance.now(),animate=true){
    if(this.body!==body){this.reset();this.body=body;}
    const rescaled=this.scaleRevision!==body.scaleRevision;
    for(let i=this.slots.length;i<body.pieces.length;i++){
      const piece=body.pieces[i],model=this.models?.pick(piece.type,piece.visualSeed),slot=model?this.allocateModel(model):this.allocate(piece.art);
      slot.born=animate?now:now-180;this.slots.push(slot);this.write(piece,slot,animate?0:1);
    }
    for(let i=0;i<body.pieces.length;i++){const slot=this.slots[i],progress=Math.min(1,(now-slot.born)/180);if(rescaled||progress<1||slot.animating)this.write(body.pieces[i],slot,progress);slot.animating=progress<1;}
    this.scaleRevision=body.scaleRevision;
  }
  pose(x,y,z,orientation){this.root.position.set(x,y,z);this.root.quaternion.fromArray(orientation);}
}
