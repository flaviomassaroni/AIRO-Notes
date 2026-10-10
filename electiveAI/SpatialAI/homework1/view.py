import sys
import numpy as np
import open3d as o3d
import pycolmap

model_dir = sys.argv[1]                    
rec = pycolmap.Reconstruction(model_dir)

pts3d = [p for p in rec.points3D.values() if p.track.length() >= 3]
pts = np.array([p.xyz for p in pts3d])
cols = np.array([p.color for p in pts3d]) / 255.0

med = np.median(pts, axis=0)
keep = np.linalg.norm(pts - med, axis=1) < 3 * np.median(np.linalg.norm(pts - med, axis=1))
pts, cols = pts[keep], cols[keep]

pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(pts)
pcd.colors = o3d.utility.Vector3dVector(cols)

centers = np.array([im.projection_center() for im in rec.images.values()])
cam = o3d.geometry.PointCloud()
cam.points = o3d.utility.Vector3dVector(centers)
cam.paint_uniform_color([1, 0, 0])

print(f"{len(rec.images)} immagini registrate, "
      f"{len(rec.points3D)} punti 3D totali, {len(pts)} con track >= 3")
print(sorted(im.name for im in rec.images.values()))
o3d.visualization.draw_geometries([pcd, cam])