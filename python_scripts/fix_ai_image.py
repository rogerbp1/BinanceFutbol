import sys
from PIL import Image

# The AI image path
input_path = '/Users/rogerbeltran/.gemini/antigravity/brain/e26436ca-bbc4-4b4f-a7eb-effa78ed2aef/bibi_better_shirt_1780680700052.png'
img = Image.open(input_path).convert("RGBA")
print(f"Original AI Image size: {img.size}")

# We need to resize it back to 1024 x 335 to match the game's expectations,
# OR we need to see if it's already a good aspect ratio.
# But since it's a DALL-E output, it might be 1024x1024.
if img.size != (1024, 335):
    # Wait, the sprites might be centered or scaled differently.
    # Let's crop it to the top 335 pixels or resize it?
    # Let's check the bounding box of non-white pixels first to see where the sprites are.
    pixels = img.load()
    min_y, max_y = img.size[1], 0
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b, a = pixels[x, y]
            # assume white background
            if r < 240 or g < 240 or b < 240:
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    print(f"Content Y range: {min_y} to {max_y}")
    content_h = max_y - min_y
    
    # Actually, we should probably resize so that the width is 1024.
    # If the image is 1024x1024, width is already 1024.
    # We can just crop the Y to match 335, or resize the bounding box.
    pass

