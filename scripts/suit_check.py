import io
from functools import lru_cache
from pathlib import Path

from PIL import Image

MODEL_ID = "openai/clip-vit-base-patch32"

POSITIVE = [
    "a portrait of a Formula 1 driver wearing a race suit with sponsor logos",
    "a Formula 1 driver in team-branded racing overalls",
    "a racing driver in a fireproof race suit",
]

NEGATIVE = [
    "a person wearing a business suit and tie",
    "a person wearing a formal jacket",
    "a person in casual clothes",
    "a person in a t-shirt",
    "a crowd of people",
    "a racing car on a track",
    "a helmet with no person visible",
    "a logo or illustration",
    "a trophy ceremony",
]


@lru_cache(maxsize=1)
def _load():
    import torch
    from transformers import CLIPModel, CLIPProcessor

    model = CLIPModel.from_pretrained(MODEL_ID).eval()
    processor = CLIPProcessor.from_pretrained(MODEL_ID)
    return torch, model, processor


def suit_score(image) -> float:
    torch, model, processor = _load()

    if isinstance(image, (bytes, bytearray)):
        image = Image.open(io.BytesIO(image))
    elif isinstance(image, (str, Path)):
        image = Image.open(image)
    image = image.convert("RGB")

    prompts = POSITIVE + NEGATIVE
    inputs = processor(text=prompts, images=image, return_tensors="pt", padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits_per_image[0]
    probs = logits.softmax(dim=0)
    return float(probs[: len(POSITIVE)].sum())