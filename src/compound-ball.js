// Pure simulation data. Every collected piece remains in this rigid assembly.
export function rotate(v,q){
  const[x,y,z]=v,[qx,qy,qz,qw]=q;
  const tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
  return[x+qw*tx+qy*tz-qz*ty,y+qw*ty+qz*tx-qx*tz,z+qw*tz+qx*ty-qy*tx];
}
function normalize(v){const length=Math.hypot(...v)||1;return v.map(n=>n/length);}
function multiply(a,b){return normalize([
  a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
  a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
  a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2],
]);}
const DIRECTIONS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
for(let i=0;i<64;i++){const y=1-2*(i+.5)/64,r=Math.sqrt(1-y*y),a=i*2.3999632297;DIRECTIONS.push([r*Math.cos(a),y,r*Math.sin(a)]);}
export class CompoundBall{
  constructor(){
    this.coreRadius=.16;this.boundRadius=.16;this.orientation=[0,0,0,1];this.pieces=[];this.typeCounts=[];
    this.points=DIRECTIONS.map(n=>n.map(v=>v*.16));this.supports=DIRECTIONS.map(()=>.16);
    this.height=.18;this.verticalVelocity=0;this.lastGround=.18;this.impact=0;this.revision=0;this.scaleRevision=0;
  }
  supportLocal(n){let extent=this.coreRadius;for(const p of this.points)extent=Math.max(extent,p[0]*n[0]+p[1]*n[1]+p[2]*n[2]);return extent;}
  supportWorld(x,y,z){const q=this.orientation;return this.supportLocal(rotate([x,y,z],[-q[0],-q[1],-q[2],q[3]]));}
  attach(item,info,ratio,ballX,ballZ,targetDiameter=this.boundRadius*2,modelBounds=null){
    const inverse=[-this.orientation[0],-this.orientation[1],-this.orientation[2],this.orientation[3]];
    // Item and ball positions share the ground plane. `height` is the ball's
    // world-space lift and must not be subtracted from this local attachment
    // vector; doing that stacked every new piece downward and inflated the
    // support envelope after only a handful of pickups.
    const incoming=rotate(normalize([item.x-ballX,item.size*.35+(item.groundOffset||0),item.z-ballZ]),inverse);
    const seed=item.visualSeed>>>0,angle=(seed%65536)/65536*Math.PI*2;
    const noise=normalize([Math.cos(angle),((seed>>>16)/65535-.5)*2,Math.sin(angle)]);
    const direction=normalize(incoming.map((v,i)=>v*.88+noise[i]*.12));
    const height=modelBounds?item.size*1.05*modelBounds[1]:item.size*1.05/(info.fitSize?Math.max(1,ratio):1);
    const width=modelBounds?item.size*1.05*modelBounds[0]:height*ratio;
    const depth=modelBounds?item.size*1.05*modelBounds[2]:Math.max(item.size*.13,Math.min(width,height)*.38);
    const align=direction[1]<-.9999?[1,0,0,0]:normalize([direction[2],0,-direction[0],1+direction[1]]);
    const rotation=multiply(align,[0,Math.sin(angle*.5),0,Math.cos(angle*.5)]);
    // Keep the contact surface tied to the logical growth size. The collision
    // envelope may be lumpy, but a small early pickup must not push every later
    // piece farther down an already stretched stack.
    const targetSupport=Math.max(this.coreRadius,targetDiameter*.5);
    const distance=Math.min(this.supportLocal(direction),targetSupport)+Math.min(height*.2,targetDiameter*.15);
    const center=direction.map(v=>v*distance),dimensions=[width,height,depth];
    const source=rotate([item.x-ballX,height*.5-this.height+(item.groundOffset||0),item.z-ballZ],inverse);
    const piece={id:item.id,type:item.type,art:info.art,name:item.name||info.name,size:item.size,visualSeed:item.visualSeed>>>0,center,rotation,dimensions,source,corners:[]};
    this.pieces.push(piece);this.typeCounts[item.type]=(this.typeCounts[item.type]||0)+1;
    // Surface witnesses form a small contact envelope; interior pieces remain
    // in the complete render assembly even when they no longer support it.
    for(let x=-1;x<=1;x+=2)for(let y=-1;y<=1;y+=2)for(let z=-1;z<=1;z+=2){
      const corner=rotate([x*width/2,y*height/2,z*depth/2],rotation).map((v,i)=>v+center[i]);
      piece.corners.push(corner);
      this.boundRadius=Math.max(this.boundRadius,Math.hypot(...corner));
      for(let i=0;i<DIRECTIONS.length;i++){const n=DIRECTIONS[i],support=corner[0]*n[0]+corner[1]*n[1]+corner[2]*n[2];if(support>this.supports[i]){this.supports[i]=support;this.points[i]=corner;}}
    }
    this.height=Math.max(this.height,this.groundSupport()+Math.max(.0005,this.coreRadius*.1));
    this.revision++;
    return piece;
  }
  groundSupport(){
    const slope=this.slope||[0,0],q=this.orientation,n=rotate([slope[0],-1,slope[1]],[-q[0],-q[1],-q[2],q[3]]);let height=this.coreRadius*Math.hypot(1,...slope);
    for(const piece of this.pieces)for(const p of piece.corners)height=Math.max(height,p[0]*n[0]+p[1]*n[1]+p[2]*n[2]);
    return height;
  }
  advance(dx,dz,dt,dy=0){
    const horizontal=Math.hypot(dx,dz),distance=Math.hypot(dx,dz,dy),speed=distance/Math.max(.001,dt);
    if(horizontal>.000001){
      const radius=Math.max(this.coreRadius,this.groundSupport()),half=distance/radius*.5;
      this.orientation=multiply([dz/horizontal*Math.sin(half),0,-dx/horizontal*Math.sin(half),Math.cos(half)],this.orientation);
    }
    const ground=this.groundSupport()+Math.max(.0005,this.coreRadius*.1);
    const rise=Math.max(0,ground-this.lastGround);
    this.impact=Math.max(this.impact*Math.exp(-dt*7),Math.min(1,rise/Math.max(.02,this.boundRadius)*6));
    if(distance>.0001&&rise>this.boundRadius*.004)this.verticalVelocity=Math.max(this.verticalVelocity,Math.min(speed*.28,rise/Math.max(.002,dt)*.22));
    this.verticalVelocity-=(14+this.boundRadius*14)*dt;
    this.height+=this.verticalVelocity*dt;
    if(this.height<ground){const landing=-this.verticalVelocity;this.height=ground;this.verticalVelocity=distance>.0001&&landing>.6?landing*.08:0;}
    this.lastGround=ground;
  }
  rescale(factor){
    this.coreRadius*=factor;this.boundRadius*=factor;this.height*=factor;this.lastGround*=factor;this.verticalVelocity*=factor;
    for(const piece of this.pieces){piece.size*=factor;for(let i=0;i<3;i++){piece.center[i]*=factor;piece.dimensions[i]*=factor;if(piece.source)piece.source[i]*=factor;}piece.corners=piece.corners.map(p=>p.map(v=>v*factor));}
    // Witness points may reference the same corner; replace each independently.
    this.points=this.points.map(point=>point.map(v=>v*factor));this.supports=this.supports.map(v=>v*factor);
    this.revision++;this.scaleRevision++;
  }
}
