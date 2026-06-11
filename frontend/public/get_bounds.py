from PIL import Image

img = Image.open('bibi_walk_transparent.png')
# Assuming 4 frames horizontally, frame width is img.width / 4
frame_width = img.width // 4
frame_height = img.height

# Get bounds of the first frame
frame_img = img.crop((0, 0, frame_width, frame_height))
bbox = frame_img.getbbox()

print(f"Frame size: {frame_width}x{frame_height}")
print(f"Bounding box (left, upper, right, lower): {bbox}")
print(f"Width: {bbox[2] - bbox[0]}, Height: {bbox[3] - bbox[1]}")
print(f"Offset X: {bbox[0]}, Offset Y: {bbox[1]}")
