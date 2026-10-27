import json, os, sys
from pathlib import Path
import pycolmap

name, frac = sys.argv[1], float(sys.argv[2])   # es. baseline 1  |  half 0.5  |  q3 0.75
split = json.load(open("split.json"))
test, train = split["test"], split["train"]

if frac == 0.5:
    train = train[::2]
elif frac == 0.75:
    train = [n for i, n in enumerate(train) if i % 4 != 3]
elif frac != 1.0:
    sys.exit("frac supportate: 1, 0.75, 0.5")

rename = {n: f"train_{n}" for n in train} | {n: f"eval_{n}" for n in test}

out = Path("datasets") / name
(out / "images").mkdir(parents=True, exist_ok=True)
(out / "sparse/0").mkdir(parents=True, exist_ok=True)
for old, new in rename.items():
    dst = out / "images" / new
    if not dst.exists():
        os.symlink((Path("images") / old).resolve(), dst)

# modello COLMAP in testo, poi filtro e rinomina delle immagini
tmp = Path("tmp_txt"); tmp.mkdir(exist_ok=True)
pycolmap.Reconstruction("sparse/0").write_text(str(tmp))
lines = [l for l in (tmp / "images.txt").read_text().splitlines() if not l.startswith("#")]
kept = []
for i in range(0, len(lines) - 1, 2):
    f = lines[i].split()
    if f[-1] in rename:
        f[-1] = rename[f[-1]]
        kept += [" ".join(f), lines[i + 1]]
(out / "sparse/0/images.txt").write_text("\n".join(kept) + "\n")
for fn in ("cameras.txt", "points3D.txt"):
    (out / "sparse/0" / fn).write_text((tmp / fn).read_text())
print(name, ":", len(train), "train,", len(test), "eval")
