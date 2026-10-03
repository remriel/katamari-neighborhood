import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export class ToyModelLibrary{
  constructor(){
    this.manifest=null;
    this.models=new Map();
    this.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:0,flatShading:true});
  }
  async load(){
    const response=await fetch('/models/manifest.json');
    if(!response.ok)throw new Error('The toy-town model manifest could not load.');
    this.manifest=await response.json();
    const gltf=await new GLTFLoader().loadAsync(this.manifest.library);
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(node=>{
      const meta=this.manifest.models?.[node.name];
      if(!node.isMesh||!meta)return;
      const geometry=node.geometry.clone();
      geometry.applyMatrix4(node.matrixWorld);
      geometry.computeBoundingBox();
      const bounds=geometry.boundingBox,size=new THREE.Vector3();
      bounds.getSize(size);
      const extent=Math.max(size.x,size.y,size.z);
      if(!extent||!geometry.getAttribute('color')){geometry.dispose();return;}
      geometry.scale(1/extent,1/extent,1/extent);
      geometry.computeBoundingBox();
      const normalized=geometry.boundingBox;
      const width=normalized.max.x-normalized.min.x;
      const height=normalized.max.y-normalized.min.y;
      const depth=normalized.max.z-normalized.min.z;
      geometry.translate(-(normalized.min.x+normalized.max.x)/2,-normalized.min.y,-(normalized.min.z+normalized.max.z)/2);
      geometry.computeBoundingSphere();
      this.models.set(node.name,{name:node.name,type:meta.type,family:meta.family,variant:meta.variant,triangles:meta.triangles,
        minScreenPixels:this.manifest.types[String(meta.type)]?.minScreenPixels??30,
        geometry,bounds:new THREE.Vector3(width,height,depth)});
    });
    const expected=Object.keys(this.manifest.models||{}).length;
    if(this.models.size!==expected)throw new Error('The toy-town model library is incomplete ('+this.models.size+'/'+expected+').');
    return this;
  }
  pick(type,seed=0){
    const entry=this.manifest?.types?.[String(type)];
    if(!entry?.models?.length)return null;
    const index=(seed>>>0)%entry.models.length;
    return this.models.get(entry.models[index])||null;
  }
  dispose(){
    for(const model of this.models.values())model.geometry.dispose();
    this.models.clear();this.material.dispose();
  }
}
