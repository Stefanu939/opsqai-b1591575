import subprocess, shutil, io, os
from PIL import Image
RSVG = shutil.which("rsvg-convert") or "/nix/store/fd4yyy6gn26378dadwcj0sf1y7x5n08a-librsvg-2.61.3/bin/rsvg-convert"
SRC="public/brand/sovereign-mark.svg"
def render(w,h,src=SRC):
    return Image.open(io.BytesIO(subprocess.run([RSVG,"-w",str(w),"-h",str(h),"-f","png",src],check=True,capture_output=True).stdout)).convert("RGBA")
sizes=[16,24,32,48,64,128,256]
imgs=[render(s,s) for s in sizes]
imgs[-1].save("opsqai-windows/installer/nsis/assets/opsqai.ico", format="ICO", sizes=[(s,s) for s in sizes])
# web
render(32,32).save("public/icons/icon-32.png")
render(192,192).save("public/icons/icon-192.png")
render(512,512).save("public/icons/icon-512.png")
render(180,180).save("public/icons/apple-touch-icon.png")
# maskable: mark inset ~80% on dark ground
for s in (192,512):
    base=Image.new("RGBA",(s,s),(10,10,10,255))
    inner=render(int(s*0.8),int(s*0.8))
    base.paste(inner,(int(s*0.1),int(s*0.1)),inner)
    base.save(f"public/icons/icon-{s}-maskable.png")
render(256,256).save("public/favicon.png")
render(48,48).save("public/favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48)])
shutil.copyfile(SRC,"public/favicon.svg")
print("ok")
