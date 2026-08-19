from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
source = Image.open(ROOT / "icon.png").convert("RGBA")

if source.size != (512, 512):
    source = source.resize((512, 512), Image.Resampling.LANCZOS)

# The artwork was exported on an opaque white square. Windows icons need
# transparent corners so the rounded app tile does not appear inside a box.
mask_scale = 4
mask = Image.new("L", (512 * mask_scale, 512 * mask_scale), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    (0, 0, mask.width - 1, mask.height - 1),
    radius=106 * mask_scale,
    fill=255,
)
mask = mask.resize((512, 512), Image.Resampling.LANCZOS)
source.putalpha(mask)

source.save(
    ROOT / "icon.ico",
    format="ICO",
    sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)],
    bitmap_format="png",
)

tray = source.resize((32, 32), Image.Resampling.LANCZOS)
tray.save(ROOT / "icon-tray.png", format="PNG", optimize=True)

print(f"icon.ico: {(ROOT / 'icon.ico').stat().st_size} bytes")
print(f"icon-tray.png: {(ROOT / 'icon-tray.png').stat().st_size} bytes")

packed = Image.open(ROOT / "icon.ico")
print(f"packed sizes: {sorted(packed.ico.sizes())}")
print(f"source alpha range: {source.getchannel('A').getextrema()}")
