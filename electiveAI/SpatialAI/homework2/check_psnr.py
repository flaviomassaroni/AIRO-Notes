import sys, glob
import numpy as np
from PIL import Image

name = sys.argv[1]
for p in sorted(glob.glob(f"renders/{name}/pred_*.png")):
    g = p.replace("pred_", "gt_")
    a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float64) / 255
    b = np.asarray(Image.open(g).convert("RGB"), dtype=np.float64) / 255
    mse = ((a - b) ** 2).mean()
    print(p.split("pred_")[1], f"{10 * np.log10(1 / mse):.2f} dB")