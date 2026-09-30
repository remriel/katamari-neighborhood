from pathlib import Path
from PIL import Image, ImageChops
from array import array
from collections import deque
import json, shutil

root=Path(__file__).resolve().parents[2]
sources=json.loads((root/'scripts/eon/source-inputs.json').read_text())
manifest={'version':1,'eras':{},'models':{}}
for source in sources:
    era=source['id']; output=root/'public/eon'/era; output.mkdir(parents=True,exist_ok=True)
    raw=root/'art/eon'/era; raw.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source['actors'],raw/'actors.png'); shutil.copyfile(source['background'],raw/'background.png')
    (raw/'PROMPTS.md').write_text('# '+era+' original artwork\n\nBuilt-in image generation.\n\n## Objects\n\n'+source['actorPrompt']+'\n\n## Environment\n\n'+source['backgroundPrompt']+'\n',encoding='utf8')
    atlas=Image.open(raw/'actors.png').convert('RGBA'); width,height=atlas.size; alpha=atlas.getchannel('A').tobytes()
    labels=array('I',[0])*(width*height); components=[]
    for pos,value in enumerate(alpha):
        if value<=16 or labels[pos]:continue
        label=len(components)+1; queue=deque([pos]); labels[pos]=label; area=0; xmin=xmax=pos%width; ymin=ymax=pos//width
        while queue:
            point=queue.popleft(); x,y=point%width,point//width; area+=1
            xmin,xmax,ymin,ymax=min(xmin,x),max(xmax,x),min(ymin,y),max(ymax,y)
            for yy in range(max(0,y-1),min(height,y+2)):
                for xx in range(max(0,x-1),min(width,x+2)):
                    neighbor=yy*width+xx
                    if alpha[neighbor]>16 and not labels[neighbor]:labels[neighbor]=label;queue.append(neighbor)
        components.append({'label':label,'area':area,'bounds':[xmin,ymin,xmax+1,ymax+1]})
    mains={}
    for c in components:
        x0,y0,x1,y1=c['bounds']; col=max(0,min(2,int((x0+x1)/2/(width/3))));row=max(0,min(2,int((y0+y1)/2/(height/3))));slot=row*3+col
        if slot not in mains or c['area']>mains[slot]['area']:mains[slot]=c
    if len(mains)!=9:
        subjects=sorted(components,key=lambda c:c['area'],reverse=True)[:9]
        if len(subjects)!=9:raise RuntimeError(f'{era}: missing complete subjects')
        subjects.sort(key=lambda c:(c['bounds'][1]+c['bounds'][3])/2)
        mains={}
        for row in range(3):
            group=sorted(subjects[row*3:row*3+3],key=lambda c:c['bounds'][0]+c['bounds'][2])
            for col,c in enumerate(group):mains[row*3+col]=c
    objects=[mains[i]for i in range(9)];owner={c['label']:i for i,c in enumerate(objects)}
    for c in components:
        if c['label']in owner:continue
        x0,y0,x1,y1=c['bounds']
        def distance(main):
            a,b,cc,d=main['bounds'];return max(0,a-x1,x0-cc)**2+max(0,b-y1,y0-d)**2
        index=min(range(9),key=lambda i:distance(objects[i]))
        if distance(objects[index])<=45**2:owner[c['label']]=index
    masks=[bytearray(width*height)for _ in range(9)]
    for pos,label in enumerate(labels):
        if label in owner:masks[owner[label]][pos]=255
    for i,maskBytes in enumerate(masks):
        mask=Image.frombytes('L',(width,height),bytes(maskBytes));bounds=mask.getbbox()
        if not bounds:raise RuntimeError(f'{era}: missing complete subject {i}')
        cut=atlas.crop(bounds);cut.putalpha(ImageChops.multiply(cut.getchannel('A'),mask.crop(bounds)))
        image=Image.new('RGBA',(cut.width+16,cut.height+16));image.paste(cut,(8,8));image.save(output/f'{i}.png');image.save(output/f'{i}.webp',quality=96,method=6,exact=True)
        manifest['models'][f'{era}:{i}']={'image':f'/eon/{era}/{i}.webp','glb':f'/eon/{era}/{i}.glb','ratio':image.width/image.height,'sourceBounds':bounds}
    background=Image.open(raw/'background.png').convert('RGB');background.save(output/'ground.webp',quality=95,method=6)
    manifest['eras'][era]={'ground':f'/eon/{era}/ground.webp','resolution':list(background.size),'count':9}
    print(f'{era}: 9 complete objects and native {background.width}x{background.height} terrain',flush=True)
(root/'public/eon/manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
