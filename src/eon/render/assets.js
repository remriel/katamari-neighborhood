import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export class AssetLibrary{
  constructor(){this.manifest=null;this.models=new Map();this.textures=new Map();this.pending=new Map();this.loader=new GLTFLoader();}
  async init(){const response=await fetch('/eon/manifest.json');if(!response.ok)throw new Error('The era artwork manifest could not load.');this.manifest=await response.json();return this;}
  model(key){return this.models.get(key);}
  async loadModel(key){if(this.models.has(key))return this.models.get(key);if(this.pending.has(key))return this.pending.get(key);const spec=this.manifest.models[key];if(!spec)throw new Error('Missing era artwork: '+key);
    const promise=new Promise((resolve,reject)=>this.loader.load(spec.glb,gltf=>{
      gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),height=Math.max(.001,box.max.y-box.min.y);let mesh;
      gltf.scene.traverse(object=>{if(object.isMesh&&!mesh)mesh=object;});if(!mesh){reject(new Error('Empty 3D artwork: '+key));return;}
      const normalization=new THREE.Matrix4().makeScale(1/height,1/height,1/height).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z)).multiply(mesh.matrixWorld);
      const geometry=mesh.geometry.clone().applyMatrix4(normalization);geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());
      const material=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).clone();material.alphaTest=.22;material.transparent=false;material.side=THREE.DoubleSide;material.roughness=.85;material.metalness=0;
      const model={geometry,material,ratio:size.x,depth:size.z,key};this.models.set(key,model);resolve(model);
    },undefined,()=>reject(new Error('A 3D object could not load: '+key))));this.pending.set(key,promise);return promise;
  }
  async loadGround(id){if(this.textures.has(id))return this.textures.get(id);const url=this.manifest.eras[id].ground;const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;this.textures.set(id,texture);return texture;}
  async loadEra(id){await Promise.all([...Array.from({length:9},(_,i)=>this.loadModel(`${id}:${i}`)),this.loadModel('cells:8'),this.loadGround(id)]);}
}
