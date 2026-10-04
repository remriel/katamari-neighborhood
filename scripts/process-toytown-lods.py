"""Trim transparent Blender renders and encode the distant pickup billboards."""
from pathlib import Path
from PIL import Image, ImageOps
import json
root=Path(__file__).resolve().parents[1]
outputs=[]
for source in sorted((root/"art/toytown/billboards").glob("prop-*.png")):
    image=Image.open(source).convert("RGBA")
    bounds=image.getchannel("A").getbbox()
    if not bounds:raise RuntimeError("Empty Blender billboard: "+source.name)
    image=ImageOps.expand(image.crop(bounds),border=3,fill=(0,0,0,0))
    destination=root/"public/assets"/(source.stem+".webp")
    image.save(destination,"WEBP",quality=94,method=6)
    outputs.append({"art":source.stem,"width":image.width,"height":image.height,"bytes":destination.stat().st_size})
if len(outputs)!=10:raise RuntimeError("Expected ten new billboard families, got "+str(len(outputs)))
print(json.dumps(outputs))
