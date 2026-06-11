from PIL import Image

def crop_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        # bbox is (left, upper, right, lower)
        # We want to keep the full width (1024) but crop the height to exactly tightly fit the character
        # Actually, let's just make the height a multiple of something, or just tightly crop the height
        # Wait, if we tightly crop the height, we need to know the new height for Phaser
        crop_box = (0, bbox[1], img.width, bbox[3])
        cropped_img = img.crop(crop_box)
        cropped_img.save(output_path, "PNG")
        print(f"Éxito: {output_path} recortado. Nuevo tamaño: {cropped_img.width}x{cropped_img.height}")
    else:
        print("La imagen es completamente transparente.")

if __name__ == "__main__":
    crop_transparent("bibi_walk_transparent.png", "bibi_cropped.png")
