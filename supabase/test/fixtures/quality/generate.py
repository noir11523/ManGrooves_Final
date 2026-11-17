"""Regenerate quality regression fixtures with Pillow; no network or private photos."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

here = Path(__file__).resolve().parent
root = here.parents[3]
source = Image.open(root / 'public/assets/img/observations/v1-green-leaf.jpg').convert('RGB')
source.save(here / 'clear.jpg', quality=95)
source.save(here / 'clear.png')
source.save(here / 'clear.webp', quality=95)
source.filter(ImageFilter.GaussianBlur(4)).save(here / 'blur.jpg', quality=95)
source.filter(ImageFilter.GaussianBlur(10)).save(here / 'out-of-focus.jpg', quality=95)
ImageEnhance.Brightness(source).enhance(.08).save(here / 'dark.jpg', quality=95)
Image.new('RGB', source.size, 'white').save(here / 'bright.jpg', quality=95)
ImageEnhance.Contrast(source).enhance(.07).save(here / 'low-contrast.jpg', quality=95)
source.resize((640, 551)).save(here / 'low-resolution.jpg', quality=95)
close = source.filter(ImageFilter.GaussianBlur(12))
box = (330, 263, 630, 563)
close.paste(source.crop(box), box)
close.save(here / 'close-up.jpg', quality=95)

# High-contrast light trails over an out-of-focus scene (synthetic regression).
import math
from PIL import ImageDraw
motion = source.filter(ImageFilter.GaussianBlur(14))
draw = ImageDraw.Draw(motion)
for y in range(80, motion.height-90, 170):
    for x in range(50, motion.width-90, 160):
        draw.line([(x+int(12*math.sin(t/25)), y+t) for t in range(110)], fill=(255,252,245), width=5)
motion.save(here / 'motion-trails.jpg', quality=95)
