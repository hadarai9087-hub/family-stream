import os
from PIL import Image

avatars_dir = "public/avatars"
for filename in os.listdir(avatars_dir):
    if filename.endswith(".png") or filename.endswith(".jpg"):
        filepath = os.path.join(avatars_dir, filename)
        with Image.open(filepath) as im:
            im = im.convert("RGBA")
            # Square crop
            w, h = im.size
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 2
            im = im.crop((left, top, left + min_dim, top + min_dim))
            im = im.resize((200, 200), Image.Resampling.LANCZOS)
            # Save optimized
            im.save(filepath, "PNG", optimize=True)
            print(f"Optimized {filename}: {os.path.getsize(filepath)} bytes")

print("All avatars optimized to 200x200 squares!")
