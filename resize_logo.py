from PIL import Image
import os
import sys

# Windows path from artifact
source_path = r"C:\Users\joshlin.DESKTOP-UPQ841Q\.gemini\antigravity\brain\8f7b797f-942a-4997-a449-2a7cc6bbb659\logo_option_1_1772597356870.png"
# Convert to WSL path
if source_path.startswith("C:\\") and sys.platform != "win32":
    source_path = "/mnt/c/" + source_path[3:].replace("\\", "/")

def resize_image(input_path, output_dir):
    try:
        img = Image.open(input_path)
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Sizes required for Chrome extension
        sizes = [16, 48, 128]
        
        for size in sizes:
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            output_path = os.path.join(output_dir, f"icon{size}.png")
            resized_img.save(output_path, "PNG")
            print(f"Generated {output_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    output_directory = "public/icons"
    resize_image(source_path, output_directory)
