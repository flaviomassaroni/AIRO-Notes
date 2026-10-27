import sys, json
from copy import deepcopy
from pathlib import Path
import torch
from torchvision.utils import save_image
from nerfstudio.utils.eval_utils import eval_setup

config, name = Path(sys.argv[1]), sys.argv[2]
_, pipeline, _, step = eval_setup(config, test_mode="test")
model, dm = pipeline.model, pipeline.datamanager
model.eval()
dev = model.device
out_dir = Path("renders") / name
out_dir.mkdir(parents=True, exist_ok=True)


def run(ds, cached, tag):
    res = {}
    for i in range(len(ds.cameras)):
        fname = Path(ds._dataparser_outputs.image_filenames[i]).name
        cam = ds.cameras[i:i + 1].to(dev)
        batch = deepcopy(cached[i])
        batch["image"] = batch["image"].to(dev)
        with torch.no_grad():
            outputs = model.get_outputs_for_camera(cam)
            metrics, _ = model.get_image_metrics_and_images(outputs, batch)
        res[fname] = float(metrics["psnr"])
        if tag == "test":
            save_image(outputs["rgb"].permute(2, 0, 1).clamp(0, 1),
                       out_dir / f"pred_{fname}.png")
            save_image(model.get_gt_img(batch["image"]).permute(2, 0, 1),
                       out_dir / f"gt_{fname}.png")
    return res


train = run(dm.train_dataset, dm.cached_train, "train")
test = run(dm.eval_dataset, dm.cached_eval, "test")
summary = {
    "step": step,
    "n_train": len(train), "n_test": len(test),
    "psnr_train_mean": sum(train.values()) / len(train),
    "psnr_test_mean": sum(test.values()) / len(test),
    "train": train, "test": test,
}
json.dump(summary, open(f"metrics_{name}.json", "w"), indent=2)
print(f"{name}: train {summary['psnr_train_mean']:.2f} dB ({len(train)} img) | "
      f"test {summary['psnr_test_mean']:.2f} dB ({len(test)} img)")
for k, v in test.items():
    print("  test", k, f"{v:.2f}")