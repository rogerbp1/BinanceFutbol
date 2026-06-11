import sys
from PIL import Image

img = Image.open('bibi_cropped.png').convert("RGBA")
width, height = img.size
fw = 256
fh = 335
frames = width // fw

# Let's do a flood fill on the first frame to see how many pixels it fills
# We'll pick a point roughly in the center of the bottom half

def get_bbox(img_data, start_x, end_x, fh):
    min_x, max_x = end_x, start_x
    min_y, max_y = fh, 0
    for y in range(fh):
        for x in range(start_x, end_x):
            _, _, _, a = img_data[x, y]
            if a > 50:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    return min_x, max_x, min_y, max_y

pixels = img.load()

# Test first frame
i = 0
start_x = i * fw
end_x = start_x + fw
min_x, max_x, min_y, max_y = get_bbox(pixels, start_x, end_x, fh)

char_w = max_x - min_x
char_h = max_y - min_y

center_x = min_x + int(char_w * 0.5)
# Torso is usually slightly below the exact middle of the whole character
center_y = min_y + int(char_h * 0.6)

# Let's count how many yellow pixels we would fill
def is_yellow(r, g, b, a):
    return a > 100 and r > 150 and g > 100 and b < 100

yellow_count = 0
for y in range(min_y, max_y):
    for x in range(min_x, max_x):
        r,g,b,a = pixels[x, y]
        if is_yellow(r,g,b,a):
            yellow_count += 1

print(f"Total yellow pixels in frame 0: {yellow_count}")

# flood fill from center
visited = set()
q = [(center_x, center_y)]
filled_count = 0

while q:
    cx, cy = q.pop(0)
    if (cx, cy) in visited:
        continue
    visited.add((cx, cy))
    
    if cx < start_x or cx >= end_x or cy < 0 or cy >= fh:
        continue
        
    r,g,b,a = pixels[cx, cy]
    if is_yellow(r, g, b, a):
        filled_count += 1
        q.append((cx+1, cy))
        q.append((cx-1, cy))
        q.append((cx, cy+1))
        q.append((cx, cy-1))

print(f"Flood fill from ({center_x}, {center_y}) filled {filled_count} yellow pixels")

