import RAPIER from '@dimforge/rapier3d-compat';

let initialized;
export async function initializeCompoundContact(){
  await(initialized??=RAPIER.init());
  return CompoundContact;
}

// The simulation owns the assembly and steering. Rapier resolves its irregular
// contact with the ground, including the lift and rocking caused by protrusions.
export class CompoundContact{
  constructor(body,x,z){
    this.world=new RAPIER.World({x:0,y:-16,z:0});
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(100000,.05,100000).setTranslation(0,-.05,0).setFriction(.72));
    this.rigid=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,body.height,z).setLinearDamping(.12).setAngularDamping(.28).setCcdEnabled(true));
    this.collider=null;this.revision=-1;this.scaleRevision=body.scaleRevision;this.coreRadius=body.coreRadius;
  }
  synchronize(body,x,z){
    if(this.scaleRevision!==body.scaleRevision){
      const factor=body.coreRadius/this.coreRadius,velocity=this.rigid.linvel();
      this.rigid.setTranslation({x,y:body.height,z},true);this.rigid.setLinvel({x:0,y:velocity.y*factor,z:0},true);
      this.scaleRevision=body.scaleRevision;this.coreRadius=body.coreRadius;
    }
    if(this.revision===body.revision)return;
    const shape=RAPIER.ColliderDesc.convexHull(new Float32Array(body.points.flat()));
    if(!shape)return;
    if(this.collider)this.world.removeCollider(this.collider,true);
    this.collider=this.world.createCollider(shape.setDensity(1).setFriction(.72).setRestitution(.08),this.rigid);
    this.revision=body.revision;
    const p=this.rigid.translation();this.rigid.setTranslation({x,y:Math.max(p.y,body.groundSupport()+Math.max(.001,body.coreRadius*.03)),z},true);
  }
  step(dt,body,x,z,dx,dz){
    this.synchronize(body,x,z);
    const p=this.rigid.translation(),velocity=this.rigid.linvel(),radius=Math.max(body.coreRadius,body.groundSupport()),speed=Math.hypot(dx,dz)/Math.max(.001,dt);
    this.rigid.setTranslation({x,y:p.y,z},true);
    this.rigid.setLinvel({x:0,y:velocity.y,z:0},true);
    this.rigid.setAngvel({x:dz/Math.max(.001,dt)/radius,y:0,z:-dx/Math.max(.001,dt)/radius},true);
    this.world.timestep=Math.max(.001,Math.min(.033,dt));this.world.step();
    const position=this.rigid.translation(),q=this.rigid.rotation();body.orientation=[q.x,q.y,q.z,q.w];
    const support=body.groundSupport()+Math.max(.001,body.coreRadius*.03),rise=Math.max(0,support-body.lastGround);
    body.impact=Math.max(body.impact*Math.exp(-dt*7),Math.min(1,rise/Math.max(.02,body.boundRadius)*5));
    body.height=Math.max(position.y,support);body.lastGround=support;
    if(position.y<support)this.rigid.setTranslation({x:position.x,y:support,z:position.z},true);
    if(speed>.1&&rise>body.boundRadius*.006){const current=this.rigid.linvel();this.rigid.setLinvel({x:current.x,y:Math.max(current.y,Math.min(speed*.12,rise/Math.max(.002,dt)*.1)),z:current.z},true);}
    return{x:position.x,z:position.z};
  }
  dispose(){this.world.free();}
}
