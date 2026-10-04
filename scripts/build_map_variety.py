"""Supplement the unchanged island library with beach, district and power-up art."""
import bpy, json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
scope={'__name__':'helpers','args':{'project_root':str(ROOT)}}
exec((ROOT/'scripts/build_toytown_asset_kit.py').read_text(),scope)
Sculpt=scope['Sculpt']

def build(b,f,v):
    accent=['coral','sky'][v%2]
    if f=='umbrella':
        b.rod((0,0,0),(0,0,.8),.018,'wood')
        for i in range(10):
            a=i*math.tau/10;c=(i+1)*math.tau/10
            b.face([(0,0,.97),(.52*math.cos(a),.52*math.sin(a),.72),(.52*math.cos(c),.52*math.sin(c),.72)],accent if i%2 else 'ivory')
        b.box((0,0,.012),(.9,.65,.025),'mint',.02)
    elif f=='lounge':
        for y in [-.17,.17]:
            b.rod((-.4,y,.05),(.35,y,.30),.025,'ivory');b.rod((.4,y,.05),(-.18,y,.35),.025,'ivory')
        b.box((.03,0,.24),(.75,.35,.06),accent,.025)
        b.box((-.31,0,.43),(.12,.35,.36),'cream',.02)
    elif f=='surfboard':
        b.prism([(-.5,0),(-.35,-.11),(.28,-.12),(.48,-.05),(.5,0),(.48,.05),(.28,.12),(-.35,.11)],0,.05,accent)
        b.box((0,0,.053),(.75,.035,.004),'ivory',0)
        b.prism([(-.3,0),(-.45,0),(-.35,.02)],.05,.14,'gold')
    elif f=='lifeguard':
        for x in [-.23,.23]:
            for y in [-.22,.22]:b.rod((x,y,0),(x,y,.46),.035,'wood')
        b.box((0,0,.47),(.64,.56,.05),'honey');b.box((0,0,.63),(.50,.43,.28),'coral')
        b.box((.253,0,.66),(.01,.21,.13),'glass',0)
        b.gable(.33,-.3,.3,.8,.98,'ivory')
        for z in [.1,.2,.3,.4]:b.rod((.25,-.30,z),(.5,-.30,z),.017,'cream')
        b.rod((.45,-.30,0),(.3,-.30,.46),.02,'wood')
        b.rod((.25,-.30,0),(.25,-.30,.46),.02,'wood')
    elif f in ['canoe','boat']:
        b.prism([(-.5,0),(-.34,-.13),(.32,-.14),(.5,0),(.32,.14),(-.34,.13)],.06,.24,accent,side='wood')
        b.box((0,0,.25),(.64,.16,.028),'navy')
        for x in [-.19,.19]:b.box((x,0,.28),(.065,.28,.035),'cream')
        if f=='canoe':
            for x in [-.19,.19]:b.rod((x,0,.25),(x,.34,.22),.018,'ivory')
            b.box((0,.36,.15),(.63,.07,.12),'gold')
        else:
            b.box((-.13,0,.38),(.27,.20,.25),'ivory');b.box((-.13,-.107,.41),(.17,.014,.12),'glass')
            b.rod((.09,0,.24),(.09,0,.72),.012,'wood')
            b.face([(.09,0,.7),(.09,0,.4),(.38,0,.4)],'white')
    elif f=='shell':
        b.blob((0,0,.09),(.25,.19,.09),'cream',2,9)
        for i in range(7):
            a=math.pi*i/6;b.rod((.14,0,.11),(-.12+math.cos(a)*.15,math.sin(a)*.15,.11),.012,accent,4)
    elif f=='crab':
        b.blob((0,0,.14),(.20,.15,.10),'coral',2,8)
        for y in [-1,1]:
            for x in [-.14,-.04,.07]:b.rod((x,y*.1,.13),(x-.05,y*.27,.02),.02,'rose',5)
            b.rod((.12,y*.1,.14),(.27,y*.24,.20),.02,'coral',5)
            b.blob((.27,y*.24,.22),(.065,.065,.08),'rose',2,6)
            b.rod((.14,y*.055,.18),(.20,y*.065,.27),.014,'ivory',5)
            b.blob((.20,y*.065,.28),(.025,.025,.025),'black',2,5)
    elif f=='sandcastle':
        b.box((0,0,.07),(.85,.72,.14),'cream')
        b.box((0,0,.23),(.45,.38,.24),'honey')
        for x in [-.28,.28]:
            for y in [-.23,.23]:
                b.cylinder((x,y,.24),.095,.40,'cream',8)
                b.cylinder((x,y,.46),.12,.045,'honey',8)
        b.rod((0,0,.3),(0,0,.65),.011,'wood')
        b.face([(0,0,.65),(.18,0,.58),(0,0,.50)],accent)
    elif f=='crate':
        b.box((0,0,.16),(.55,.43,.30),'wood')
        for x in [-.23,0,.23]:b.box((x,-.224,.16),(.045,.02,.29),'honey')
        for x in [-.17,0,.17]:
            for y in [-.1,.1]:b.blob((x,y,.33),(.075,.075,.08),'sun' if v else 'coral',2,6)
    elif f=='market':
        b.box((0,0,.25),(.72,.46,.48),'wood')
        for x in [-.34,.34]:
            for y in [-.22,.22]:b.rod((x,y,.4),(x,y,.88),.018,'ivory')
        for i in range(6):b.box((-.36+i*.144,0,.88),(.14,.60,.055),accent if i%2 else 'ivory')
        for x in [-.23,0,.23]:b.blob((x,0,.53),(.06,.06,.065),'gold',2,6)
    elif f=='planter':
        b.box((0,0,.16),(.8,.5,.32),'honey');b.box((0,0,.32),(.76,.46,.04),'wood')
        for x in [-.25,0,.25]:
            b.rod((x,0,.32),(x,0,.62),.012,'jade')
            b.blob((x,0,.53),(.10,.10,.14),'leaf',2,6)
            b.blob((x,0,.69),(.09,.09,.08),accent,2,7)
    elif f=='lava':
        b.blob((0,0,.25),(.42,.35,.28),'charcoal',2,7)
        b.blob((.23,.17,.16),(.18,.20,.18),'slate',2,6)
        b.blob((-.21,-.06,.30),(.21,.20,.25),'stone' if v else 'slate',2,6)
    elif f=='fence':
        for x in [-.45,0,.45]:b.box((x,0,.3),(.06,.065,.6),'ivory')
        for z in [.18,.43]:b.box((0,0,z),(1.0,.04,.07),'cream')
    elif f=='magnet':
        for y in [-.17,.17]:
            b.box((.1,y,.11),(.45,.13,.20),'rose')
            b.box((.32,y,.11),(.12,.13,.20),'ivory')
        b.box((-.19,0,.11),(.14,.46,.20),'rose')
    elif f=='turbo':
        b.prism([(-.08,-.1),(.19,-.1),(.03,.07),(.16,.07),(-.18,.34),(-.05,.12),(-.19,.12)],0,.14,'sun',side='coral')
    elif f=='star':
        points=[]
        for i in range(10):
            a=math.pi/2+i*math.pi/5;r=.35 if i%2==0 else .16;points.append((math.cos(a)*r,math.sin(a)*r))
        b.prism(points,0,.12,'gold',side='coral')

families=['umbrella','lounge','surfboard','lifeguard','canoe','shell','crab','sandcastle','crate','market','planter','lava','fence','boat','magnet','turbo','star']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
col=bpy.data.collections.new('Island coves, markets, gardens and power-ups');bpy.context.scene.collection.children.link(col)
mat=scope['create_vertex_material']();manifest=json.loads((ROOT/'public/models/manifest.json').read_text());objects=[]
for index,f in enumerate(families):
    type_id=54+index;names=[]
    for v in range(1 if type_id>=68 else 2):
        b=Sculpt(type_id*19+v);build(b,f,v);name=f'map_{type_id}_{v}'
        obj,tris,bounds=b.mesh(name,col);obj.data.materials.append(mat);objects.append(obj);names.append(name)
        manifest['models'][name]=dict(type=type_id,family=f,variant=v,triangles=tris,bounds=bounds,pivot='bottom center',supplemental=True)
    manifest['types'][str(type_id)]=dict(family=f,models=names,minScreenPixels=30)
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/island-variety.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
manifest['extraLibraries']=['/models/living-island.glb','/models/island-variety.glb']
(ROOT/'public/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for i,obj in enumerate(objects):obj.location=((i%8)*1.4,(i//8)*1.4,0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/toytown/island-variety.blend'))
print('MAP_MODELS',len(objects))
