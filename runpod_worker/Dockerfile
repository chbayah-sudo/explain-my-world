
#########################

FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY handler.py .
COPY labels.txt .

# Download MobileCLIP model during build (for faster cold starts)
RUN python -c "from transformers import CLIPModel, CLIPProcessor; \
    CLIPModel.from_pretrained('apple/MobileCLIP-S2-OpenCLIP'); \
    CLIPProcessor.from_pretrained('apple/MobileCLIP-S2-OpenCLIP')"

# Start the handler
CMD ["python", "-u", "handler.py"]
