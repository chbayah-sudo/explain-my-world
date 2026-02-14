
#########################

FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY handler.py .
COPY labels.txt .

# Model will download on first run (cold start)
# This avoids build issues and keeps image smaller

# Start the handler
CMD ["python", "-u", "handler.py"]
