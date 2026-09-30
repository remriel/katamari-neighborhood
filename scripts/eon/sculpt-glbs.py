"""Author textured sculpted silhouette meshes from original generated diorama art."""
import bpy, math, json, struct
from pathlib import Path

root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'public/eon/manifest.json').read_text())

def alpha_mask_glb(path):
    data=path.read_bytes(); length,kind=struct.unpack_from('<II',data,12); doc=json.loads(data[20:20+length])
    for material in doc.get('materials',[]):material['alphaMode']='MASK';material['alphaCutoff']=.22;material['doubleSided']=True
    chunk=json.dumps(doc,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4)
    tail=data[20+length:];payload=struct.pack('<II',len(chunk),0x4e4f534a)+chunk+tail
    path.write_bytes(struct.pack('<III',0x46546c67,2,12+len(payload))+payload)

for era in manifest['eras']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for index in range(9):
        filepath=root/'public/eon'/era/f'{index}.png';image=bpy.data.images.load(str(filepath));w,h=image.size;pixels=list(image.pixels);ratio=w/h
        nx=48;nz=max(36,round(48/ratio));depth=.42 if era in ['organisms','villages','civilizations'] else .66
        def opacity(u,v):return pixels[(min(h-1,round(v*(h-1)))*w+min(w-1,round(u*(w-1))))*4+3]
        verts=[];uv=[]
        for side in [-1,1]:
            for z in range(nz+1):
                for x in range(nx+1):
                    u=x/nx;v=z/nz;bulge=math.sqrt(max(.04,1-((u-.5)*1.8)**2-((v-.5)*1.8)**2))
                    verts.append(((u-.5)*ratio,side*depth*bulge*.5,v));uv.append((u,v))
        count=(nx+1)*(nz+1);faces=[];active=set()
        for z in range(nz):
            for x in range(nx):
                if opacity((x+.5)/nx,(z+.5)/nz)<.08:continue
                active.add((x,z));a=z*(nx+1)+x;b=a+1;c=b+nx+1;d=a+nx+1
                faces.extend([(a,b,c,d),(d+count,c+count,b+count,a+count)])
        for x,z in active:
            a=z*(nx+1)+x;b=a+1;c=b+nx+1;d=a+nx+1
            for neighbor,p,q in [((x,z-1),b,a),((x+1,z),c,b),((x,z+1),d,c),((x-1,z),a,d)]:
                if neighbor not in active:faces.append((p,q,q+count,p+count))
        mesh=bpy.data.meshes.new(f'{era}_{index}_sculpt');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(f'{era}:{index}',mesh);bpy.context.collection.objects.link(obj);layer=mesh.uv_layers.new(name='Artwork')
        for polygon in mesh.polygons:
            polygon.use_smooth=True
            for loop_index in polygon.loop_indices:layer.data[loop_index].uv=uv[mesh.loops[loop_index].vertex_index]
        material=bpy.data.materials.new(f'{era}_{index}_paint');material.use_nodes=True
        shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.82;shader.inputs['Metallic'].default_value=0
        texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image;material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Alpha'],shader.inputs['Alpha']);obj.data.materials.append(material)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        output=root/'public/eon'/era/f'{index}.glb'
        bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True,export_image_format='AUTO',export_cameras=False,export_lights=False)
        alpha_mask_glb(output)
        manifest['models'][f'{era}:{index}'].update({'vertices':len(verts),'faces':len(faces),'depth':depth,'height':1,'pivot':'base','authored':'sculpted textured silhouette; original ImageGen artwork'})
        obj.location.x=index*2
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/eon'/era/'sculpted-assets.blend'))
    print('Authored GLB set:',era,flush=True)
(root/'public/eon/manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
