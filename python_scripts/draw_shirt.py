import sys
from PIL import Image, ImageDraw

img = Image.open('bibi_cropped.png').convert("RGBA")
width, height = img.size

# frame size
fw = 256
fh = 335
frames = width // fw

pixels = img.load()

def is_yellow(r, g, b, a):
    # original color is around (243, 191, 30)
    return a > 100 and r > 180 and g > 130 and b < 100

def draw_binance_logo(img, center_x, center_y, size=30):
    draw = ImageDraw.Draw(img)
    yellow = (243, 191, 30, 255)
    black = (30, 30, 30, 255)
    
    # Coordinates for the main diamond
    half = size // 2
    q = size // 4
    
    # Main outer diamond shape
    draw.polygon([
        (center_x, center_y - half),
        (center_x + half, center_y),
        (center_x, center_y + half),
        (center_x - half, center_y)
    ], fill=yellow)
    
    # Inner black cutouts (to make it look like binance logo)
    # The binance logo has a small yellow diamond in the center, 
    # and L-shaped corners, but a simplified version is a yellow diamond 
    # with a black diamond inside, and a smaller yellow diamond inside that.
    
    draw.polygon([
        (center_x, center_y - q),
        (center_x + q, center_y),
        (center_x, center_y + q),
        (center_x - q, center_y)
    ], fill=black)
    
    # smallest yellow diamond
    sq = size // 8
    draw.polygon([
        (center_x, center_y - sq),
        (center_x + sq, center_y),
        (center_x, center_y + sq),
        (center_x - sq, center_y)
    ], fill=yellow)

for i in range(frames):
    min_x, max_x = fw, 0
    min_y, max_y = fh, 0
    
    for y in range(fh):
        for x in range(fw):
            px = x + i * fw
            r, g, b, a = pixels[px, y]
            if a > 50:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    if max_x < min_x:
        continue
        
    char_w = max_x - min_x
    char_h = max_y - min_y
    
    shirt_top = min_y + int(char_h * 0.45)
    shirt_bottom = min_y + int(char_h * 0.85)
    
    for y in range(shirt_top, shirt_bottom):
        for x in range(min_x, max_x + 1):
            px = x + i * fw
            r, g, b, a = pixels[px, y]
            if is_yellow(r, g, b, a):
                lum = (r + g + b) / (243 + 191 + 30)
                base = 40
                new_v = min(255, int(base * lum))
                pixels[px, y] = (new_v, new_v, new_v, a)
                
    center_x = min_x + char_w // 2 + i * fw
    center_y = (shirt_top + shirt_bottom) // 2
    
    draw_binance_logo(img, center_x, center_y, size=40)

img.save('bibi_black_shirt.png')
print("Created bibi_black_shirt.png successfully!")
