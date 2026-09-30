"""Convert generated artwork to shipping WebP textures and cut the 5x4 atlas."""
from pathlib import Path
from PIL import Image
import shutil
import sys

root = Path(__file__).resolve().parents[1]
output = root / "public" / "assets"
source = root / "art"
output.mkdir(parents=True, exist_ok=True)
source.mkdir(parents=True, exist_ok=True)
atlas_path, ground_path, ball_path = map(Path, sys.argv[1:4])
for name, path in [("props", atlas_path), ("ground", ground_path), ("ball", ball_path)]:
    shutil.copyfile(path, source / f"{name}-source.png")

atlas = Image.open(atlas_path).convert("RGBA")
width, height = atlas.size
for index in range(20):
    column, row = index % 5, index // 5
    cell = atlas.crop((round(column * width / 5), round(row * height / 4),
                       round((column + 1) * width / 5), round((row + 1) * height / 4)))
    bounds = cell.getchannel("A").point(lambda value: 255 if value > 12 else 0).getbbox()
    if bounds:
        cell = cell.crop(bounds)
    cell.thumbnail((384, 384), Image.Resampling.LANCZOS)
    cell.save(output / f"prop-{index}.webp", quality=92, method=6)
    if index == 19:
        icon = cell.copy()
        icon.thumbnail((96, 96), Image.Resampling.LANCZOS)
        icon.save(output / "ball-icon.png")

for name, path, size in [("ground", ground_path, (1024, 1024)), ("ball", ball_path, (1024, 512))]:
    image = Image.open(path).convert("RGB")
    image = image.resize(size, Image.Resampling.LANCZOS)
    image.save(output / f"{name}.webp", quality=91, method=6)
print("Prepared 20 illustrated props, the map texture, rolling ball texture, and favicon.")
