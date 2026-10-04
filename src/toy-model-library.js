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
    const loader=new GLTFLoader();
    const [libraries,lod]=await Promise.all([Promise.all([this.manifest.library,...(this.manifest.extraLibraries||[])].map(path=>loader.loadAsync(path))),this.manifest.lod?loader.loadAsync(this.manifest.lod):Promise.resolve(null)]);
    for(const gltf of libraries){
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(node=>{
        const meta=this.manifest.models?.[node.name];
        if(!node.isMesh||!meta)return;
        const geometry=node.geometry.clone();
        // Quantized accessors must be expanded before changing their coordinate frame.
        for(const key of ['position','normal']){
          const attribute=geometry.getAttribute(key);if(!attribute)continue;
          const values=new Float32Array(attribute.count*3);
          for(let i=0;i<attribute.count;i++){values[i*3]=attribute.getX(i);values[i*3+1]=attribute.getY(i);values[i*3+2]=attribute.getZ(i);}
          geometry.setAttribute(key,new THREE.BufferAttribute(values,3));
        }
        geometry.applyMatrix4(node.matrixWorld);
        geometry.computeBoundingBox();
        const bounds=geometry.boundingBox,size=new THREE.Vector3();
        bounds.getSize(size);
        const extent=Math.max(size.x,size.y,size.z);
        if(!extent||!geometry.getAttribute('color')){geometry.dispose();return;}
        const pivot=new THREE.Vector3((bounds.min.x+bounds.max.x)/2,bounds.min.y,(bounds.min.z+bounds.max.z)/2);
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
          geometry,extent,pivot,bounds:new THREE.Vector3(width,height,depth)});
      });
    }
    const expected=Object.keys(this.manifest.models||{}).length;
    if(this.models.size!==expected)throw new Error('The toy-town model library is incomplete ('+this.models.size+'/'+expected+').');
    if(lod){
      lod.scene.updateMatrixWorld(true);let count=0;
      lod.scene.traverse(node=>{
        const model=this.models.get(node.name);if(!node.isMesh||!model)return;
        const geometry=node.geometry.clone();
        for(const key of ['position','normal']){
          const attribute=geometry.getAttribute(key);if(!attribute)continue;
          const values=new Float32Array(attribute.count*3);
          for(let i=0;i<attribute.count;i++){values[i*3]=attribute.getX(i);values[i*3+1]=attribute.getY(i);values[i*3+2]=attribute.getZ(i);}
          geometry.setAttribute(key,new THREE.BufferAttribute(values,3));
        }
        geometry.applyMatrix4(node.matrixWorld);
        // Both detail levels use the original bounds, never independently re-center.
        geometry.translate(-model.pivot.x,-model.pivot.y,-model.pivot.z);
        geometry.scale(1/model.extent,1/model.extent,1/model.extent);geometry.computeBoundingSphere();
        model.lod={name:model.name+':far',geometry,bounds:model.bounds};count++;
      });
      const expectedLod=Object.values(this.manifest.models).filter(model=>!model.supplemental).length;
      if(count!==expectedLod)throw new Error('The distant model library is incomplete ('+count+'/'+expectedLod+').');
    }
    for(const library of [...libraries,lod])library?.scene.traverse(node=>{if(node.isMesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();}});
    return this;
  }
  pick(type,seed=0){
    const entry=this.manifest?.types?.[String(type)];
    if(!entry?.models?.length)return null;
    const index=(seed>>>0)%entry.models.length;
    return this.models.get(entry.models[index])||null;
  }
  dispose(){
    for(const model of this.models.values()){model.geometry.dispose();model.lod?.geometry.dispose();}
    this.models.clear();this.material.dispose();
  }
}
