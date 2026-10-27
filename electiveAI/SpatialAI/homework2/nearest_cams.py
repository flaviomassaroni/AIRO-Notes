import sys, json
from pathlib import Path
import numpy as np
from nerfstudio.utils.eval_utils import eval_setup

config, path_json = Path(sys.argv[1]), sys.argv[2]
_, pipeline, _, _ = eval_setup(config, test_mode="test")
ds = pipeline.datamanager.train_dataset
pos = ds.cameras.camera_to_worlds.cpu().numpy()[:, :, 3]          # (N, 3)
names = [Path(p).name for p in ds._dataparser_outputs.image_filenames]

d = json.load(open(path_json))
items = d.get("keyframes") or [{"matrix": f["camera_to_world"]}
                               for f in (d["camera_path"][0], d["camera_path"][-1])]
for k, it in enumerate(items):
    M = np.array(it["matrix"], dtype=float).reshape(4, 4)
    best = None
    for T in (M, M.T):                      # layout riga/colonna non verificato
        for s in (1.0, 10.0, 0.1):          # il viewer può usare una scala diversa
            dist = np.linalg.norm(pos - T[:3, 3] * s, axis=1)
            j = int(dist.argmin())
            if best is None or dist[j] < best[0]:
                best = (dist[j], j, s)
    print(f"keyframe {k}: {names[best[1]]}  (distanza {best[0]:.4f}, scala {best[2]})")
