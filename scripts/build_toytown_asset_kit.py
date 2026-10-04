"""Create the low-poly Katamari toy town using Blender MCP / Blender Python.

The exported library contains small, vertex-colored pivot-at-ground GLB meshes.
The editable asset-library .blend and phase-one street preview sit beside the
original game artwork. The gameplay catalog and collider sizes are untouched.
"""
import bpy
import json
import math
import random
from mathutils import Vector
from pathlib import Path

ROOT = Path(args.get("project_root", r"C:\Users\Gev\Documents\Codex\2026-09-30\c\work\katamari-neighborhood"))
ART = ROOT / "art" / "toytown"
PUBLIC = ROOT / "public" / "models"
OUTPUT = ROOT / "outputs"
ART.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)

# Bright, hand-painted console-game colors stored as one vertex-color channel.
C = {
    "cream": (0.95, 0.83, 0.60), "ivory": (1.0, 0.94, 0.76),
    "rose": (0.94, 0.27, 0.25), "coral": (1.0, 0.43, 0.29),
    "gold": (1.0, 0.74, 0.20), "sun": (1.0, 0.87, 0.36),
    "mint": (0.31, 0.76, 0.54), "leaf": (0.20, 0.56, 0.34),
    "lime": (0.57, 0.83, 0.27), "jade": (0.11, 0.40, 0.32),
    "sky": (0.30, 0.70, 0.86), "blue": (0.20, 0.44, 0.78),
    "navy": (0.16, 0.25, 0.44), "lilac": (0.63, 0.48, 0.84),
    "plum": (0.39, 0.30, 0.58), "wood": (0.58, 0.33, 0.18),
    "honey": (0.79, 0.52, 0.23), "stone": (0.62, 0.65, 0.61),
    "slate": (0.30, 0.40, 0.42), "charcoal": (0.16, 0.21, 0.22),
    "glass": (0.37, 0.76, 0.83), "white": (0.97, 0.98, 0.89),
    "black": (0.09, 0.11, 0.13), "water": (0.20, 0.72, 0.89),
}

class Sculpt:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.verts, self.faces, self.colors = [], [], []

    def face(self, points, color):
        start = len(self.verts)
        self.verts.extend(points)
        self.faces.append(tuple(range(start, len(self.verts))))
        self.colors.append(C[color] if isinstance(color, str) else color)

    def module(self, part, location=(0,0,0), scale=1, yaw=0):
        c,s=math.cos(yaw),math.sin(yaw);x,y,z=location
        for face,color in zip(part.faces,part.colors):
            self.face([(x+(c*part.verts[i][0]-s*part.verts[i][1])*scale,
                        y+(s*part.verts[i][0]+c*part.verts[i][1])*scale,
                        z+part.verts[i][2]*scale) for i in face],color)

    def box(self, center, dims, color, bevel=0.035, side=None):
        x, y, z = center
        w, d, h = (max(0.002, abs(v)) for v in dims)
        b = min(bevel, w*.22, d*.22, h*.22)
        ring = [(-w/2+b, -d/2), (w/2-b, -d/2), (w/2, -d/2+b),
                (w/2, d/2-b), (w/2-b, d/2), (-w/2+b, d/2),
                (-w/2, d/2-b), (-w/2, -d/2+b)]
        lower = [(x+a, y+c, z-h/2) for a, c in ring]
        upper = [(x+a, y+c, z+h/2) for a, c in ring]
        self.face(list(reversed(lower)), side or color)
        self.face(upper, color)
        for i in range(8):
            j = (i+1) % 8
            self.face([lower[i], lower[j], upper[j], upper[i]], side or color)

    def prism(self, outline, z0, z1, color, side=None):
        lower = [(x, y, z0) for x, y in outline]
        upper = [(x, y, z1) for x, y in outline]
        self.face(list(reversed(lower)), side or color)
        self.face(upper, color)
        for i in range(len(outline)):
            j = (i+1) % len(outline)
            self.face([lower[i], lower[j], upper[j], upper[i]], side or color)

    def cylinder(self, center, radius, depth, color, segments=9, axis="z", top=None):
        x, y, z = center
        r=max(.002,radius); n=max(5,segments)
        a=[];b=[]
        for i in range(n):
            angle=2*math.pi*i/n
            c,s=math.cos(angle),math.sin(angle)
            if axis=="y": a.append((x+r*c,y-depth/2,z-r*s)); b.append((x+r*c,y+depth/2,z-r*s))
            elif axis=="x": a.append((x-depth/2,y+r*c,z+r*s)); b.append((x+depth/2,y+r*c,z+r*s))
            else: a.append((x+r*c,y+r*s,z-depth/2)); b.append((x+r*c,y+r*s,z+depth/2))
        self.face(list(reversed(a)), top or color); self.face(b,top or color)
        for i in range(n): self.face([a[i],a[(i+1)%n],b[(i+1)%n],b[i]],color)

    def tapered(self, bottom, top, r0, r1, color, segments=8):
        x0,y0,z0=bottom; x1,y1,z1=top; n=segments;a=[];b=[]
        for i in range(n):
            t=math.tau*i/n;c=math.cos(t);s=math.sin(t)
            a.append((x0+r0*c,y0+r0*s,z0));b.append((x1+r1*c,y1+r1*s,z1))
        self.face(list(reversed(a)),color);self.face(b,color)
        for i in range(n):self.face([a[i],a[(i+1)%n],b[(i+1)%n],b[i]],color)

    def rod(self, start, end, radius, color, segments=6):
        a=Vector(start);b=Vector(end);axis=(b-a).normalized()
        helper=Vector((0,0,1)) if abs(axis.z)<.88 else Vector((0,1,0))
        u=axis.cross(helper).normalized();v=axis.cross(u).normalized();r=max(.003,radius)
        ring0=[];ring1=[]
        for i in range(segments):
            t=math.tau*i/segments;offset=u*(math.cos(t)*r)+v*(math.sin(t)*r)
            ring0.append(tuple(a+offset));ring1.append(tuple(b+offset))
        self.face(list(reversed(ring0)),color);self.face(ring1,color)
        for i in range(segments):self.face([ring0[i],ring0[(i+1)%segments],ring1[(i+1)%segments],ring1[i]],color)

    def blob(self, center, radii, color, rings=4, segments=7):
        x,y,z=center;rx,ry,rz=radii
        levels=[]
        for j in range(1,rings+1):
            phi=-math.pi/2+math.pi*j/(rings+1)
            levels.append([(x+rx*math.cos(phi)*math.cos(math.tau*i/segments),
                            y+ry*math.cos(phi)*math.sin(math.tau*i/segments),
                            z+rz*math.sin(phi)) for i in range(segments)])
        bottom=(x,y,z-rz);top=(x,y,z+rz)
        for i in range(segments):
            ni=(i+1)%segments
            self.face([bottom,levels[0][ni],levels[0][i]],color)
            for j in range(len(levels)-1):self.face([levels[j][i],levels[j][ni],levels[j+1][ni],levels[j+1][i]],color)
            self.face([levels[-1][i],levels[-1][ni],top],color)

    def gable(self, halfwidth, front, back, eave, peak, color):
        left=[(-halfwidth,front,eave),(-halfwidth,back,eave),(0,back,peak),(0,front,peak)]
        right=[(0,front,peak),(0,back,peak),(halfwidth,back,eave),(halfwidth,front,eave)]
        self.face(list(reversed(left)),color);self.face(list(reversed(right)),color)
        self.face([(halfwidth,front,eave),(0,front,peak),(-halfwidth,front,eave)],color)
        self.face([(-halfwidth,back,eave),(0,back,peak),(halfwidth,back,eave)],color)

    def window(self, x, y, z, w, h, trim="ivory", glass="glass", yaw=0):
        # Four colored quads give a framed/mullioned window without four boxes.
        c,s=math.cos(yaw),math.sin(yaw)
        def pane(width,height,depth,color):
            points=[]
            for px,pz in [(-width/2,-height/2),(width/2,-height/2),(width/2,height/2),(-width/2,height/2)]:
                points.append((x+c*px+s*depth,y+s*px-c*depth,z+pz))
            self.face(points,color)
        pane(w+.045,h+.045,.002,trim)
        pane(w,h,.007,glass)
        pane(w*.065,h,.011,"cream")
        pane(w,h*.065,.012,"cream")

    def torus_vertical(self, center, radius, tube, color, segments=18):
        x,y,z=center;r=max(.006,tube);rings=[]
        for i in range(segments):
            a=math.tau*i/segments;c,s=math.cos(a),math.sin(a)
            rings.append([(x+(radius+r*math.cos(math.tau*j/4))*c,y+r*math.sin(math.tau*j/4),z+(radius+r*math.cos(math.tau*j/4))*s) for j in range(4)])
        for i in range(segments):
            ni=(i+1)%segments
            for j in range(4):
                nj=(j+1)%4
                self.face([rings[i][j],rings[i][nj],rings[ni][nj],rings[ni][j]],color)

    def mesh(self, name, collection, xpos=0):
        lo=[min(v[i] for v in self.verts) for i in range(3)]
        hi=[max(v[i] for v in self.verts) for i in range(3)]
        extent=max(hi[i]-lo[i] for i in range(3)) or 1
        midx=(lo[0]+hi[0])/2;midy=(lo[1]+hi[1])/2;lowz=lo[2]
        verts=[((v[0]-midx)/extent+xpos,(v[1]-midy)/extent,(v[2]-lowz)/extent) for v in self.verts]
        mesh=bpy.data.meshes.new(name+"Geometry");mesh.from_pydata(verts,[],self.faces);mesh.update()
        colors=mesh.color_attributes.new(name="Col",type="FLOAT_COLOR",domain="CORNER")
        for polygon,color in zip(mesh.polygons,self.colors):
            for loop in polygon.loop_indices:colors.data[loop].color=(*color,1.0)
            polygon.use_smooth=False
        obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
        return obj,sum(len(f)-2 for f in self.faces),[(hi[i]-lo[i])/extent for i in range(3)]

def build_house(b,variant):
    wall=["cream","sky","coral"][variant%3];roof=["navy","rose","jade"][variant%3]
    w=[.77,.70,.84][variant%3];d=[.68,.75,.61][variant%3];h=[.58,.64,.53][variant%3]
    b.box((0,0,h/2),(w,d,h),wall,.065)
    if variant%3==1:
        corners=[(-w/2-.06,-d/2-.06,h), (w/2+.06,-d/2-.06,h),(w/2+.06,d/2+.06,h),(-w/2-.06,d/2+.06,h)]
        for i in range(4):b.face([corners[i],corners[(i+1)%4],(0,0,h+.29)],roof)
    elif variant%3==2:
        b.box((0,0,h+.03),(w+.10,d+.12,.07),roof,.02)
        b.gable(.24,-d/2-.22,-d/2-.01,.40,.56,"gold")
        for x in [-.22,.22]:b.rod((x,-d/2-.20,0),(x,-d/2-.20,.4),.013,"ivory",5)
    else:b.gable(w/2+.06,-d/2-.07,d/2+.07,h-.01,h+.36,roof)
    front=-d/2-.015
    b.box((0,front,.18),(.16,.028,.35),["wood","jade","plum"][variant%3],.018)
    b.cylinder((.055,front-.02,.19),.012,.014,"gold",6,axis="y")
    for x in [-w*.29,w*.29]:
        b.window(x,front,.40,.14,.16,"ivory","glass")
        b.window(x,-front,.38,.12,.15,"ivory","glass",math.pi)
    for x,yaw in [(-w/2-.01,-math.pi/2),(w/2+.01,math.pi/2)]:
        b.window(x,.03,.36,.16,.16,"ivory","glass",yaw)
    if variant!=1:
        chimney=h+.19
        b.box((.22,.17,chimney),(.12,.16,.25),"slate",.02);b.box((.22,.17,chimney+.14),(.15,.18,.035),"cream",.01)
    b.box((0,front-.09,.025),(.36,.17,.05),"stone",.022)

def build_apartment(b,variant):
    body=["cream","coral","sky"][variant%3];roof=["jade","navy","plum"][variant%3]
    b.box((0,0,.46),(.74,.64,.91),body,.035)
    b.box((0,0,.925),(.79,.69,.07),roof,.025)
    for floor in range(3):
        z=.21+floor*.245
        for col,x in enumerate([-.22,0,.22]):
            b.window(x,-.329,z,.105,.13,"ivory",["glass","sky","lilac"][ (col+floor+variant)%3])
        if floor>0:
            b.box((0,-.365,z-.062),(.58,.11,.026),"stone",.008)
            for x in [-.27,0,.27]:b.rod((x,-.43,z-.062),(x,-.43,z+.035),.008,"slate",5)
    b.box((0,-.34,.13),(.13,.025,.25),"wood",.012)
    for x in [-.28,.28]:b.box((x,-.36,.71),(.13,.025,.12),"gold",.009)
    for floor in range(3):
        z=.21+floor*.245
        for x in [-.22,0,.22]:b.window(x,.329,z,.105,.13,"ivory","glass",math.pi)
        for x,yaw in [(-.38,-math.pi/2),(.38,math.pi/2)]:
            for y in [-.16,.16]:b.window(x,y,z,.12,.13,"ivory","glass",yaw)
    b.box((0,-.40,.35),(.25,.17,.045),roof,.018)
    b.box((.13,.09,.98),(.24,.22,.045),"glass",.018)

def build_tree(b,variant,large=False):
    trunk=["wood","honey","wood"][variant%3]
    b.tapered((0,0,0),(0,0,.51 if not large else .53),.105,.043,trunk,7)
    b.rod((0,0,.27),(-.19,.02,.56 if not large else .62),.035,trunk)
    b.rod((0,0,.3),(.17,-.02,.58 if not large else .64),.03,trunk)
    leaf=["lime","leaf","mint"][variant%3]
    if large:
        b.blob((0,0,.67),(.34,.33,.31),leaf,4,8)
        b.blob((-.2,0,.57),(.21,.22,.22),["mint","lime","leaf"][variant%3],3,7)
        b.blob((.19,.02,.59),(.2,.21,.23),["leaf","mint","lime"][variant%3],3,7)
    else:
        for x,y,z,r in [(-.19,0,.57,.23),(.14,0,.6,.26),(0,.09,.76,.24)]:
            b.blob((x*(1+variant*.09),y,z+variant*.025),(r,r*(.82+variant*.07),r*(1.08-variant*.1)),leaf,3,7)

def build_bush(b,variant):
    color=["leaf","lime","mint"][variant%3]
    for x,y,z,r in [(-.22,0,.25,.24),(.18,0,.25,.25),(0,.06,.43,.27),(0,-.18,.27,.22)]:
        b.blob((x,y,z),(r,r*.88,r*.83),color,3,7)
    b.prism([(-.42,-.27),(.4,-.27),(.38,.28),(-.38,.28)],0,.06,"wood")

def build_car(b,variant,kind="car"):
    body=["coral","sky","mint","gold"][variant%4];glass=["glass","sky","lilac"][variant%3]
    length=.94 if kind in ("bus","van") else .82;width=.39 if kind=="car" else .43
    b.box((0,0,.22),(length,width,.23),body,.07,"honey")
    cabinL=.43 if kind=="car" else .56
    if kind=="convertible":
        for x in [-.15,.04]:b.box((x,0,.36),(.12,width*.60,.14),"navy",.035)
        b.box((.21,0,.43),(.022,width*.82,.20),glass,.012)
        b.box((-.28,0,.33),(.11,width*.82,.06),"ivory",.018)
    else:
        b.box((-.04,0,.405),(cabinL,width*.8,.22 if kind=="car" else .28),["ivory","cream","white"][variant%3],.065)
        for y,yaw in [(-width*.41,0),(width*.41,math.pi)]:
            b.window(-.04,y,.405,cabinL*.77,.13,"ivory",glass,yaw)
        b.window(cabinL*.5-.035,0,.40,width*.66,.13,"ivory",glass,math.pi/2)
    b.box((length*.49,-.13,.19),(.018,.09,.055),"white",.01)
    b.box((length*.49,.13,.19),(.018,.09,.055),"white",.01)
    b.box((-length*.49,-.13,.18),(.018,.08,.045),"rose",.009)
    b.box((-length*.49,.13,.18),(.018,.08,.045),"rose",.009)
    for x in [-length*.31,length*.31]:
        for y in [-width*.52,width*.52]:
            b.cylinder((x,y,.14),.115 if kind in ("bus","van") else .102,.065,"charcoal",8,axis="y")
            b.cylinder((x,y*1.13,.14),.045,.07,"stone",8,axis="y")
    if kind=="bus":
        for x in [-.28,-.12,.05,.22,.37]:b.box((x,-width*.406,.405),(.095,.016,.14),glass,.012)
        b.box((-.04,0,.58),(.1,width*.7,.022),"gold",.008)
    if kind=="convertible":
        b.box((-.03,0,.352),(.52,.012,.025),"navy",.008)
        b.box((-.25,0,.48),(.12,.016,.026),"gold",.008)
    if kind=="van":b.box((-.14,0,.42),(.15,width*.81,.18),body,.012)

def build_bike(b,variant):
    body=["coral","blue","mint"][variant%3]
    for x in [-.31,.32]:
        b.torus_vertical((x,0,.29),.24,.018,"charcoal",12)
        b.cylinder((x,0,.29),.027,.08,"slate",8,axis="y")
        for i in range(6):
            a=math.tau*i/6;b.rod((x,0,.29),(x+math.cos(a)*.22,0,.29+math.sin(a)*.22),.005,"stone",4)
    a=(-.31,0,.29);bb=(-.04,0,.52);c=(.05,0,.29);d=(.32,0,.29)
    for p,q in [(a,bb),(bb,c),(c,a),(bb,d),(c,d)]:b.rod(p,q,.019,body,6)
    b.rod((-.09,0,.535),(.04,0,.535),.022,"charcoal")
    b.rod((-.05,-.06,.52),(-.05,.06,.52),.018,"slate")

def build_creature(b,variant,kind):
    fur=["honey","coral","slate"][variant%3] if kind=="dog" else ["slate","honey","cream"][variant%3]
    b.blob((0,.01,.29),(.32,.21,.20),fur,4,8)
    b.blob((.27,-.01,.38),(.16,.15,.16),fur,3,7)
    if kind=="cat":
        b.prism([( .18,-.07),(.25,-.02),(.19,.01)],.48,.65,["coral","slate","honey"][variant%3])
        b.prism([(.3,-.07),(.37,-.02),(.31,.01)],.48,.65,fur)
        b.blob((.39,-.105,.38),(.035,.026,.03),"rose",2,6)
        for x in [-.25,.24]:b.blob((x,-.105,.43),(.035,.026,.035),"black",2,6)
    else:
        b.blob((.42,-.11,.37),(.09,.06,.06),["cream","gold","coral"][variant%3],2,7)
        for x in [.25,.38]:b.blob((x,-.145,.43),(.025,.018,.025),"black",2,5)
        b.rod((-.27,.06,.32),(-.42,.1,.49),.045,fur,6)
        b.blob((-.42,.1,.49),(.06,.055,.06),fur,2,5)
        b.rod((.38,-.02,.25),(.48,-.02,.22),.025,"cream",5)
    for x in [-.18,.17]:
        for y in [-.13,.12]:b.tapered((x,y,.02),(x+(.02 if x>0 else -.02),y,.25),.04,.026,fur,6)
    if kind=="dog":b.rod((-.16,-.16,.27),(.16,-.16,.27),.023,["blue","rose","mint"][variant%3],5)

def build_bench(b,variant):
    wood=["wood","honey","coral"][variant%3]
    for i in range(4):b.box((0,-.22+i*.115,.46),(.84,.095,.085),wood,.022)
    b.box((0,0,.3),(.86,.61,.10),wood,.028)
    for x in [-.35,.35]:
        b.box((x,-.03,.18),(.085,.4,.36),"slate",.018)
        b.box((x,-.17,.42),(.07,.07,.28),"slate",.016)

def build_armchair(b,variant):
    fabric=["coral","lilac","sky"][variant%3]
    b.box((0,.03,.25),(.67,.60,.25),fabric,.095)
    b.box((0,.25,.58),(.7,.19,.65),fabric,.08)
    for x in [-.38,.38]:
        b.box((x,.015,.39),(.13,.64,.22),["plum","navy","jade"][variant%3],.055)
        b.tapered((x,-.17,.02),(x,-.17,.17),.035,.026,"wood",6)
    for x in [-.18,.18]:b.tapered((x,.22,.02),(x,.22,.14),.032,.025,"wood",6)

def build_suitcase(b,variant):
    shell=["sky","coral","gold"][variant%3]
    b.box((0,0,.35),(.62,.27,.67),shell,.08)
    for x in [-.21,-.1,0,.1,.21]:b.box((x,-.143,.35),(.018,.012,.49),"ivory",.007)
    b.box((0,-.01,.72),(.22,.1,.055),"charcoal",.016)
    for x in [-.19,.19]:b.cylinder((x,.02,.05),.045,.17,"charcoal",7,axis="y")

def build_lamp(b,variant):
    body=["slate","navy","jade"][variant%3]
    b.cylinder((0,0,.12),.15,.12,"stone",8)
    b.tapered((0,0,.17),(0,0,.83),.052,.025,body,8)
    b.rod((0,0,.79),(.19,0,.86),.025,body)
    b.tapered((.19,0,.81),(.19,0,.72),.07,.083,"gold",8)
    b.cylinder((.19,0,.74),.085,.03,"ivory",8)
    b.box((.19,0,.88),(.17,.15,.035),body,.018)

def build_cart(b,variant):
    body=["coral","jade","sky"][variant%3]
    for x in [-.3,.3]:b.cylinder((x,.2,.14),.095,.055,"charcoal",9,axis="y")
    b.box((0,.02,.43),(.64,.5,.47),body,.06)
    b.box((0,.02,.69),(.73,.58,.06),"ivory",.025)
    b.box((0,.02,.96),(.78,.64,.045),["rose","gold","mint"][variant%3],.018)
    for i in range(5):
        x=-.34+i*.17;b.rod((x,-.25,.74),(x,-.25,.97),.012,"cream",5)
    b.box((.2,-.274,.52),(.28,.02,.14),"glass",.012)
    b.cylinder((-.16,-.29,.45),.075,.03,"stone",9,axis="y")
    b.tapered((.32,.20,.03),(.57,.22,.31),.025,.018,"wood",6)

def build_booth(b,variant):
    shell=["coral","navy","lilac"][variant%3]
    for x in [-.31,.31]:
        for y in [-.25,.25]:b.box((x,y,.42),(.09,.09,.84),shell,.02)
    for z in [.06,.8,.91]:b.box((0,0,z),(.72,.61,.075),shell,.018)
    for y in [-.255,.255]:b.box((0,y,.46),(.5,.025,.61),"glass",.008)
    b.box((0,-.315,.86),(.58,.025,.12),"ivory",.013)
    for i in range(4):b.box((-.21+i*.14,-.335,.86),(.085,.01,.07),"rose",.006)
    b.box((.14,-.3,.35),(.13,.035,.43),"sky",.012)
    b.cylinder((.18,-.325,.35),.016,.015,"gold",6,axis="y")

def build_cone(b,variant):
    b.cylinder((0,0,.04),.34,.08,"ivory",8)
    b.tapered((0,0,.08),(0,0,.92),.24,.035,["coral","gold","coral"][variant%3],8)
    b.tapered((0,0,.37),(0,0,.47),.17,.145,"ivory",8)

def build_vending(b,variant):
    body=["coral","sky","mint"][variant%3]
    b.box((0,0,.47),(.74,.40,.91),body,.055)
    b.box((-.09,-.211,.60),(.48,.025,.53),"glass",.02)
    for row in range(3):
        for col in range(3):
            b.box((-.27+col*.17,-.232,.45+row*.14),(.1,.015,.07),["gold","rose","cream","mint"][ (row+col+variant)%4],.013)
    b.box((.25,-.22,.62),(.13,.03,.5),"ivory",.014)
    b.box((.18,-.244,.23),(.34,.035,.12),"slate",.012)
    b.cylinder((.26,-.267,.80),.026,.02,"gold",7,axis="y")

def build_stool(b,variant):
    seat=["coral","mint","gold"][variant%3]
    b.box((0,0,.68),(.66,.62,.14),seat,.065)
    for x in [-.22,.22]:
        for y in [-.2,.2]:b.tapered((x,y,.06),(x*.9,y*.9,.64),.045,.03,"wood",6)
    b.box((0,.17,.42),(.5,.06,.06),"wood",.018)

def build_skateboard(b,variant):
    deck=["coral","sky","gold"][variant%3]
    b.box((0,0,.35),(1,.32,.09),deck,.052)
    for x in [-.32,.32]:
        b.box((x,0,.23),(.13,.37,.05),"slate",.02)
        for y in [-.17,.17]:b.cylinder((x,y,.12),.095,.08,"charcoal",7,axis="y")

def build_windmill(b,variant):
    wall=["cream","ivory","sky"][variant%3];roof=["jade","rose","navy"][variant%3]
    b.tapered((0,0,0),(0,0,.77),.29,.19,wall,10)
    b.cylinder((0,0,.77),.22,.10,roof,10)
    b.cylinder((0,-.23,.77),.048,.18,"wood",8,axis="y")
    for j in range(4):
        a=math.tau*j/4+math.pi/4
        dx,dz=math.sin(a),math.cos(a);px,pz=math.cos(a),-math.sin(a)
        face=[(dx*r+px*w,-.31,.77+dz*r+pz*w) for r,w in [(.08,-.045),(.56,-.09),(.56,.09),(.08,.045)]]
        back=[(x,-.265,z) for x,y,z in face]
        b.face(list(reversed(face)),"ivory");b.face(back,"cream")
        for i in range(4):b.face([face[i],face[(i+1)%4],back[(i+1)%4],back[i]],"honey")
        b.rod((dx*.04,-.32,.77+dz*.04),(dx*.55,-.32,.77+dz*.55),.013,"wood",5)
    b.box((0,-.30,.19),(.16,.03,.26),"wood",.03)
    for x in [-.20,.2]:b.window(x,-.19,.43,.065,.09,"ivory","sky")
    b.cylinder((0,0,.05),.34,.08,roof,10)

def build_ferris(b,variant):
    support=["coral","sky","plum"][variant%3]
    center=(0,0,.65);radius=.42
    b.rod((-.33,.06,.04),(0,.06,.62),.058,support,7)
    b.rod((.33,.06,.04),(0,.06,.62),.058,support,7)
    b.rod((-.33,-.06,.04),(0,-.06,.62),.035,"ivory",6)
    b.rod((.33,-.06,.04),(0,-.06,.62),.035,"ivory",6)
    b.torus_vertical(center,radius,.022,"ivory",16)
    b.cylinder((0,-.04,.65),.054,.16,"gold",9,axis="y")
    for i in range(12):
        a=math.tau*i/12
        x=math.sin(a)*radius;z=.65+math.cos(a)*radius
        b.rod((0,0,.65),(x,0,z),.009,["ivory","cream"][i%2],5)
        b.rod((x,0,z),(x,-.02,z-.12),.012,"slate",5)
        b.box((x,-.02,z-.16),(.12,.1,.12),["coral","gold","sky","mint","lilac"][i%5],.018)
    b.box((0,.03,.12),(.56,.36,.15),"wood",.04)

def build_watertower(b,variant):
    steel=["slate","sky","stone"][variant%3]
    for x in [-.23,.23]:
        for y in [-.20,.20]:
            b.tapered((x*1.35,y*1.35,.03),(x,y,.65),.035,.022,steel,7)
    for z in [.22,.42,.62]:
        b.box((0,0,z),(.54,.48,.026),"stone",.01)
    b.cylinder((0,0,.86),.31,.39,"sky",10,top="glass")
    b.torus_vertical((0,-.02,.87),.31,.018,"ivory",12)
    b.cylinder((0,0,1.08),.32,.06,"stone",10)
    b.blob((0,0,1.12),(.27,.27,.16),"sky",2,10)
    b.rod((-.33,-.25,.65),(-.33,-.25,1.05),.018,"wood",5)
    for z in [.70,.82,.94,1.02]:b.rod((-.36,-.25,z),(-.30,-.25,z),.014,"wood",5)

def build_clocktower(b,variant):
    body=["cream","sky","coral"][variant%3];roof=["navy","jade","plum"][variant%3]
    b.tapered((0,0,0),(0,0,.79),.30,.23,body,8)
    b.cylinder((0,0,.64),.29,.06,"ivory",8)
    b.cylinder((0,0,.82),.24,.12,roof,8)
    b.tapered((0,0,.88),(0,0,1.16),.22,.005,roof,8)
    b.cylinder((0,-.242,.61),.12,.035,"cream",12,axis="y")
    b.torus_vertical((0,-.266,.61),.12,.012,"gold",12)
    b.box((.005,-.291,.66),(.012,.008,.07),"charcoal",.002)
    b.box((-.023,-.291,.61),(.07,.008,.012),"charcoal",.002)
    for x in [-.15,.15]:b.window(x,-.23,.32,.06,.09,"ivory","glass")
    b.box((0,-.25,.12),(.14,.03,.24),"wood",.03)

def build_castle(b,variant):
    wall=["lilac","cream","sky"][variant%3];roof=["plum","navy","rose"][variant%3]
    b.box((0,0,.37),(.73,.53,.70),wall,.025)
    b.box((0,-.01,.76),(.82,.61,.10),roof,.025)
    for x in [-.32,.32]:
        for y in [-.22,.22]:
            b.cylinder((x,y,.63),.135,.85,wall,9)
            b.tapered((x,y,1.05),(x,y,1.34),.14,.008,roof,9)
            b.box((x,y,1.34),(.06,.06,.13),"coral",.01)
            b.rod((x,y,1.37),(x+.01,y,1.49),.012,"gold",5)
    b.box((0,-.278,.22),(.20,.035,.40),"wood",.03)
    b.box((0,-.302,.10),(.28,.05,.06),"stone",.016)
    for x in [-.2,.2]:b.window(x,-.278,.54,.09,.12,"ivory","glass")
    for x in [-.2,.2]:b.window(x,.278,.54,.09,.12,"ivory","glass",math.pi)
    for x,yaw in [(-.375,-math.pi/2),(.375,math.pi/2)]:
        for y in [-.12,.12]:b.window(x,y,.50,.09,.13,"ivory","glass",yaw)

def build_stadium(b,variant):
    wall=["cream","slate","stone"][variant%3];seat=["coral","blue","jade"][variant%3]
    n=16
    tiers=[(.27,.18,.08),(.34,.24,.18),(.41,.30,.29),(.49,.37,.42)]
    for j in range(len(tiers)-1):
        rx,ry,z=tiers[j];rx2,ry2,z2=tiers[j+1]
        for i in range(n):
            a=math.tau*i/n;aa=math.tau*(i+1)/n
            p=(math.cos(a)*rx,math.sin(a)*ry,z);q=(math.cos(aa)*rx,math.sin(aa)*ry,z)
            r=(math.cos(aa)*rx2,math.sin(aa)*ry2,z2);s=(math.cos(a)*rx2,math.sin(a)*ry2,z2)
            b.face([s,r,q,p],seat if (i+j)%3 else "gold")
    for i in range(n):
        a=math.tau*i/n;aa=math.tau*(i+1)/n
        b.face([(.49*math.cos(a),.37*math.sin(a),.02),(.49*math.cos(aa),.37*math.sin(aa),.02),
                (.49*math.cos(aa),.37*math.sin(aa),.42),(.49*math.cos(a),.37*math.sin(a),.42)],wall)
    b.box((0,0,.06),(.54,.35,.04),"leaf",.018)
    b.box((0,0,.085),(.012,.32,.008),"ivory",.002)
    for y in [-.15,.15]:b.box((0,y,.085),(.48,.009,.008),"ivory",.002)
    b.box((0,-.375,.18),(.14,.05,.27),"coral",.014)
    for x in [-.37,.37]:
        b.rod((x,-.19,.39),(x,-.19,.82),.014,"stone",5)
        b.box((x,-.19,.79),(.12,.1,.08),"white",.01)
    for x in [-.23,0,.23]:b.window(x,-.36,.25,.10,.12,"ivory","glass")

def build_skyscraper(b,variant):
    glass=["sky","blue","glass"][variant%3];trim=["ivory","stone","gold"][variant%3]
    b.box((0,0,.43),(.59,.54,.86),glass,.03)
    b.box((0,0,.89),(.63,.58,.06),trim,.016)
    for z in [.17,.35,.53,.71]:
        for x in [-.20,0,.20]:
            b.window(x,-.28,z,.105,.13,trim,"glass")
            b.window(x,.28,z,.105,.13,trim,"glass",math.pi)
        for x,yaw in [(-.31,-math.pi/2),(.31,math.pi/2)]:
            for y in [-.17,0,.17]:b.window(x,y,z,.105,.13,trim,"glass",yaw)
    b.box((0,0,.93),(.43,.39,.06),trim,.012)
    b.box((0,0,1.01),(.29,.28,.13),glass,.014)
    b.tapered((0,0,1.08),(0,0,1.22),.15,.01,trim,6)
    b.box((0,-.30,.15),(.13,.025,.28),"cream",.018)

def build_mountain(b,variant):
    rng=b.rng;cols=7;rows=7;verts=[]
    for j in range(rows):
        row=[]
        for i in range(cols):
            x=(i/(cols-1)-.5)*.96;y=(j/(rows-1)-.5)*.90
            edge=max(abs(x)/.48,abs(y)/.45)
            radial=max(0,1-edge)
            detail=rng.uniform(-.045,.045)
            ridge=math.exp(-((x+.10)**2*17+(y-.02)**2*9))*.42+math.exp(-((x-.18)**2*28+(y+.17)**2*22))*.28
            z=.035+radial*(ridge+.13+detail)
            if i in [0,cols-1] or j in [0,rows-1]:z=.025
            row.append((x,y,z))
        verts.append(row)
    for j in range(rows-1):
        for i in range(cols-1):
            a,bp=verts[j][i],verts[j][i+1];c,d=verts[j+1][i+1],verts[j+1][i]
            color=("stone" if (i+j+variant)%3 else "honey") if max(a[2],bp[2],c[2],d[2])>.22 else ["leaf","jade","lime"][(i+j+variant)%3]
            b.face([a,bp,c],color);b.face([a,c,d],color)
    perimeter=verts[0]+[row[-1] for row in verts[1:]]+list(reversed(verts[-1][:-1]))+[row[0] for row in reversed(verts[1:-1])]
    b.face(list(reversed([(x,y,0) for x,y,z in perimeter])),"jade")
    for i,p in enumerate(perimeter):
        q=perimeter[(i+1)%len(perimeter)]
        b.face([(p[0],p[1],0),(q[0],q[1],0),q,p],"stone")

def build_island(b,variant):
    cliff=["coral","honey","stone"][variant%3]
    layouts=json.loads((ART/"island-layout.json").read_text(encoding="utf-8"))
    layout=layouts["lanai" if variant==1 else "oahu"]
    coast=layout["coast"];lo=[min(p[i] for p in coast) for i in range(2)];hi=[max(p[i] for p in coast) for i in range(2)]
    extent=max(hi[i]-lo[i] for i in range(2));center=[(hi[i]+lo[i])/2 for i in range(2)]
    def point(x,y):return((x-center[0])/extent*.90,-(y-center[1])/extent*.90)
    footprint=[point(x,y) for x,y in coast]
    area=sum(footprint[i][0]*footprint[(i+1)%len(footprint)][1]-footprint[(i+1)%len(footprint)][0]*footprint[i][1] for i in range(len(footprint)))
    if area<0:footprint.reverse()
    outlines=[]
    for scale in [1,.95,.90]:outlines.append([(x*scale,y*scale) for x,y in footprint])
    b.face(list(reversed([(x,y,0) for x,y in outlines[0]])),cliff)
    for layer,(lo,hi,z0,z1,col) in enumerate([(outlines[0],outlines[1],0,.12,cliff),(outlines[1],outlines[2],.12,.17,"honey")]):
        l0=[(x,y,z0) for x,y in lo];l1=[(x,y,z1) for x,y in hi]
        for i in range(len(lo)):
            j=(i+1)%len(lo);b.face([l0[i],l0[j],l1[j],l1[i]],col)
    b.prism(outlines[-1],.16,.205,"leaf")
    b.rod((-.22,-.08,.19),(-.14,-.07,.025),.045,"water",7)
    for path in layout["ridges"]:
        for pos in path[::2]:
            x,y=point(*pos);mountain=Sculpt(variant+8);build_mountain(mountain,variant);b.module(mountain,(x*.9,y*.9,.205),.18)
    for i,pos in enumerate([(0,0),(700,300)]):
        x,y=point(*pos);tree=Sculpt(i)
        if variant==1:build_pine(tree,i)
        else:build_palm(tree,i)
        b.module(tree,(x*.9,y*.9,.205),.22)
    x,y=point(0,0);home=Sculpt(variant);build_house(home,variant);b.module(home,(x*.9-.07,y*.9,.205),.13)

def build_mailbox(b,variant):
    shell=["coral","blue","mint"][variant%3]
    b.tapered((0,0,0),(0,0,.62),.045,.035,"wood",7)
    b.box((0,0,.65),(.58,.33,.32),shell,.055)
    b.blob((0,0,.78),(.29,.165,.15),shell,2,8)
    b.box((0,-.172,.65),(.43,.018,.20),"ivory",.018)
    b.box((0,-.19,.68),(.28,.009,.025),"navy",.006)
    b.rod((.29,0,.67),(.29,0,.94),.012,"slate",5)
    b.box((.34,0,.89),(.11,.035,.08),"gold",.008)
    b.cylinder((0,0,.025),.12,.05,"stone",7)

def build_sign(b,variant):
    b.cylinder((0,0,.46),.024,.90,"slate",7)
    color=["jade","blue","coral"][variant%3]
    b.box((0,0,.78),(.67,.045,.26),"ivory",.025)
    b.box((0,-.025,.78),(.61,.012,.21),color,.014)
    b.face([(-.24,-.035,.78),(.06,-.035,.78),(.06,-.035,.84),(.22,-.035,.78),(.06,-.035,.72),(.06,-.035,.765),(-.24,-.035,.765)],"white")
    b.cylinder((0,0,.025),.10,.05,"stone",7)

def build_bin(b,variant):
    color=["jade","coral","blue"][variant%3]
    b.cylinder((0,0,.40),.29,.71,color,10)
    b.cylinder((0,0,.79),.31,.08,"slate",10)
    b.box((0,-.296,.48),(.14,.016,.13),"ivory",.012)
    for i in range(8):
        a=math.tau*i/8;b.rod((math.cos(a)*.285,math.sin(a)*.285,.12),(math.cos(a)*.285,math.sin(a)*.285,.72),.01,"mint",4)
    b.box((0,0,.865),(.20,.10,.055),"slate",.012)

def build_hydrant(b,variant):
    color=["coral","gold","sky"][variant%3]
    b.cylinder((0,0,.31),.15,.49,color,9)
    b.tapered((0,0,.55),(0,0,.73),.18,.065,color,9)
    b.cylinder((0,0,.06),.21,.08,"slate",9)
    for x in [-.22,.22]:
        b.cylinder((x,0,.39),.095,.16,color,8,axis="x")
        b.cylinder((x*1.25,0,.39),.102,.035,"ivory",8,axis="x")
    b.cylinder((0,-.15,.35),.08,.055,"gold",8,axis="y")
    b.box((0,0,.75),(.08,.08,.04),"slate",.009)

def build_truck(b,variant):
    color=["sky","coral","gold"][variant%3]
    b.box((0,0,.23),(1.05,.43,.17),"slate",.035)
    b.box((.30,0,.43),(.36,.43,.40),color,.060)
    for y,yaw in [(-.225,0),(.225,math.pi)]:b.window(.31,y,.50,.20,.16,"ivory","glass",yaw)
    b.window(.49,0,.51,.28,.16,"ivory","glass",math.pi/2)
    if variant==1:
        b.box((-.22,0,.36),(.62,.45,.10),"wood",.025)
        for y in [-.23,.23]:b.box((-.22,y,.46),(.62,.035,.16),color,.008)
        for x in [-.34,-.12]:b.box((x,0,.49),(.16,.31,.18),"honey",.025)
    else:
        b.box((-.24,0,.51),(.61,.46,.50),"ivory",.035)
        b.box((-.24,-.24,.55),(.39,.012,.055),color,.006)
        b.box((-.24,.24,.55),(.39,.012,.055),color,.006)
        b.box((-.555,0,.47),(.02,.33,.30),"stone",.009)
    for x in [-.34,.34]:
        for y in [-.23,.23]:
            b.cylinder((x,y,.13),.115,.07,"charcoal",8,axis="y")
            b.cylinder((x,y*1.17,.13),.048,.075,"stone",7,axis="y")
    for y in [-.15,.15]:b.box((.50,y,.31),(.024,.09,.06),"white",.008)

def build_pine(b,variant):
    b.tapered((0,0,0),(0,0,.93),.055,.018,"wood",7)
    for j,(z,r) in enumerate([(.29,.29),(.50,.24),(.68,.18),(.83,.12)]):
        b.tapered((0,0,z-.13),(0,0,z+.22),r,.015,["jade","leaf","mint"][(j+variant)%3],8)
        if j<3:
            for k in range(4):
                a=math.tau*k/4+variant*.23;b.rod((0,0,z),(r*.85*math.cos(a),r*.85*math.sin(a),z-.04),.012,"wood",5)

def build_palm(b,variant):
    tilt=[-.10,.07,.14][variant%3]
    b.rod((0,0,.02),(tilt*.25,0,.30),.045,"honey",7)
    b.rod((tilt*.25,0,.30),(tilt*.65,0,.59),.033,"wood",7)
    b.rod((tilt*.65,0,.59),(tilt,0,.84),.024,"honey",7)
    for i in range(7):
        a=math.tau*i/7;dx,dy=math.cos(a),math.sin(a);px,py=-dy,dx
        points=[(tilt,0,.87),(tilt+dx*.27+px*.05,dy*.27+py*.05,.93),
                (tilt+dx*.46,dy*.46,.74),(tilt+dx*.25-px*.05,dy*.25-py*.05,.89)]
        b.face(points,["leaf","lime","mint"][i%3]);b.face(list(reversed(points)),"jade")
        b.rod((tilt,0,.86),(tilt+dx*.43,dy*.43,.75),.008,"leaf",5)
    for i in range(3):b.blob((tilt+math.cos(i*2.1)*.045,math.sin(i*2.1)*.045,.82),(.045,.045,.05),"honey",2,6)

def build_rockspire(b,variant):
    b.blob((0,0,.40),(.30,.24,.39),"honey",4,7)
    b.blob((.08,.01,.81),(.20,.17,.29),"stone",3,6)
    for x in [-.27,.24]:b.blob((x,.08,.16),(.19,.18,.16),"coral",2,6)
    b.prism([(-.38,-.28),(.39,-.25),(.32,.29),(-.30,.32)],0,.025,"honey")

def build_resort(b,variant):
    for i,(x,y) in enumerate([(-.37,.19),(.31,.20),(0,.34)]):
        unit=Sculpt(variant*10+i);build_house(unit,(variant+i)%3);b.module(unit,(x,y,.015),.40)
    b.box((0,0,.035),(1.06,.82,.07),"honey",.06)
    b.prism([(-.22,-.28),(.22,-.28),(.26,.02),(-.26,.02)],.073,.085,"water")
    for x in [-.39,.40]:
        tree=Sculpt(variant);build_palm(tree,variant);b.module(tree,(x,-.22,.075),.38)
    b.box((0,-.32,.095),(.61,.08,.03),"ivory",.012)

def build_cliff(b,variant):
    mountain=Sculpt(variant+90);build_mountain(mountain,variant)
    b.module(mountain,(0,0,.16),1)
    outline=[(-.48,-.44),(.46,-.42),(.42,.44),(-.44,.40)]
    b.prism(outline,0,.18,["honey","stone","coral"][variant%3],side="slate")

def build_small_pickup(b,name,variant):
    accent=["rose","sky","lilac"][variant%3]
    if name=="candy":
        b.cylinder((0,0,.24),.20,.36,accent,8,axis="x",top="ivory")
        for side in [-1,1]:
            part=Sculpt(variant);part.tapered((0,0,0),(0,0,.15),.07,.15,"gold",5)
            for f,c in zip(part.faces,part.colors):
                points=[(side*(.19+p[2]),p[0],.24+p[1]) for p in [part.verts[i] for i in f]]
                b.face(list(reversed(points)) if side<0 else points,c)
        b.window(0,-.205,.24,.14,.12,"white",accent)
    elif name=="cherries":
        for x,z in [(-.15,.21),(.15,.25)]:
            b.blob((x,0,z),(.18,.17,.18),"rose",2,6)
            b.rod((x,0,z+.12),(0,0,.58),.015,"wood",5)
        b.face([(0,0,.58),(.22,.025,.63),(.10,.07,.73)],"leaf")
        b.face([(.10,.07,.73),(.22,.025,.63),(0,0,.58)],"lime")
    elif name=="mushroom":
        b.tapered((0,0,0),(0,0,.32),.11,.075,"ivory",7)
        b.blob((0,0,.38),(.31,.30,.17),accent,2,8)
        for x,y in [(-.1,-.14),(.13,.02),(0,.16)]:b.cylinder((x,y,.51),.04,.01,"white",5)
    elif name=="donut":
        rings=[]
        for i in range(10):
            a=math.tau*i/10;rings.append([((.25+.11*math.cos(math.tau*j/4))*math.cos(a),(.25+.11*math.cos(math.tau*j/4))*math.sin(a),.14+.10*math.sin(math.tau*j/4)) for j in range(4)])
        for i in range(10):
            for j in range(4):b.face([rings[i][j],rings[(i+1)%10][j],rings[(i+1)%10][(j+1)%4],rings[i][(j+1)%4]],accent if j<2 else "honey")
        for a in [0,2.1,4.2]:b.rod((math.cos(a)*.23,math.sin(a)*.23,.245),(math.cos(a)*.23+.06,math.sin(a)*.23+.03,.245),.01,"sun",4)
    elif name=="soda":
        b.cylinder((0,0,.34),.20,.65,accent,8,top="ivory")
        b.cylinder((0,0,.675),.21,.025,"slate",8)
        b.prism([(-.045,-.025),(.045,-.025),(.045,.045),(-.045,.045)],.69,.705,"ivory")
        b.window(0,-.206,.36,.22,.27,"white",accent)
    elif name=="milk":
        b.prism([(-.21,-.16),(.21,-.16),(.21,.16),(-.21,.16)],0,.58,"ivory",accent)
        b.gable(.21,-.16,.16,.58,.74,"sky")
        b.window(0,-.17,.32,.23,.28,"white","blue")
        b.prism([(-.06,-.16),(.06,-.16),(.06,.16),(-.06,.16)],.74,.77,"ivory")
    elif name=="flowerpot":
        b.tapered((0,0,0),(0,0,.37),.15,.24,"coral",8)
        b.cylinder((0,0,.39),.25,.06,"honey",8,top="wood")
        b.rod((0,0,.42),(0,0,.72),.018,"leaf",5)
        for side in [-1,1]:
            points=[(0,0,.56),(side*.17,.02,.60),(side*.1,0,.67)]
            b.face(points,"lime");b.face(list(reversed(points)),"leaf")
        b.blob((0,0,.76),(.16,.14,.13),accent,2,7)
    elif name=="cupcake":
        b.tapered((0,0,0),(0,0,.24),.18,.25,accent,8)
        b.blob((0,0,.30),(.28,.26,.17),"ivory",2,8)
        b.blob((0,0,.46),(.06,.06,.07),"rose",1,6)
    elif name=="sushi":
        b.prism([(-.42,-.24),(.42,-.24),(.42,.24),(-.42,.24)],0,.055,"navy")
        for x in [-.25,0,.25]:
            b.blob((x,0,.12),(.12,.18,.075),"ivory",2,5)
            b.prism([(x-.105,-.15),(x+.105,-.15),(x+.105,.15),(x-.105,.15)],.17,.21,"coral")
    elif name=="teapot":
        b.blob((0,0,.23),(.24,.21,.22),accent,2,6)
        b.cylinder((0,0,.42),.16,.06,"ivory",6)
        b.blob((0,0,.48),(.05,.05,.045),"gold",1,5)
        part=Sculpt(variant);part.torus_vertical((.30,0,.26),.14,.035,"gold",6);b.module(part)
        b.tapered((-.17,0,.20),(-.36,0,.35),.08,.045,accent,5)
    elif name=="duck":
        b.blob((0,0,.17),(.25,.18,.15),"sun",2,6)
        b.blob((.16,0,.35),(.14,.13,.14),"gold",2,6)
        b.prism([(.24,-.07),(.39,-.045),(.39,.045),(.24,.07)],.31,.36,"coral")
        for y in [-.126,.126]:
            points=[(.17,y,.37),(.20,y,.37),(.20,y,.40),(.17,y,.40)]
            b.face(list(reversed(points)) if y>0 else points,"black")

def build_roll_guide(b,variant):
    # Original lime explorer: leaf helmet, lilac overalls and hiking boots.
    for x in [-.115,.115]:
        b.box((x,-.045,.065),(.17,.28,.13),"plum",.02)
        b.tapered((x,0,.12),(x,0,.29),.065,.06,"lilac",6)
    b.blob((0,0,.37),(.18,.12,.16),"lilac",3,8)
    b.box((0,-.105,.40),(.15,.025,.12),"plum",.015)
    for side in [-1,1]:
        b.rod((side*.15,0,.43),(side*.24,-.04,.29),.035,"mint",6)
        b.blob((side*.24,-.04,.29),(.05,.045,.05),"lime",2,6)
    b.blob((0,0,.66),(.23,.16,.23),"lime",3,8)
    b.blob((0,.015,.82),(.26,.17,.105),"leaf",2,8)
    points=[(-.07,-.05,.90),(.03,-.05,1.02),(.13,-.05,.92)]
    b.face(points,"mint");b.face(list(reversed(points)),"mint")
    for x in [-.083,.083]:
        b.cylinder((x,-.154,.69),.034,.018,"white",7,axis="y")
        b.cylinder((x,-.166,.688),.017,.012,"charcoal",6,axis="y")
    b.face([(-.045,-.163,.60),(0,-.17,.59),(.045,-.163,.60)],"rose")

def build_diorama_art(b,name,variant):
    if name in ["candy","cherries","mushroom","donut","soda","milk","flowerpot","cupcake","sushi","teapot","duck"]:build_small_pickup(b,name,variant)
    elif name=="guide":build_roll_guide(b,variant)
    elif name=="car":build_car(b,variant,"car")
    elif name=="van":build_car(b,variant,"van")
    elif name=="convertible":build_car(b,variant,"convertible")
    elif name=="bus":build_car(b,variant,"bus")
    elif name=="cat":build_creature(b,variant,"cat")
    elif name=="dog":build_creature(b,variant,"dog")
    elif name=="tree":build_tree(b,variant,False)
    elif name=="oak":build_tree(b,variant,True)
    elif name=="bush":build_bush(b,variant)
    elif name=="house":build_house(b,variant)
    elif name=="apartment":build_apartment(b,variant)
    elif name=="windmill":build_windmill(b,variant)
    elif name=="ferris":build_ferris(b,variant)
    elif name=="watertower":build_watertower(b,variant)
    elif name=="clocktower":build_clocktower(b,variant)
    elif name=="castle":build_castle(b,variant)
    elif name=="stadium":build_stadium(b,variant)
    elif name=="skyscraper":build_skyscraper(b,variant)
    elif name=="mountain":build_mountain(b,variant)
    elif name=="island":build_island(b,variant)
    elif name=="bench":build_bench(b,variant)
    elif name=="armchair":build_armchair(b,variant)
    elif name=="suitcase":build_suitcase(b,variant)
    elif name=="lamp":build_lamp(b,variant)
    elif name=="cart":build_cart(b,variant)
    elif name=="booth":build_booth(b,variant)
    elif name=="cone":build_cone(b,variant)
    elif name=="stool":build_stool(b,variant)
    elif name=="vending":build_vending(b,variant)
    elif name=="skateboard":build_skateboard(b,variant)
    elif name=="bike":build_bike(b,variant)
    elif name=="mailbox":build_mailbox(b,variant)
    elif name=="sign":build_sign(b,variant)
    elif name=="bin":build_bin(b,variant)
    elif name=="hydrant":build_hydrant(b,variant)
    elif name=="truck":build_truck(b,variant)
    elif name=="rockspire":build_rockspire(b,variant)
    elif name=="resort":build_resort(b,variant)
    elif name=="cliff":build_cliff(b,variant)
    elif name=="pine":build_pine(b,variant)
    elif name=="palm":build_palm(b,variant)
    else:raise ValueError("Unknown object family: "+name)

MODEL_TYPES={
 0:("candy",2),1:("cherries",2),2:("mushroom",2),3:("donut",2),4:("soda",2),5:("milk",2),
 7:("flowerpot",2),18:("cupcake",2),19:("sushi",2),20:("teapot",2),21:("duck",2),52:("guide",1),
 6:("car",3),8:("cat",2),9:("cone",2),10:("stool",2),11:("bike",2),
 12:("bush",3),13:("vending",2),14:("van",2),15:("house",3),16:("tree",3),
 17:("bench",2),22:("skateboard",2),23:("dog",2),24:("armchair",2),25:("suitcase",2),
 26:("lamp",3),27:("cart",3),28:("booth",2),29:("convertible",3),30:("bus",3),
 31:("oak",3),32:("apartment",3),33:("windmill",2),34:("ferris",3),35:("watertower",3),
 36:("clocktower",3),37:("castle",3),38:("stadium",2),39:("skyscraper",3),
 40:("mountain",3),41:("island",3),
 42:("mailbox",3),43:("sign",3),44:("bin",3),45:("hydrant",3),46:("truck",3),
 47:("rockspire",3),48:("resort",3),49:("cliff",3),50:("pine",3),51:("palm",3),
}

def create_vertex_material():
    material=bpy.data.materials.new("Sunny Toy Palette · shared vertex color")
    material.use_nodes=True
    material.diffuse_color=(1,1,1,1)
    material.roughness=.78
    nodes=material.node_tree.nodes;links=material.node_tree.links
    shader=nodes.get("Principled BSDF")
    vertex=nodes.new("ShaderNodeVertexColor");vertex.layer_name="Col"
    links.new(vertex.outputs["Color"],shader.inputs["Base Color"])
    shader.inputs["Roughness"].default_value=.78
    return material

def make_obj(name,collection,builder,material,grid_index):
    obj,tris,bounds=builder.mesh(name,collection)
    obj.location=((grid_index%7)*1.25,(grid_index//7)*2.3,0)
    obj.data.materials.append(material)
    obj["triangle_count"]=tris
    obj["normalized_bounds"]=bounds
    return obj,tris,bounds

def simple_material(name,color,roughness=.86):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(*color,1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=roughness
    return mat

def raw_mesh(name,collection,builder,material):
    mesh=bpy.data.meshes.new(name+"Geometry");mesh.from_pydata(builder.verts,[],builder.faces);mesh.update()
    if builder.colors:
        attr=mesh.color_attributes.new(name="Col",type="FLOAT_COLOR",domain="CORNER")
        for poly,color in zip(mesh.polygons,builder.colors):
            rgba=C[color] if isinstance(color,str) else color
            for loop in poly.loop_indices:attr.data[loop].color=(*rgba,1)
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    if material:mesh.materials.append(material)
    return obj

def road_ribbon(name,collection,points,width,z,color,material):
    b=Sculpt(0);half=width/2
    for i,(x,y)in enumerate(points):
        if i==0:dx=points[1][0]-x;dy=points[1][1]-y
        elif i==len(points)-1:dx=x-points[i-1][0];dy=y-points[i-1][1]
        else:dx=points[i+1][0]-points[i-1][0];dy=points[i+1][1]-points[i-1][1]
        length=math.hypot(dx,dy) or 1;ox=-dy/length*half;oy=dx/length*half
        b.verts.extend([(x+ox,y+oy,z),(x-ox,y-oy,z)])
    for i in range(len(points)-1):
        a=i*2;b.faces.append((a,a+1,a+3,a+2));b.colors.append(color)
    return raw_mesh(name,collection,b,material)

def build_phase_one_preview(scene,library,mesh_by_name,material,root):
    collection=bpy.data.collections.new("Phase 1 · sunny toy-town street");scene.collection.children.link(collection)
    groundmat=simple_material("Meadow · satin mint",(0.28,.60,.26))
    roadmat=simple_material("Street · warm slate",(0.31,.37,.38))
    curbmat=simple_material("Kerb · vanilla",(.9,.80,.57))
    detailmat=simple_material("Marking · soft cream",(.94,.87,.69))
    grass=Sculpt(100);grass.box((0,0,-.30),(116,100,.60),"leaf",.18,"jade")
    raw_mesh("Meadow diorama slab",collection,grass,groundmat)
    route=[(-54,-32),(-30,-20),(-26,1),(-15,18),(-4,28),(16,31),(35,19),(50,1)]
    road_ribbon("Raised cream road kerb",collection,route,10.0,.005,"cream",curbmat)
    road_ribbon("Winding toy asphalt",collection,route,8.3,.015,"slate",roadmat)
    # Crosswalk bars make the small street legible at the fixed game camera.
    for i in range(5):
        stripe=Sculpt(i);stripe.box((-29+i*.58,-8,.03),(.29,.7,.018),"ivory",.006)
        raw_mesh("Crosswalk "+str(i+1),collection,stripe,detailmat)
    # Painted planting islands create inhabited clusters around roads.
    for j,(x,y)in enumerate([(-39,-15),(-34,13),(6,41),(40,9),(25,-19)]):
        planter=Sculpt(j);planter.prism([(x-.9,y-.7),(x+.9,y-.7),(x+1.1,y),(x+.6,y+.8),(x-.7,y+.7),(x-1.1,y)],.003,.15,"honey")
        raw_mesh("Park planter "+str(j+1),collection,planter,simple_material("Planter clay "+str(j),(.65,.40,.24)))
        green=Sculpt(j+30)
        for k in range(3):green.blob((x-.4+k*.4,y,.35),(.28,.27,.20),["lime","mint","leaf"][k],3,7)
        raw_mesh("Toy shrubs "+str(j+1),collection,green,material)
    placements=[
      (15,0,-17,-24,5.1,0),(15,1,-19,10,5.1,0),(15,2,-3,33,5.1,0),(32,0,31,15,22,0),
      (16,0,-23,-30,3.78,0),(16,1,-14,-26,3.78,0),(16,2,16,8,3.78,0),
      (31,1,25,-16,14,0),(6,0,-8,-7,.62,0),(29,1,10,-22,4.6,.15),
      (30,2,17,2,9,0),(11,0,-36,5,1.78,0),(17,1,-36,-3,2.6,0),
      (26,1,-10,-12,3.2,0),(27,2,13,-13,2.4,0),(28,1,40,-2,2.6,0),
      (33,0,33,-19,28,0),(42,0,-18,-19,1.2,0),(43,0,-30,-8,2.8,0),
      (44,2,-36,-5,1.05,0),(45,1,-26,-10,.85,0),(46,1,5,-16,5.8,.15),
      (50,1,-27,13,4.5,0),(51,0,27,5,5.5,0),(51,2,19,32,5.5,0),
    ]
    for type_id,variant,x,y,size,yaw in placements:
        family,count=MODEL_TYPES[type_id];name=f"pickup_{type_id:02d}_{variant}"
        obj=mesh_by_name[name].copy();obj.data=mesh_by_name[name].data
        obj.name=f"Street · {family} · {variant}";collection.objects.link(obj)
        obj.location=(x,y,.018);obj.rotation_euler[2]=yaw;obj.scale=(size*1.04,)*3
        obj.hide_render=False;obj.hide_set(False)
    # The Blender file opens at the art-kit library, while this sibling file
    # preserves a complete street composition for iteration and screenshots.
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    scene.render.filepath=str(root/"outputs"/"katamari-toy-town-phase1.png")
    scene.world.color=(.20,.27,.34)
    scene.world.use_nodes=True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.27,.39,.50,1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.38
    sun_data=bpy.data.lights.new("Warm toy-store sun","SUN");sun_data.energy=1.9;sun_data.angle=math.radians(12)
    sun=bpy.data.objects.new("Warm toy-store sun",sun_data);collection.objects.link(sun);sun.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-32))
    filldata=bpy.data.lights.new("Soft sky fill","AREA");filldata.energy=1800;filldata.shape="DISK";filldata.size=58
    fill=bpy.data.objects.new("Soft sky fill",filldata);collection.objects.link(fill);fill.location=(4,-42,70)
    camdata=bpy.data.cameras.new("Phase 1 · game-camera preview");cam=bpy.data.objects.new("Phase 1 · game-camera preview",camdata);collection.objects.link(cam)
    cam.location=(66,-82,82);target=Vector((0,0,15));cam.rotation_euler=(target-Vector(cam.location)).to_track_quat("-Z","Y").to_euler()
    camdata.type="ORTHO";camdata.ortho_scale=112;scene.camera=cam
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.compression=18
    scene.view_settings.view_transform="Standard"
    scene.view_settings.exposure=-.45
    bpy.ops.wm.save_as_mainfile(filepath=str(root/"art"/"toytown"/"phase1-toy-street.blend"))
    bpy.context.scene.render.filepath=str(root/"outputs"/"katamari-toy-town-phase1.png")
    bpy.ops.render.render(write_still=True)

def build_lod_billboards(mesh_by_name,root):
    lod=bpy.data.scenes.new("Shared pickup billboard LOD export")
    lod.render.engine="BLENDER_EEVEE"
    lod.render.resolution_x=lod.render.resolution_y=512;lod.render.resolution_percentage=100
    lod.render.film_transparent=True;lod.render.image_settings.file_format="PNG"
    lod.render.image_settings.color_mode="RGBA";lod.view_settings.view_transform="Standard";lod.view_settings.exposure=-.45
    lod.world=bpy.data.worlds.new("LOD soft sky");lod.world.use_nodes=True
    lod.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.60
    data=bpy.data.lights.new("LOD warm sun","SUN");data.energy=1.8;data.angle=math.radians(15)
    sun=bpy.data.objects.new("LOD warm sun",data);lod.collection.objects.link(sun);sun.rotation_euler=(.4,-.45,-.6)
    camdata=bpy.data.cameras.new("LOD camera");cam=bpy.data.objects.new("LOD camera",camdata);lod.collection.objects.link(cam)
    cam.location=(2.3,-3.5,3.5);target=Vector((0,0,.42));cam.rotation_euler=(target-Vector(cam.location)).to_track_quat("-Z","Y").to_euler()
    camdata.type="ORTHO";camdata.ortho_scale=1.55;lod.camera=cam
    folder=root/"art"/"toytown"/"billboards";folder.mkdir(parents=True,exist_ok=True)
    for type_id in range(42,52):
        name=f"pickup_{type_id:02d}_0";source=mesh_by_name[name]
        obj=source.copy();obj.data=source.data;obj.location=(0,0,0);obj.hide_render=False;lod.collection.objects.link(obj)
        lod.render.filepath=str(folder/f"prop-{TYPES_ART[type_id]}.png")
        bpy.ops.render.render(write_still=True,scene=lod.name)
        bpy.data.objects.remove(obj,do_unlink=True)
        print("LOD_RENDERED",type_id,flush=True)

def main():
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name!="Collection":bpy.data.collections.remove(collection)
    scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE"
    lib=bpy.data.collections.new("MODEL LIBRARY · low-poly vehicle/building/nature/landmark families")
    scene.collection.children.link(lib)
    material=create_vertex_material();model_by_name={};metadata={};model_index=0
    for type_id,(family,variants) in MODEL_TYPES.items():
        names=[]
        for variant in range(variants):
            rng=random.Random(type_id*101+variant*29+7)
            sculpt=Sculpt(type_id*101+variant*29+7)
            build_diorama_art(sculpt,family,variant)
            name=f"pickup_{type_id:02d}_{variant}"
            obj,triangles,bounds=make_obj(name,lib,sculpt,material,model_index)
            obj.location.y=(model_index//7)*2.3
            model_index+=1;names.append(name);model_by_name[name]=obj
            metadata[name]={"type":type_id,"family":family,"variant":variant,"triangles":triangles,"bounds":bounds,"pivot":"bottom center"}
        threshold=34 if type_id in [9,10,11,22,23,24,25,26,27,28] else 30
        metadata[str(type_id)]={"family":family,"models":names,"minScreenPixels":threshold,"sourceArtwork":f"/assets/prop-{TYPES_ART[type_id]}.webp" if type_id in TYPES_ART else None}
    models=[obj for name,obj in model_by_name.items()]
    for obj in bpy.context.selected_objects:obj.select_set(False)
    for obj in models:obj.select_set(True)
    bpy.context.view_layer.objects.active=models[0]
    glb=str(PUBLIC/"toy-town.glb")
    display_locations=[obj.location.copy() for obj in models]
    for obj in models:obj.location=(0,0,0)
    bpy.ops.export_scene.gltf(filepath=glb,export_format="GLB",use_selection=True,export_yup=True,export_apply=True)
    for obj,location in zip(models,display_locations):obj.location=location
    (PUBLIC/"manifest.json").write_text(json.dumps({"version":1,"library":"/models/toy-town.glb","types":{str(k):v for k,v in metadata.items() if str(k).isdigit()},"models":{k:v for k,v in metadata.items() if not k.isdigit()}},indent=2),encoding="utf-8")
    (ART/"asset-budgets.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/"toy-town-model-library.blend"))
    lib.hide_render=True
    if not args.get("skip_preview"):build_phase_one_preview(scene,lib,model_by_name,material,ROOT)
    if not args.get("skip_lods"):build_lod_billboards(model_by_name,ROOT)
    __result__={"glb":glb,"blend":str(ART/"toy-town-model-library.blend"),"preview_blend":str(ART/"phase1-toy-street.blend"),"preview_png":str(OUTPUT/"katamari-toy-town-phase1.png"),"model_count":len(models),"triangle_count":sum(m["triangles"] for name,m in metadata.items() if not name.isdigit()),"over_3000_triangles":[(n,m["triangles"]) for n,m in metadata.items() if not n.isdigit() and m["triangles"]>3000],"type_count":len(MODEL_TYPES)}

TYPES_ART={0:0,1:1,2:2,3:3,4:4,5:5,7:7,18:20,19:21,20:22,21:23,6:6,8:8,9:9,10:10,11:11,12:12,13:13,14:14,15:15,16:16,17:17,22:24,23:25,24:26,25:27,26:28,27:29,28:30,29:31,30:32,31:33,32:34,33:35,34:36,35:37,36:38,37:39,38:40,39:41,40:42,41:43,42:44,43:45,44:46,45:47,46:48,47:49,48:50,49:51,50:52,51:53}

if __name__=="__main__":main()
