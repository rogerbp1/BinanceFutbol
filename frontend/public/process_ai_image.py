import sys
from PIL import Image

input_path = '/Users/rogerbeltran/.gemini/antigravity/brain/e26436ca-bbc4-4b4f-a7eb-effa78ed2aef/bibi_better_shirt_1780680700052.png'
img = Image.open(input_path).convert("RGBA")
pixels = img.load()

# Find Y bounding box
min_y, max_y = img.size[1], 0
for y in range(img.size[1]):
    for x in range(img.size[0]):
        r, g, b, a = pixels[x, y]
        # assume background is white or almost white
        if r < 240 or g < 240 or b < 240:
            if y < min_y: min_y = y
            if y > max_y: max_y = y

# Add a small margin
min_y = max(0, min_y - 10)
max_y = min(img.size[1], max_y + 10)

# Crop
cropped = img.crop((0, min_y, img.size[0], max_y))

# Make white transparent
new_pixels = cropped.load()
for y in range(cropped.size[1]):
    for x in range(cropped.size[0]):
        r, g, b, a = new_pixels[x, y]
        # Make white and near-white transparent
        if r > 240 and g > 240 and b > 240:
            new_pixels[x, y] = (255, 255, 255, 0)

cropped.save('bibi_ai_shirt.png')
print(f"Created bibi_ai_shirt.png with size {cropped.size}")
