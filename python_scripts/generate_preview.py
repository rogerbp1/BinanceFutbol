import sys
import base64
from PIL import Image
from io import BytesIO
import os

img = Image.open('bibi_cropped.png').convert("RGBA")
# extract first frame
frame = img.crop((0, 0, 256, 335))

# convert to base64
buffered = BytesIO()
frame.save(buffered, format="PNG")
img_str = base64.b64encode(buffered.getvalue()).decode()

# Write to an artifact
artifact_path = "/Users/rogerbeltran/.gemini/antigravity/brain/e26436ca-bbc4-4b4f-a7eb-effa78ed2aef/original_sprite_preview.md"

with open(artifact_path, "w") as f:
    f.write("# Original Sprite Preview\n\n")
    f.write(f"![First Frame](data:image/png;base64,{img_str})\n")

print(f"Artifact written to {artifact_path}")
