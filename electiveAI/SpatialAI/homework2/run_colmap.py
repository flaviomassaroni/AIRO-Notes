import pycolmap
from pathlib import Path

db = Path("database.db")
images = Path("images")
out = Path("sparse")
out.mkdir(exist_ok=True)

reader = pycolmap.ImageReaderOptions()
reader.camera_model = "SIMPLE_PINHOLE"

pycolmap.extract_features(
    db, images,
    camera_mode=pycolmap.CameraMode.SINGLE,
    reader_options=reader,
)
pycolmap.match_exhaustive(db)
maps = pycolmap.incremental_mapping(db, images, out)

for idx, rec in maps.items():
    print(f"model {idx}: {rec.num_reg_images()} immagini registrate, "
          f"{rec.num_points3D()} punti 3D")