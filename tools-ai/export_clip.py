# Convertit des modèles CLIP sous licence libre (MIT) en ONNX pour le téléphone,
# et calcule les empreintes des descriptions de traits (prompts.json).
import json, os, sys, torch
from transformers import CLIPModel, CLIPTokenizer, CLIPImageProcessor
from onnxruntime.quantization import quantize_dynamic, QuantType
from onnxconverter_common import float16
import onnx

MODELS = {
    "tc8": "wkcn/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M",
    "tc39": "wkcn/TinyCLIP-ViT-39M-16-Text-19M-YFCC15M",
    "tc40l": "wkcn/TinyCLIP-ViT-40M-32-Text-19M-LAION400M",
    "oai32": "openai/clip-vit-base-patch32",
}
prompts = json.load(open("tools-ai/prompts.json"))

class Vision(torch.nn.Module):
    def __init__(self, m):
        super().__init__(); self.v = m.vision_model; self.p = m.visual_projection
    def forward(self, pixel_values):
        return self.p(self.v(pixel_values=pixel_values).pooler_output)

for tag, name in MODELS.items():
    try:
        out = f"out/clip/{tag}"; os.makedirs(out, exist_ok=True)
        m = CLIPModel.from_pretrained(name).eval()
        tok = CLIPTokenizer.from_pretrained(name)
        proc = CLIPImageProcessor.from_pretrained(name)
        size = proc.crop_size["height"] if isinstance(proc.crop_size, dict) else proc.crop_size
        groups = {}
        with torch.no_grad():
            for g, values in prompts.items():
                labels = list(values); emb = []
                for l in labels:
                    t = tok(values[l], padding=True, return_tensors="pt")
                    e = m.get_text_features(**t)
                    e = e / e.norm(dim=-1, keepdim=True)
                    e = e.mean(0); e = e / e.norm()
                    emb.append([round(float(x), 4) for x in e])
                groups[g] = {"labels": labels, "emb": emb}
            scale = float(m.logit_scale.exp())
            torch.onnx.export(Vision(m), (torch.randn(1, 3, size, size),), f"{out}/vision.onnx", input_names=["pixel_values"], output_names=["image_embeds"], dynamic_axes={"pixel_values": {0: "b"}}, opset_version=17, dynamo=False)
        quantize_dynamic(f"{out}/vision.onnx", f"{out}/vision_q8.onnx", weight_type=QuantType.QUInt8)
        f16 = float16.convert_float_to_float16(onnx.load(f"{out}/vision.onnx"), keep_io_types=True)
        onnx.save(f16, f"{out}/vision_fp16.onnx")
        cfg = {"size": size, "mean": list(proc.image_mean), "std": list(proc.image_std), "scale": min(100, round(scale, 2)), "output": "image_embeds", "model": name}
        json.dump({"config": cfg, "groups": groups}, open(f"{out}/text.json", "w"), separators=(",", ":"))
        for f in os.listdir(out): print(tag, f, os.path.getsize(f"{out}/{f}") // 1024 // 1024, "Mo")
    except Exception as e:
        print("échec", tag, e)
