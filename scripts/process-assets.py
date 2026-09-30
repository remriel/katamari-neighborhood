"""Extract complete alpha-connected sprites; never assume generated grid cuts."""
from pathlib import Path
from PIL import Image, ImageFilter
from array import array
from collections import deque
import json
import shutil
import sys

root = Path(__file__).resolve().parents[1]
output = root / "public" / "assets"
source = root / "art"
output.mkdir(parents=True, exist_ok=True)
source.mkdir(parents=True, exist_ok=True)
atlas_path = Path(sys.argv[1]) if len(sys.argv) > 1 else source / "props-source.png"

atlas = Image.open(atlas_path).convert("RGBA")
width, height = atlas.size
alpha = atlas.getchannel("A").tobytes()
labels = array("I", [0]) * (width * height)
components = []
for position, value in enumerate(alpha):
    if value <= 16 or labels[position]:
        continue
    label = len(components) + 1
    queue = deque([position])
    labels[position] = label
    area = 0
    xmin = xmax = position % width
    ymin = ymax = position // width
    while queue:
        current = queue.popleft()
        x, y = current % width, current // width
        area += 1
        xmin, xmax, ymin, ymax = min(xmin, x), max(xmax, x), min(ymin, y), max(ymax, y)
        for yy in range(max(0, y-1), min(height, y+2)):
            for xx in range(max(0, x-1), min(width, x+2)):
                neighbor = yy * width + xx
                if alpha[neighbor] > 16 and not labels[neighbor]:
                    labels[neighbor] = label
                    queue.append(neighbor)
    components.append({"label": label, "area": area, "bounds": [xmin, ymin, xmax+1, ymax+1]})

objects = sorted(components, key=lambda c: c["area"], reverse=True)[:20]
if len(objects) != 20 or min(c["area"] for c in objects) < 1200:
    raise RuntimeError("The atlas must contain 20 separate complete sprite silhouettes.")
objects.sort(key=lambda c: (round((c["bounds"][1]+c["bounds"][3])/2 / (height/4)-.5),
                            (c["bounds"][0]+c["bounds"][2])/2))
owner = {obj["label"]: index for index, obj in enumerate(objects)}
# Preserve detached little details belonging to each silhouette, without taking
# unrelated art from adjacent sprites. Large components determine the ownership.
for component in components:
    if component["label"] in owner:
        continue
    x0, y0, x1, y1 = component["bounds"]
    def distance(obj):
        a, b, c, d = obj["bounds"]
        return max(0, a-x1, x0-c)**2 + max(0, b-y1, y0-d)**2
    nearest = min(range(20), key=lambda i: distance(objects[i]))
    if distance(objects[nearest]) <= 14**2:
        owner[component["label"]] = nearest

masks = [bytearray(width*height) for _ in range(20)]
for position, label in enumerate(labels):
    if label in owner:
        masks[owner[label]][position] = 255
metadata = []
for index, raw in enumerate(masks):
    mask = Image.frombytes("L", (width, height), bytes(raw)).filter(ImageFilter.MaxFilter(3))
    bounds = mask.getbbox()
    cutout = atlas.crop(bounds)
    cutout.putalpha(Image.frombytes("L", atlas.size, alpha).crop(bounds))
    # Keep the source alpha only within this object's connected ownership mask.
    from PIL import ImageChops
    cutout.putalpha(ImageChops.multiply(cutout.getchannel("A"), mask.crop(bounds)))
    cell = Image.new("RGBA", (cutout.width+16, cutout.height+16))
    cell.paste(cutout, (8, 8))
    cell.save(output / f"prop-{index}.webp", quality=95, method=6, exact=True)
    metadata.append({"art": index, "sourceBounds": bounds, "width": cell.width, "height": cell.height})
    if index == 19:
        icon = cell.copy()
        icon.thumbnail((96, 96), Image.Resampling.LANCZOS)
        icon.save(output / "ball-icon.png")

(output / "props-metadata.json").write_text(json.dumps(metadata, indent=2))
# Native-resolution generated terrain is converted without reducing its dimensions.
if len(sys.argv) >= 4:
    for name, path in [("grass", Path(sys.argv[2])), ("paving", Path(sys.argv[3]))]:
        shutil.copyfile(path, source / f"{name}-source.png")
        image = Image.open(path).convert("RGB")
        image.save(output / f"{name}.webp", quality=96, method=6)
        print(f"Native terrain: {name} {image.width} x {image.height}")
print("Extracted 20 complete sprites with transparent sampling gutters.")
