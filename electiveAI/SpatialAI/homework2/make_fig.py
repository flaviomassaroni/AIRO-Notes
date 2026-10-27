import json
from PIL import Image, ImageDraw

views = ["eval_IMG_20261027_090538.jpg", "eval_IMG_20261027_090604.jpg"]
cols = [("Ground truth", "gt", "baseline"),
        ("36 train", "pred", "baseline"),
        ("27 train", "pred", "q3"),
        ("18 train", "pred", "half")]
W, H = 400, 531
M = {r: json.load(open(f"metrics_{r}.json"))["test"] for r in ("baseline", "q3", "half")}

canvas = Image.new("RGB", (W * len(cols), (H + 30) * len(views)), "white")
d = ImageDraw.Draw(canvas)
for r, v in enumerate(views):
    for c, (label, kind, run) in enumerate(cols):
        im = Image.open(f"renders/{run}/{kind}_{v}.png").convert("RGB").resize((W, H))
        x, y = c * W, r * (H + 30)
        canvas.paste(im, (x, y + 30))
        txt = label if kind == "gt" else f"{label}: {M[run][v]:.2f} dB"
        d.text((x + 8, y + 8), txt, fill="black")
canvas.save("fig_views.png")
