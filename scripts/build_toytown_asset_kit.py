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

    def box(self, center, dims, color, bevel=0.035, side=None):
        x, y, z = center
        w, d, h = (max(0.002, abs(v)) for v in dims)
        b = min(bevel, w*.22, d*.22, h*.22)
        ring = [(-w/2+b, -d/2), (w/2-b, -d/2), (w/2, -d/2+b),
                (w/2, d/2-b), (w/2-b, d/2), (-w/2+b, d/2),
                (-w/2, d/2-b), (-w/2, -d/2+b)]
        lower = [(x+a, y+c, z) for a, c in ring]
        upper = [(x+a, y+c, z+h) for a, c in ring]
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
            if axis=="y": a.append((x+r*c,y-depth/2,z+r*s)); b.append((x+r*c,y+depth/2,z+r*s))
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
        self.face(left,color);self.face(right,color)
        self.face([(-halfwidth,front,eave),(0,front,peak),(halfwidth,front,eave)],color)
        self.face([(halfwidth,back,eave),(0,back,peak),(-halfwidth,back,eave)],color)

    def window(self, x, y, z, w, h, trim="ivory", glass="glass"):
        self.box((x,y,z),(w+.045,.027,h+.045),trim,.012)
        self.box((x,y-.018,z),(w,.018,h),glass,.008)
        self.box((x,y-.032,z),(w*.055,.012,h),"cream",.002)
        self.box((x,y-.033,z),(w,.012,h*.055),"cream",.002)

    def torus_vertical(self, center, radius, tube, color, segments=18):
        x,y,z=center;outer=[];inner=[];r=max(.006,tube)
        for i in range(segments):
            a=math.tau*i/segments;c,s=math.cos(a),math.sin(a)
            outer.append((x+(radius+r)*c,y,z+(radius+r)*s))
            inner.append((x+(radius-r)*c,y,z+(radius-r)*s))
        for i in range(segments):
            j=(i+1)%segments
            self.face([outer[i],outer[j],inner[j],inner[i]],color)

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
    b.box((0,0,.29),(.77,.68,.58),wall,.065,["honey","ivory","cream"][variant%3])
    b.gable(.45,-.43,.43,.55,.94,roof)
    b.box((0,-.357,.19),(.16,.028,.36),["wood","jade","plum"][variant%3],.018)
    b.cylinder((.055,-.381,.385),.012,.014,"gold",6,axis="y")
    for x in [-.22,.22]:b.window(x,-.35,.42,.145,.16,"ivory",["glass","sky","lilac"][variant%3])
    if variant!=1:
        b.box((.22,.17,.79),(.12,.16,.25),"slate",.02);b.box((.22,.17,.93),(.15,.18,.035),"cream",.01)
    b.box((0,-.48,.035),(.36,.17,.075),"stone",.022)
    if variant==2:b.box((0,-.41,.585),(.42,.08,.055),"gold",.01)

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
            b.blob((x,y,z),(r,r*.9,r),leaf,3,7)

def build_bush(b,variant):
    color=["leaf","lime","mint"][variant%3]
    for x,y,z,r in [(-.22,0,.25,.24),(.18,0,.25,.25),(0,.06,.43,.27),(0,-.18,.27,.22)]:
        b.blob((x,y,z),(r,r*.88,r*.83),color,3,7)
    b.prism([(-.42,-.27),(.4,-.27),(.38,.28),(-.38,.28)],0,.06,"wood")

def build_car(b,variant,kind="car"):
    body=["coral","sky","mint","gold"][variant%4];glass=["glass","sky","lilac"][variant%3]
    length=.94 if kind in ("bus","van") else .82;width=.39 if kind=="car" else .43
    baseH=.23 if kind=="car" else .32
    b.box((0,0,.22),(length,width,.23),body,.07,"honey")
    cabinL=.43 if kind=="car" else .56
    b.box((-.04,0,.405),(cabinL,width*.8,.22 if kind=="car" else .28),["ivory","cream","white"][variant%3],.065)
    front=-.04-cabinL/2-.006
    b.box((0,0,.39),(cabinL*.77,width*.815,.135),glass,.042)
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
        cx=math.sin(a)*.42;cz=.77+math.cos(a)*.42
        b.prism([(cx-.085,-.02),(cx+.085,-.02),(cx+.06,.05),(cx-.06,.05)],cz-.28,cz+.28,["ivory","cream"][j%2])
        b.box((cx,-.045,cz),(.07,.05,.12),"honey",.012)
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

def build_stadium(b,variant):
    wall=["cream","slate","sand"][variant%3];seat=["coral","blue","jade"][variant%3]
    for z,rx,ry,c in [(0,.48,.37,wall),(.19,.43,.33,seat),(.34,.37,.28,wall),(.47,.31,.23,seat)]:
        b.cylinder((0,0,z+.07),(rx+ry)*.5,.14,c,12)
    b.cylinder((0,0,.58),.28,.025,"leaf",12)
    b.box((0,-.375,.28),(.14,.05,.27),"coral",.014)
    for x in [-.37,.37]:
        b.rod((x,-.19,.39),(x,-.19,.82),.014,"stone",5)
        b.box((x,-.19,.79),(.12,.1,.08),"white",.01)
    for y in [-.17,.17]:b.box((0,y,.61),(.42,.012,.008),"ivory",.002)

def build_skyscraper(b,variant):
    glass=["sky","blue","glass"][variant%3];trim=["ivory","stone","gold"][variant%3]
    b.box((0,0,.43),(.59,.54,.86),glass,.03)
    b.box((0,0,.89),(.63,.58,.06),trim,.016)
    for z in [.17,.35,.53,.71]:
        for x in [-.20,0,.20]:b.box((x,-.28,z),(.105,.016,.13),["glass","sky","lilac"][variant%3],.008)
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
            z=.035+radial*(.35+detail)
            if i in [0,cols-1] or j in [0,rows-1]:z=.025
            row.append((x,y,z))
        verts.append(row)
    for j in range(rows-1):
        for i in range(cols-1):
            a,bp=verts[j][i],verts[j][i+1];c,d=verts[j+1][i+1],verts[j+1][i]
            color="stone" if (i+j+variant)%3 else "honey"
            b.face([a,bp,c],color);b.face([a,c,d],color)
    # A few angular ridges and snow caps make the summit read at distance.
    summit=(rng.uniform(-.09,.09),rng.uniform(-.06,.06),.43)
    for i in range(5):
        a=math.tau*i/5;x=rng.uniform(.24,.39)*math.cos(a);y=rng.uniform(.22,.34)*math.sin(a)
        b.face([summit,(x,y,.16),(x*.72,y*.7,.35)],"ivory")
        b.face([summit,(x,y,.16),(x*.72,y*.7,.35)],"white")

def build_island(b,variant):
    cliff=["coral","honey","stone"][variant%3]
    outlines=[]
    for radius in [.46,.43,.39]:
        points=[]
        for i in range(11):
            a=math.tau*i/11;r=radius*(.9+.1*math.sin(i*3+variant))
            points.append((math.cos(a)*r,math.sin(a)*r))
        outlines.append(points)
    for layer,(lo,hi,z0,z1,col) in enumerate([(outlines[0],outlines[1],0,.12,cliff),(outlines[1],outlines[2],.12,.17,"honey")]):
        l0=[(x,y,z0) for x,y in lo];l1=[(x,y,z1) for x,y in hi]
        for i in range(len(lo)):
            j=(i+1)%len(lo);b.face([l0[i],l0[j],l1[j],l1[i]],col)
    b.prism(outlines[-1],.16,.205,"leaf")
    b.rod((-.22,-.08,.19),(-.14,-.07,.025),.045,"water",7)
    for i in range(variant+2):
        a=math.tau*i/(variant+2);x=math.cos(a)*.22;y=math.sin(a)*.20
        b.tapered((x,y,.19),(x,y,.42+ .04*(i%2)),.024,.01,"wood",6)
        for j in range(3):
            z=.37+.045*j;x2=x+math.cos(a+j*.17)*(.06+.015*j);y2=y+math.sin(a+j*.17)*(.06+.015*j)
            b.rod((x,y,z),(x2,y2,z+.045),.009,["lime","mint","leaf"][j],5)

def build_diorama_art(b,name,variant):
    if name=="car":build_car(b,variant,"car")
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
    else:raise ValueError("Unknown object family: "+name)

MODEL_TYPES={
 6:("car",3),8:("cat",2),9:("cone",2),10:("stool",2),11:("bike",2),
 12:("bush",3),13:("vending",2),14:("van",2),15:("house",3),16:("tree",3),
 17:("bench",2),22:("skateboard",2),23:("dog",2),24:("armchair",2),25:("suitcase",2),
 26:("lamp",3),27:("cart",3),28:("booth",2),29:("convertible",3),30:("bus",3),
 31:("oak",3),32:("apartment",3),33:("windmill",2),34:("ferris",3),35:("watertower",3),
 36:("clocktower",3),37:("castle",3),38:("stadium",2),39:("skyscraper",3),
 40:("mountain",3),41:("island",3),
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
    road_ribbon("Raised cream road kerb",collection,route,10.0,.305,"cream",curbmat)
    road_ribbon("Winding toy asphalt",collection,route,8.3,.315,"slate",roadmat)
    # Crosswalk bars make the small street legible at the fixed game camera.
    for i in range(5):
        stripe=Sculpt(i);stripe.box((-29+i*.58,-8,.326),(.29,.7,.018),"ivory",.006)
        raw_mesh("Crosswalk "+str(i+1),collection,stripe,detailmat)
    # Painted planting islands create inhabited clusters around roads.
    for j,(x,y)in enumerate([(-39,-15),(-34,13),(6,41),(40,9),(25,-19)]):
        planter=Sculpt(j);planter.prism([(x-.9,y-.7),(x+.9,y-.7),(x+1.1,y),(x+.6,y+.8),(x-.7,y+.7),(x-1.1,y)],.303,.45,"honey")
        raw_mesh("Park planter "+str(j+1),collection,planter,simple_material("Planter clay "+str(j),(.65,.40,.24)))
        green=Sculpt(j+30)
        for k in range(3):green.blob((x-.4+k*.4,y,.65),(.28,.27,.20),["lime","mint","leaf"][k],3,7)
        raw_mesh("Toy shrubs "+str(j+1),collection,green,material)
    placements=[
      (15,0,-17,-24,5.1,0),(15,1,-19,10,5.1,0),(15,2,-3,33,5.1,0),(32,0,31,15,22,0),
      (16,0,-23,-30,3.78,0),(16,1,-14,-26,3.78,0),(16,2,16,8,3.78,0),
      (31,1,25,-16,14,0),(6,0,-8,-7,.62,0),(29,1,10,-22,4.6,.15),
      (30,2,17,2,9,0),(11,0,-36,5,1.78,0),(17,1,-36,-3,2.6,0),
      (26,1,-10,-12,3.2,0),(27,2,13,-13,2.4,0),(28,1,40,-2,2.6,0),
      (33,0,33,-19,28,0),(35,2,-37,30,36,0),(34,1,26,35,48,0),
    ]
    for type_id,variant,x,y,size,yaw in placements:
        family,count=MODEL_TYPES[type_id];name=f"pickup_{type_id:02d}_{variant}"
        obj=mesh_by_name[name].copy();obj.data=mesh_by_name[name].data
        obj.name=f"Street · {family} · {variant}";collection.objects.link(obj)
        obj.location=(x,y,.318);obj.rotation_euler[2]=yaw;obj.scale=(size*1.04,)*3
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
    bpy.ops.wm.save_as_mainfile(filepath=str(root/"art"/"toytown"/"phase1-toy-street.blend"))
    bpy.context.scene.render.filepath=str(root/"outputs"/"katamari-toy-town-phase1.png")
    bpy.ops.render.render(write_still=True)

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
    bpy.ops.export_scene.gltf(filepath=glb,export_format="GLB",use_selection=True,export_yup=True,export_apply=True)
    (PUBLIC/"manifest.json").write_text(json.dumps({"version":1,"library":"/models/toy-town.glb","types":{str(k):v for k,v in metadata.items() if str(k).isdigit()},"models":{k:v for k,v in metadata.items() if not k.isdigit()}},indent=2),encoding="utf-8")
    (ART/"asset-budgets.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/"toy-town-model-library.blend"))
    lib.hide_render=True
    build_phase_one_preview(scene,lib,model_by_name,material,ROOT)
    __result__={"glb":glb,"blend":str(ART/"toy-town-model-library.blend"),"preview_blend":str(ART/"phase1-toy-street.blend"),"preview_png":str(OUTPUT/"katamari-toy-town-phase1.png"),"model_count":len(models),"triangle_count":sum(m["triangles"] for name,m in metadata.items() if not name.isdigit()),"over_3000_triangles":[(n,m["triangles"]) for n,m in metadata.items() if not n.isdigit() and m["triangles"]>3000],"type_count":len(MODEL_TYPES)}

TYPES_ART={6:6,8:8,9:9,10:10,11:11,12:12,13:13,14:14,15:15,16:16,17:17,22:24,23:25,24:26,25:27,26:28,27:29,28:30,29:31,30:32,31:33,32:34,33:35,34:36,35:37,36:38,37:39,38:40,39:41,40:42,41:43}

if __name__=="__main__":main()
