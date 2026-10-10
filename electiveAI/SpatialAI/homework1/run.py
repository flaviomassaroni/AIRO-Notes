import sys
from pathlib import Path
import pycolmap

name = sys.argv[1]                      # es. images-20
img_dir = Path(name).resolve()
out = Path("out") / name
out.mkdir(parents=True, exist_ok=True)
db = out / "db.db"
if db.exists():
    db.unlink()                         # riparti sempre da un database pulito

ext = pycolmap.FeatureExtractionOptions()
ext.num_threads = 2
pycolmap.extract_features(database_path=db, image_path=img_dir,
                          camera_mode=pycolmap.CameraMode.SINGLE,
                          extraction_options=ext)
pycolmap.match_exhaustive(database_path=db)
maps = pycolmap.incremental_mapping(database_path=db, image_path=img_dir,
                                    output_path=out)

if not maps:
    print("NESSUN MODELLO")
for idx, rec in maps.items():
    print(f"--- modello {idx} ---")
    print(rec.summary())
    rec.export_PLY(out / f"model_{idx}.ply")