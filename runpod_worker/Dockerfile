
#########################

FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY handler.py .
COPY labels.txt .

# Download SigLIP model during build (for faster cold starts)
RUN python -c "from transformers import CLIPModel, CLIPProcessor; \
    CLIPModel.from_pretrained('google/siglip-base-patch16-224'); \
    CLIPProcessor.from_pretrained('google/siglip-base-patch16-224')"

# Start the handler
CMD ["python", "-u", "handler.py"]
