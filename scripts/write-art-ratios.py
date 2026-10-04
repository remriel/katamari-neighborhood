from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
path=root/'public/models/manifest.json'
manifest=json.loads(path.read_text(encoding='utf-8-sig'))
manifest['artRatios']=[]
for i in range(54):
    with Image.open(root/f'public/assets/prop-{i}.webp') as image:manifest['artRatios'].append(image.width/image.height)
path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Preserved all 54 original attachment aspect ratios without sprite downloads.')
