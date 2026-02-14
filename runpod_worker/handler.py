import runpod
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModel
import base64
from io import BytesIO

# Global variables for model (loaded once at startup)
model = None
processor = None
labels = []


def load_model():
    """Load CLIP model and labels on cold start"""
    global model, processor, labels

    print("Loading SigLIP model...")
    model_name = "google/siglip-base-patch16-224"
    model = AutoModel.from_pretrained(model_name)
    processor = AutoProcessor.from_pretrained(model_name)

    # Move to GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()

    print(f"Model loaded on {device}")

    # Load labels
    print("Loading labels...")
    with open("labels.txt", "r") as f:
        labels = [line.strip() for line in f.readlines() if line.strip()]

    print(f"Loaded {len(labels)} labels")


def handler(event):
    """
    Handler function called per request
    Input: {"image_base64": "..."}
    Output: [{"label": "cat", "score": 0.95}, ...]
    """
    try:
        # Decode image
        image_base64 = event["input"]["image_base64"]
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")

        # Prepare text inputs (labels formatted as "a photo of {label}")
        text_inputs = [f"a photo of {label}" for label in labels]

        # Process inputs
        inputs = processor(
            text=text_inputs, images=image, return_tensors="pt", padding=True
        )

        # Move to GPU
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)[0]

        # Get top 5
        top5_indices = probs.argsort(descending=True)[:5]
        results = [
            {"label": labels[idx.item()], "score": round(probs[idx].item(), 4)}
            for idx in top5_indices
        ]

        return results

    except Exception as e:
        print(f"Error in handler: {str(e)}")
        return {"error": str(e)}


# Initialize model on startup
print("Starting Runpod worker...")
load_model()
print("Worker ready!")

# Start the serverless worker
runpod.serverless.start({"handler": handler})
