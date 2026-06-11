import sys
from PIL import Image
from collections import Counter

img = Image.open('bibi_walk_transparent.png').convert("RGBA")
print(f"Size: {img.size}")

# Get colors, excluding mostly transparent
colors = img.getcolors(maxcolors=1000000)
colors = [c for c in colors if c[1][3] > 128]
colors.sort(reverse=True, key=lambda x: x[0])
print("Top 10 opaque colors:")
for count, color in colors[:10]:
    print(f"Color: {color}, Count: {count}")

