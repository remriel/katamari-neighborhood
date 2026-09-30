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
expansion = "--sprite-set" in sys.argv
start, columns, rows = (map(int, sys.argv[3:6]) if expansion else (0, 5, 4))
count = columns * rows

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

if expansion:
    # One main silhouette per requested cell, then attach its detached details.
    # This handles multi-part subjects such as sushi and wheel cabins without
    # mistaking a detached part for a different complete object.
    mains = {}
    for component in components:
        x0, y0, x1, y1 = component["bounds"]
        column = max(0, min(columns-1, int((x0+x1)/2 / (width/columns))))
        row = max(0, min(rows-1, int((y0+y1)/2 / (height/rows))))
        slot = row * columns + column
        if slot not in mains or component["area"] > mains[slot]["area"]:
            mains[slot] = component
    if len(mains) != count:
        raise RuntimeError(f"Expected {count} complete subjects, found {len(mains)}.")
    objects = [mains[index] for index in range(count)]
else:
    objects = sorted(components, key=lambda c: c["area"], reverse=True)[:count]
if len(objects) != count or min(c["area"] for c in objects) < 500:
    raise RuntimeError(f"The atlas must contain {count} separate complete sprite silhouettes.")
objects.sort(key=lambda c: (round((c["bounds"][1]+c["bounds"][3])/2 / (height/rows)-.5),
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
    nearest = min(range(count), key=lambda i: distance(objects[i]))
    if distance(objects[nearest]) <= (28 if expansion else 14)**2:
        owner[component["label"]] = nearest

masks = [bytearray(width*height) for _ in range(count)]
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
    art_index = start + index
    cell.save(output / f"prop-{art_index}.webp", quality=95, method=6, exact=True)
    metadata.append({"art": art_index, "sourceBounds": bounds, "width": cell.width, "height": cell.height})
    if art_index == 19:
        icon = cell.copy()
        icon.thumbnail((96, 96), Image.Resampling.LANCZOS)
        icon.save(output / "ball-icon.png")

(output / (f"props-set-{start}.json" if expansion else "props-metadata.json")).write_text(json.dumps(metadata, indent=2))
# Native-resolution generated terrain is converted without reducing its dimensions.
if len(sys.argv) >= 4 and not expansion:
    for name, path in [("grass", Path(sys.argv[2])), ("paving", Path(sys.argv[3]))]:
        shutil.copyfile(path, source / f"{name}-source.png")
        image = Image.open(path).convert("RGB")
        image.save(output / f"{name}.webp", quality=96, method=6)
        print(f"Native terrain: {name} {image.width} x {image.height}")
print(f"Extracted {count} complete sprites, art IDs {start} through {start+count-1}, with transparent sampling gutters.")
