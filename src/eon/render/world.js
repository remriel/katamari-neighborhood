import * as THREE from 'three';
import {CompoundBall} from '../../compound-ball.js';
import {hash,clamp,ERAS} from '../config.js';
import {PhysicalAggregate} from './physics.js';

class InstanceBank{
  constructor(root,assets){this.root=root;this.assets=assets;this.batches=new Map();this.matrix=new THREE.Matrix4();this.p=new THREE.Vector3();this.q=new THREE.Quaternion();this.s=new THREE.Vector3();}
  reset(){for(const batch of this.batches.values()){batch.used=0;for(const mesh of batch.pages)mesh.count=0;}}
  put(key,position,rotation,scale,pick=null){
    const model=this.assets.model(key);if(!model)return;
    let batch=this.batches.get(key);if(!batch){batch={used:0,pages:[]};this.batches.set(key,batch);}
    const page=Math.floor(batch.used/256),index=batch.used%256;batch.used++;
    if(!batch.pages[page]){const mesh=new THREE.InstancedMesh(model.geometry,model.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.userData.picks=[];this.root.add(mesh);batch.pages.push(mesh);}
    const mesh=batch.pages[page];this.p.fromArray(position);this.q.fromArray(rotation);this.s.fromArray(scale);this.matrix.compose(this.p,this.q,this.s);mesh.setMatrixAt(index,this.matrix);mesh.instanceMatrix.needsUpdate=true;mesh.count=index+1;mesh.userData.picks[index]=pick;
  }
  dispose(){for(const batch of this.batches.values())for(const mesh of batch.pages){this.root.remove(mesh);mesh.dispose?.();}this.batches.clear();}
  meshes(){return Array.from(this.batches.values()).flatMap(b=>b.pages);}
}
function line(points,color,width=1){const geometry=new THREE.BufferGeometry().setFromPoints(points);return new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.72,linewidth:width,depthWrite:false}));}
function ring(x,z,r,color){const points=Array.from({length:65},(_,i)=>new THREE.Vector3(x+Math.cos(i/64*Math.PI*2)*r,.045,z+Math.sin(i/64*Math.PI*2)*r));return line(points,color);}
export class WorldRenderer{
  constructor(canvas,assets){
    this.assets=assets;this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2.2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,600);this.raycaster=new THREE.Raycaster();this.follow=new THREE.Vector3();this.yaw=0;this.targetYaw=0;this.span=30;this.current=null;
    this.scene.add(new THREE.HemisphereLight('#fff8e9','#5c5575',2.0));const sunlight=new THREE.DirectionalLight('#fff0d2',2.1);sunlight.position.set(-20,40,30);this.scene.add(sunlight);
    this.resize();
  }
  resize(){this.renderer.setSize(this.canvas.clientWidth,this.canvas.clientHeight,false);}
  createEraView(module){this.current?.dispose();const view=new EraView(this,module);this.current=view;this.follow.set(module.state.x,0,module.state.z);this.span=module.viewConfig.span;this.targetYaw=this.yaw=0;return view;}
  update(dt){if(!this.current)return;this.current.update(dt);const module=this.current.module,cfg=module.viewConfig,aspect=this.canvas.clientWidth/Math.max(1,this.canvas.clientHeight);
    const fixed=cfg.camera==='network',target=fixed?new THREE.Vector3(0,0,2):new THREE.Vector3(module.state.x,1,module.state.z);
    this.follow.lerp(target,1-Math.exp(-dt*4));this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*5));
    const bound=this.current.compound.boundRadius,desired=(fixed?Math.max(cfg.span,72/aspect):Math.max(cfg.span,bound*5/Math.max(.5,aspect)))*(this.zoomMultiplier||1);this.span+=(desired-this.span)*(1-Math.exp(-Math.max(dt,.016)*3));
    const altitude=cfg.camera==='float'?1.8:cfg.camera==='fluid'?1.8:cfg.camera==='network'?2:cfg.camera==='orbit'?1.2:1.3;
    const dist=80+this.span;this.camera.position.set(this.follow.x+Math.sin(this.yaw)*dist,this.follow.y+dist*altitude,this.follow.z+Math.cos(this.yaw)*dist);this.camera.lookAt(this.follow);
    this.camera.left=-this.span*aspect/2;this.camera.right=this.span*aspect/2;this.camera.top=this.span/2;this.camera.bottom=-this.span/2;this.camera.far=dist*6;this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene,this.camera);
  }
  pick(clientX,clientY){if(!this.current)return null;const rect=this.canvas.getBoundingClientRect(),ndc=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(ndc,this.camera);
    const hits=this.raycaster.intersectObjects([...this.current.field.meshes(),...this.current.slotObjects],false);for(const hit of hits){const result=hit.object.userData.picks?.[hit.instanceId]||hit.object.userData.pick;if(result)return result;}return null;
  }
  rotate(){this.targetYaw+=Math.PI/4;}
}
class EraView{
  constructor(renderer,module){
    this.renderer=renderer;this.module=module;this.assets=renderer.assets;this.root=new THREE.Group();renderer.scene.add(this.root);this.fieldRoot=new THREE.Group();this.actor=new THREE.Group();this.root.add(this.fieldRoot,this.actor);this.field=new InstanceBank(this.fieldRoot,this.assets);this.attached=new InstanceBank(this.actor,this.assets);this.annotations=new THREE.Group();this.root.add(this.annotations);this.slotObjects=[];this.linksKey='';this.compound=new CompoundBall();this.compound.rescale(6.25);this.compound.revision=0;
    this.physical=module.viewConfig.physical?new PhysicalAggregate(module.state.x,module.state.z):null;
    const palette=module.meta.palette;renderer.scene.background=new THREE.Color(palette[0]);renderer.scene.fog=new THREE.Fog(palette[0],170,400);
    const ground=this.assets.textures.get(module.id).clone();ground.wrapS=ground.wrapT=THREE.RepeatWrapping;ground.repeat.set(18,18);ground.anisotropy=Math.min(8,renderer.renderer.capabilities.getMaxAnisotropy());ground.needsUpdate=true;
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(280,280),new THREE.MeshBasicMaterial({map:ground}));this.ground.rotation.x=-Math.PI/2;this.root.add(this.ground);
    this.ledgerLength=-1;this.rebuildBody();this.makeSlots();
  }
  seedKey(){return this.module.id==='matter'?'cells:8':`${this.module.id}:${this.module.viewConfig.playerKind}`;}
  rebuildBody(){
    const entries=this.module.campaign.state.ledger.filter(record=>record.eraId===this.module.id);this.compound=new CompoundBall();this.compound.rescale(6.25);this.compound.revision=0;
    for(const record of entries)this.addRecord(record,false);
    const snapshot=this.module.state.bodySnapshot;if(snapshot?.orientation)this.compound.orientation=snapshot.orientation;if(snapshot?.height)this.compound.height=snapshot.height;
    this.ledgerLength=this.module.campaign.state.ledger.length;this.physical?.recover(this.module.state.x,this.module.state.z,this.compound);
  }
  addRecord(record,notify=true){
    if(record.eraId!==this.module.id)return;const model=this.assets.model(record.assetKey);if(!model)return;
    const kind=Number(record.assetKey.split(':')[1]),existing=record.relativeTransform;
    if(!existing.position||existing.fixed===false){
      const angle=(hash(record.id)%10000)/10000*Math.PI*2,size=this.module.id==='planets'?(kind>=2&&kind<=4?2.8:1):this.module.id==='organisms'?1.3:1;
      const item={id:record.id,type:kind,size,name:record.name,visualSeed:hash(record.id),x:this.module.state.x+Math.cos(angle)*2,z:this.module.state.z+Math.sin(angle)*2};
      const piece=this.compound.attach(item,{art:record.assetKey,name:record.name,fitSize:true},model.ratio,this.module.state.x,this.module.state.z);
      record.relativeTransform={position:piece.center,rotation:piece.rotation,dimensions:piece.dimensions,fixed:true};
    }else{
      // Restore stored local placement exactly, including hand-placed buildings.
      const dimensions=existing.dimensions||[2,2,2],center=existing.position,rotation=existing.rotation||[0,0,0,1];
      const piece={id:record.id,type:kind,art:record.assetKey,name:record.name,size:Math.max(...dimensions),center:[...center],rotation:[...rotation],dimensions:[...dimensions],corners:[]};this.compound.pieces.push(piece);
      for(let x=-1;x<=1;x+=2)for(let y=-1;y<=1;y+=2)for(let z=-1;z<=1;z+=2){const corner=new THREE.Vector3(x*dimensions[0]/2,y*dimensions[1]/2,z*dimensions[2]/2).applyQuaternion(new THREE.Quaternion().fromArray(rotation)).add(new THREE.Vector3().fromArray(center));const p=corner.toArray();piece.corners.push(p);this.compound.boundRadius=Math.max(this.compound.boundRadius,corner.length());for(let i=0;i<this.compound.points.length;i++){const old=this.compound.points[i],length=Math.hypot(...old)||1,n=old.map(v=>v/length),support=p[0]*n[0]+p[1]*n[1]+p[2]*n[2];if(support>this.compound.supports[i]){this.compound.points[i]=p;this.compound.supports[i]=support;}}}
      this.compound.revision++;
    }
    if(notify)this.module.state.bodySnapshot={orientation:[...this.compound.orientation],height:this.compound.height};this.ledgerLength=this.module.campaign.state.ledger.length;
  }
  makeSlots(){for(const slot of this.module.viewConfig.slots||[]){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),new THREE.MeshBasicMaterial({color:'#fcdf9e',transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(slot.x,1.08,slot.z);mesh.userData.pick={slot:slot.id};this.actor.add(mesh);this.slotObjects.push(mesh);
  }}
  update(dt){
    const module=this.module,state=module.state,cfg=module.viewConfig;
    if(this.physical&&!state.complete)this.physical.step(dt,state,this.compound);
    else if(cfg.mode==='move'&&module.id!=='planets'){const speed=Math.hypot(state.vx,state.vz);if(speed>.05)this.compound.advance(state.vx*dt,state.vz*dt,dt);}
    state.bodySnapshot={orientation:[...this.compound.orientation],height:this.compound.height};
    const y=module.id==='organisms'?this.compound.height:module.id==='villages'?1.0:module.id==='civilizations'?0:module.id==='planets'?4:2.5;
    this.actor.position.set(cfg.camera==='network'?0:state.x,y,cfg.camera==='network'?0:state.z);this.actor.quaternion.fromArray(module.id==='villages'||module.id==='civilizations'?[0,0,0,1]:this.compound.orientation);
    if(module.id==='matter')this.actor.rotation.y=state.angle;
    this.field.reset();this.attached.reset();
    this.attached.put(this.seedKey(),[0,0,0],[0,0,0,1],[2,2,2]);
    for(const record of module.campaign.state.ledger.filter(r=>r.eraId===module.id)){if(module.id==='civilizations'&&['city','energy','trade','research'].includes(record.role))continue;const t=record.relativeTransform;if(!t.position)continue;const model=this.assets.model(record.assetKey),dims=t.dimensions||[2,2,2];this.attached.put(record.assetKey,t.position,t.rotation||[0,0,0,1],[dims[0]/Math.max(.01,model.ratio),dims[1],dims[2]/Math.max(.01,model.depth)]);}
    for(const [path,rank]of Object.entries(module.campaign.state.build)){const kind={cohesion:1,motion:3,symbiosis:4}[path];for(let n=0;n<rank;n++){const angle=n*2.4+{cohesion:0,motion:2,symbiosis:4}[path],radius=1.2+rank*.15;this.attached.put(module.id+':'+kind,[Math.cos(angle)*radius,.6,Math.sin(angle)*radius],[0,0,0,1],[.65,.65,.65]);}}
    // Earlier layers stay nested in the ancestry. A small ancestral seed is a
    // render proxy; the archive reconstructs their complete saved local bodies.
    if(module.index>0)this.attached.put('cells:8',[0,0,0],[0,0,0,1],[.28,.28,.28]);
    for(const e of cfg.entities){if(module.campaign.has(e.id)&&!e.interactive)continue;const key=`${module.id}:${e.kind}`,model=this.assets.model(key);if(!model)continue;const size=e.size||1,h=size/Math.max(1,model.ratio),hover=module.id==='matter'||module.id==='cells'?2+.25*Math.sin(state.time+e.kind):module.id==='planets'?4:0;
      this.field.put(key,[e.x,h*.5+hover,e.z],[0,0,0,1],[h,h,h],e.interactive?{entity:e.id}:null);
    }
    if(module.id==='civilizations')for(let i=0;i<state.cities.length;i++)for(const hub of state.cities[i].hubs){const kind={energy:3,trade:4,research:5}[hub],city=cfg.entities[i];this.field.put(`civilizations:${kind}`,[city.x+3+state.cities[i].hubs.indexOf(hub)*2,1.8,city.z+4],[0,0,0,1],[3,3,3]);}
    for(const slot of this.slotObjects)slot.visible=!cfg.buildings?.some(b=>b.slot===slot.userData.pick.slot);
    this.drawAnnotations(cfg);
  }
  drawAnnotations(cfg){
    const key=JSON.stringify({links:cfg.links,goal:cfg.goal&&[cfg.goal.x,cfg.goal.z],orbit:cfg.stabilityOrbit,trajectory:cfg.trajectory,angle:cfg.bondAngle,active:cfg.activeKind});if(key===this.linksKey)return;this.linksKey=key;
    for(const object of [...this.annotations.children]){this.annotations.remove(object);object.geometry?.dispose();object.material?.dispose();}
    for(const link of cfg.links||[]){const offset=link.local?this.actor.position:new THREE.Vector3();this.annotations.add(line([new THREE.Vector3(link.a.x+offset.x,.12,link.a.z+offset.z),new THREE.Vector3(link.b.x+offset.x,.12,link.b.z+offset.z)],link.broken?'#f17880':'#a9ecd2'));}
    if(cfg.goal)this.annotations.add(ring(cfg.goal.x,cfg.goal.z,4.5,'#ffe49c'));
    if(cfg.mode==='network'){for(const city of cfg.entities.filter(e=>e.role==='city'))this.annotations.add(ring(city.x,city.z,cfg.selected===city.node?5:3.5,cfg.selected===city.node?'#ffe49c':'#abddd7'));}
    if(cfg.camera==='float')this.annotations.add(line([new THREE.Vector3(this.module.state.x,2,this.module.state.z),new THREE.Vector3(this.module.state.x+Math.cos(cfg.bondAngle||0)*4,2,this.module.state.z+Math.sin(cfg.bondAngle||0)*4)],'#ffe5a3'));
    if(cfg.stabilityOrbit){this.annotations.add(ring(0,0,18,'#d4bf83'),ring(0,0,35,'#d4bf83'));}
    if(cfg.trajectory){const points=Array.from({length:18},(_,i)=>new THREE.Vector3(this.module.state.x+cfg.trajectory.vx*i*.55,4,this.module.state.z+cfg.trajectory.vz*i*.55));this.annotations.add(line(points,'#9dddd9'));}
  }
  collect(record){this.addRecord(record);}
  recover(){this.physical?.recover(this.module.state.x,this.module.state.z,this.compound);}
  dispose(){if(this.disposed)return;this.disposed=true;this.physical?.dispose();this.field.dispose();this.attached.dispose();this.renderer.scene.remove(this.root);this.ground.geometry.dispose();this.ground.material.map.dispose();this.ground.material.dispose();for(const object of this.annotations.children){object.geometry?.dispose();object.material?.dispose();}}
}
