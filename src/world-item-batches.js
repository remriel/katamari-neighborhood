import * as THREE from 'three';

function crossedBillboard(){
  const positions=[],uvs=[],indices=[];
  for(const angle of[0,Math.PI/4,Math.PI/2]){
    const base=positions.length/3,c=Math.cos(angle),s=Math.sin(angle);
    for(const[x,y]of[[-.5,0],[.5,0],[.5,1],[-.5,1]]){positions.push(x*c,y,x*s);uvs.push(x+.5,y);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

export class WorldItemBatches{
  constructor(scene,assets,shadowTexture){
    this.scene=scene;this.assets=assets;this.geometry=crossedBillboard();
    this.shadowGeometry=new THREE.PlaneGeometry(1,1);
    this.shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.72});
    this.shadow={pages:[],used:0};this.groups=new Map();this.matrix=new THREE.Matrix4();
    this.position=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.scale=new THREE.Vector3();
  }
  group(art){
    let group=this.groups.get(art);if(group)return group;
    group={pages:[],used:0};this.groups.set(art,group);return group;
  }
  page(group,art,index){
    if(group.pages[index])return group.pages[index];
    const texture=art===null?null:this.assets[art];
    let material;
    if(art===null)material=this.shadowMaterial;
    else{
      material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:false,alphaTest:.28,depthWrite:true});
      group.material=material;
    }
    const geometry=art===null?this.shadowGeometry:this.geometry;
    const mesh=new THREE.InstancedMesh(geometry,material,256);
    mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);group.pages[index]=mesh;return mesh;
  }
  begin(){
    for(const group of this.groups.values()){group.used=0;for(const mesh of group.pages)mesh.count=0;}
    this.shadow.used=0;for(const mesh of this.shadow.pages)mesh.count=0;
  }
  put(item,texture,yaw){
    const art=item.art??item.type;if(!texture)return;
    const aspect=texture.image.width/texture.image.height;
    const height=item.size*1.05/(item.fitSize?Math.max(1,aspect):1),width=height*aspect;
    const group=this.group(art),slot=group.used++,pageIndex=Math.floor(slot/256),index=slot%256;
    const mesh=this.page(group,art,pageIndex);
    mesh.count=index+1;
    this.position.set(item.x,height*.5+.025,item.z);this.rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    this.scale.set(width,height,.4);this.matrix.compose(this.position,this.rotation,this.scale);
    mesh.setMatrixAt(index,this.matrix);mesh.instanceMatrix.needsUpdate=true;
    if(item.size>.3){
      const shadowSlot=this.shadow.used++,shadowPage=Math.floor(shadowSlot/256),shadowIndex=shadowSlot%256;
      const shadow=this.page(this.shadow,null,shadowPage);shadow.count=shadowIndex+1;
      this.position.set(item.x,.012,item.z);this.rotation.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);this.scale.setScalar(item.size*.85);this.matrix.compose(this.position,this.rotation,this.scale);shadow.setMatrixAt(shadowIndex,this.matrix);shadow.instanceMatrix.needsUpdate=true;
    }
  }
  end(){
    for(const group of this.groups.values())for(let page=0;page<group.pages.length;page++)group.pages[page].count=Math.min(256,Math.max(0,group.used-page*256));
    for(let page=0;page<this.shadow.pages.length;page++)this.shadow.pages[page].count=Math.min(256,Math.max(0,this.shadow.used-page*256));
  }
  dispose(){
    for(const group of this.groups.values()){for(const mesh of group.pages){this.scene.remove(mesh);mesh.dispose();}group.material?.dispose();}
    for(const mesh of this.shadow.pages){this.scene.remove(mesh);mesh.dispose();}
    this.shadowMaterial.dispose();this.geometry.dispose();this.shadowGeometry.dispose();
  }
}
