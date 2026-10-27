import json
from pathlib import Path

test = [
    "IMG_20261027_090538.jpg",
    "IMG_20261027_090604.jpg",
    "IMG_20261027_090620_1.jpg",
    "IMG_20261027_090643.jpg",
    "IMG_20261027_090714.jpg",
]
all_imgs = sorted(p.name for p in Path("images").glob("*.jpg"))
assert all(t in all_imgs for t in test), "nome test non trovato"
train = [n for n in all_imgs if n not in test]

json.dump({"test": test, "train": train}, open("split.json", "w"), indent=2)
print(len(all_imgs), "totali,", len(train), "train,", len(test), "test")