import sys
from PIL import Image

img = Image.open('bibi_walk_transparent.png').convert("RGBA")
width, height = img.size

# Let's assume 4x4 grid first
cols = 4
rows = 4
cell_w = width // cols
cell_h = height // rows

print(f"Image size: {width}x{height}, Cell size: {cell_w}x{cell_h}")

for r in range(rows):
    for c in range(cols):
        left = c * cell_w
        top = r * cell_h
        right = left + cell_w
        bottom = top + cell_h
        
        cell = img.crop((left, top, right, bottom))
        bbox = cell.getbbox()
        if bbox:
            print(f"Cell ({r},{c}) has bbox: {bbox}")
        else:
            print(f"Cell ({r},{c}) is empty")

