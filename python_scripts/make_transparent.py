import sys
from PIL import Image

def make_transparent(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Si el pixel es muy cercano al blanco, lo hacemos transparente
            if item[0] > 230 and item[1] > 230 and item[2] > 230:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Éxito: {output_path} creado con fondo transparente.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_transparent("cameraman.png", "cameraman_transparent.png")
