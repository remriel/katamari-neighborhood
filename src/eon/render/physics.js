import RAPIER from '@dimforge/rapier3d-compat';
let ready;
export function initializePhysics(){return ready??=RAPIER.init();}
export class PhysicalAggregate{
  constructor(x,z){this.world=new RAPIER.World({x:0,y:-18,z:0});this.world.createCollider(RAPIER.ColliderDesc.cuboid(150,.1,150).setTranslation(0,-.1,0).setFriction(.8));this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,1.1,z).setLinearDamping(.12).setAngularDamping(.1).setCcdEnabled(true));this.collider=null;this.revision=-1;}
  synchronize(compound){if(this.revision===compound.revision)return;const points=new Float32Array(compound.points.flat());const shape=RAPIER.ColliderDesc.convexHull(points);if(!shape)return;if(this.collider)this.world.removeCollider(this.collider,true);this.collider=this.world.createCollider(shape.setDensity(1).setFriction(.8).setRestitution(.08),this.body);this.revision=compound.revision;const p=this.body.translation();this.body.setTranslation({x:p.x,y:Math.max(p.y,compound.groundSupport()+.04),z:p.z},true);}
  step(dt,state,compound){this.synchronize(compound);const v=this.body.linvel();this.body.setLinvel({x:state.vx,y:v.y,z:state.vz},true);const r=Math.max(.6,compound.boundRadius);this.body.setAngvel({x:state.vz/r,y:0,z:-state.vx/r},true);this.world.timestep=Math.min(.033,dt);this.world.step();const p=this.body.translation(),q=this.body.rotation();state.x=p.x;state.z=p.z;compound.height=p.y;compound.orientation=[q.x,q.y,q.z,q.w];}
  recover(x,z,compound){this.body.setTranslation({x,y:compound.groundSupport()+.05,z},true);this.body.setLinvel({x:0,y:0,z:0},true);}
  dispose(){this.world.free();}
}
