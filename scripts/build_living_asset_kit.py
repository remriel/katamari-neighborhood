"""Run with cloud Blender: blender -b --python scripts/build_living_asset_kit.py.

Supplement the released GLBs without rebuilding or changing existing geometry.
The editable library uses the original shared vertex-color sculpting helpers.
"""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
scope = {'__name__': 'asset_helpers', 'args': {'project_root': str(ROOT)}}
exec((ROOT / 'scripts/build_toytown_asset_kit.py').read_text(), scope)
Sculpt = scope['Sculpt']


def neighbor(b, variant):
    skin = [(.62, .34, .18), (.88, .62, .39), (.40, .22, .13), (.96, .77, .56)][variant]
    shirt = ['coral', 'sky', 'mint', 'lilac'][variant]
    hair = ['charcoal', 'wood', 'black', 'honey'][variant]
    # Face and toes point +X, like the existing vehicles and animals.
    for y in [-.105, .105]:
        b.box((.035, y, .055), (.25, .15, .10), 'ivory', .015)
        b.rod((0, y, .12), (0, y, .45), .065, 'navy', 6)
    b.box((0, 0, .62), (.25, .35, .34), shirt, .055)
    b.rod((0, -.21, .70), (.045, -.24, .42), .048, skin, 6)
    b.rod((0, .21, .70), (-.045, .24, .42), .048, skin, 6)
    b.blob((0, 0, .91), (.14, .14, .16), skin, 3, 8)
    b.blob((-.025, 0, 1.01), (.135, .143, .085), hair, 2, 8)
    for y in [-.063, .063]:
        b.blob((.125, y, .94), (.017, .017, .02), 'black', 2, 5)
    b.blob((.145, 0, .89), (.025, .025, .032), skin, 2, 6)
    # A few large floral shirt spots remain legible at the fixed game camera.
    for y in [-.085, .085]:
        b.blob((.133, y, .66), (.008, .025, .025), 'sun', 2, 5)
    if variant in [1, 3]:
        b.cylinder((0, 0, 1.055), .18, .035, 'cream', 10)
        b.cylinder((-.02, 0, 1.09), .12, .06, 'gold', 9)


def chicken(b, variant):
    color = ['ivory', 'honey', 'charcoal'][variant]
    b.blob((0, 0, .30), (.25, .17, .21), color, 3, 8)
    b.blob((.18, 0, .48), (.11, .105, .125), color, 3, 7)
    b.rod((-.17, 0, .35), (-.31, 0, .55), .065, color, 5)
    for y in [-.09, .09]:
        b.rod((0, y, .02), (0, y, .19), .018, 'gold', 5)
        b.rod((-.04, y, .02), (.10, y, .02), .012, 'gold', 5)
        b.blob((.22, y, .51), (.018, .013, .02), 'black', 2, 5)
    b.prism([(.24, -.04), (.34, 0), (.24, .04)], .44, .48, 'gold')
    for x in [.12, .19, .25]:
        b.blob((x, 0, .605), (.033, .025, .045), 'rose', 2, 5)
    b.blob((.245, 0, .39), (.033, .025, .045), 'rose', 2, 5)
    for y in [-.155, .155]:
        b.blob((-.025, y, .31), (.14, .03, .11), 'cream' if variant else 'white', 2, 6)


bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
collection = bpy.data.collections.new('Living island neighbors and chickens')
bpy.context.scene.collection.children.link(collection)
material = scope['create_vertex_material']()
manifest_path = ROOT / 'public/models/manifest.json'
manifest = json.loads(manifest_path.read_text())
# The guide's released mesh is retained under a dedicated key, leaving numeric
# IDs 52/53 available to append collectible families without renumbering props.
if 'guide' not in manifest['types']:
    manifest['types']['guide'] = manifest['types'].pop('52')
    for name in manifest['types']['guide']['models']:
        manifest['models'][name]['type'] = 'guide'
objects = []
for type_id, family, variants, build in [(52, 'neighbor', 4, neighbor), (53, 'chicken', 3, chicken)]:
    names = []
    for variant in range(variants):
        sculpt = Sculpt(type_id * 101 + variant)
        build(sculpt, variant)
        name = f'living_{type_id}_{variant}'
        obj, triangles, bounds = sculpt.mesh(name, collection)
        obj.data.materials.append(material)
        objects.append(obj)
        names.append(name)
        manifest['models'][name] = dict(type=type_id, family=family, variant=variant,
            triangles=triangles, bounds=bounds, pivot='bottom center', supplemental=True)
    manifest['types'][str(type_id)] = dict(family=family, models=names, minScreenPixels=30)
for obj in bpy.context.selected_objects:
    obj.select_set(False)
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'public/models/living-island.glb'),
    export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
manifest['extraLibraries'] = ['/models/living-island.glb']
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
for i, obj in enumerate(objects):
    obj.location = ((i % 4) * 1.5, (i // 4) * 1.5, 0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/toytown/living-island-library.blend'))
print('LIVING_ASSETS', json.dumps({'models': len(objects), 'triangles': sum(
    meta['triangles'] for meta in manifest['models'].values() if meta.get('supplemental'))}))
