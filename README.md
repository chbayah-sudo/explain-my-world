# Explain My World V1

A minimal hackathon demo for AI-powered object recognition. Upload an image, draw a rectangle around an object, and get top-5 predictions with confidence scores powered by CLIP running on Runpod serverless GPU.

## Features

- 🖼️ Image upload (JPG/PNG)
- 🎯 Interactive rectangle selection with canvas overlay
- 🤖 CLIP-based object recognition
- ⚡ Fast GPU inference via Runpod Serverless
- 📊 Top-5 predictions with confidence scores
- 🎨 Clean, responsive UI with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Sharp (image processing)
- **ML**: CLIP (ViT-B/32) via Transformers
- **Inference**: Runpod Serverless GPU
- **Deployment**: Vercel (frontend), Runpod (ML worker)

## Project Structure

```
explain-my-world/
├── app/
│   ├── page.tsx                 # Main UI with upload & selection
│   ├── layout.tsx               # Root layout
│   └── api/
│       └── recognize/
│           └── route.ts         # Recognition API endpoint
├── lib/
│   ├── box.ts                   # Coordinate utilities
│   └── runpod.ts                # Runpod API client
├── runpod_worker/
│   ├── handler.py               # Python worker for Runpod
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Container for Runpod deployment
│   └── labels.txt               # ~200 object labels
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn or pnpm
- Runpod account with serverless endpoint (for recognition to work)

### Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Runpod credentials:

```bash
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_ENDPOINT_URL=https://api.runpod.ai/v2/your_endpoint_id
```

3. **Run the development server:**

```bash
npm run dev
```

4. **Open [http://localhost:3000](http://localhost:3000)**

The app will be running, but recognition won't work until you deploy the Runpod worker (see below).

## Deploying the Runpod Worker

The ML inference runs on Runpod serverless GPU. Follow these steps to deploy:

### 1. Build and Push Docker Image

```bash
cd runpod_worker

# Build the image
docker build -t your-dockerhub-username/explain-my-world-worker:latest .

# Push to Docker Hub (or any container registry)
docker login
docker push your-dockerhub-username/explain-my-world-worker:latest
```

### 2. Create Runpod Serverless Endpoint

1. Go to [Runpod Console](https://www.runpod.io/console/serverless)
2. Click **"New Endpoint"**
3. Configure:
   - **Endpoint Name**: explain-my-world
   - **Container Image**: `your-dockerhub-username/explain-my-world-worker:latest`
   - **GPU Type**: Choose a GPU (e.g., RTX 3070, A4000)
   - **Max Workers**: 1-3 (start small)
   - **Idle Timeout**: 5 seconds (for cost optimization)
   - **Container Disk**: 10 GB
4. Click **"Deploy"**

### 3. Get Endpoint URL and API Key

After deployment:
- **Endpoint URL**: Will be shown in the format `https://api.runpod.ai/v2/{endpoint_id}`
- **API Key**: Get from [Settings](https://www.runpod.io/console/user/settings)

Add these to your `.env.local` file.

### 4. Test the Endpoint

You can test the Runpod endpoint directly:

```bash
# Save this to test_image.jpg (any small test image)
# Then convert to base64:
base64 -i test_image.jpg -o test_image.b64

# Test the endpoint:
curl -X POST https://api.runpod.ai/v2/your_endpoint_id/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RUNPOD_API_KEY" \
  -d '{
    "input": {
      "image_base64": "'"$(cat test_image.b64)"'"
    }
  }'
```

Expected response:
```json
{
  "status": "COMPLETED",
  "output": [
    {"label": "cat", "score": 0.8234},
    {"label": "dog", "score": 0.0823},
    ...
  ]
}
```

## Deploying Frontend to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Explain My World V1"
git branch -M main
git remote add origin https://github.com/your-username/explain-my-world.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. **Environment Variables** (add these):
   ```
   RUNPOD_API_KEY=your_runpod_api_key
   RUNPOD_ENDPOINT_URL=https://api.runpod.ai/v2/your_endpoint_id
   ```
5. Click **"Deploy"**

Your app will be live at `https://your-app.vercel.app`

## Testing the Full Stack

### Test the Web App API

```bash
# First, upload an image and get its base64 representation
# Then test the /api/recognize endpoint:

curl -X POST http://localhost:3000/api/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
    "box": {
      "x": 100,
      "y": 100,
      "w": 200,
      "h": 200
    }
  }'
```

Expected response:
```json
{
  "top5": [
    {"label": "laptop", "score": 0.7234},
    {"label": "computer", "score": 0.1823},
    ...
  ],
  "latencyMs": 1234
}
```

## How It Works

1. **User uploads an image** → Loaded as base64 in browser
2. **User draws a selection** → Canvas overlay captures rectangle coordinates
3. **Coordinates are converted** → Display coords → original image pixel coords
4. **POST to `/api/recognize`** → Sends image base64 + box coords
5. **API crops the image** → Uses Sharp to extract selected region
6. **Calls Runpod endpoint** → Sends cropped image base64
7. **CLIP processes image** → Computes similarity against ~200 text labels
8. **Returns top-5 predictions** → With confidence scores
9. **UI displays results** → Shows predictions with progress bars

## Model & Labels

- **Model**: `openai/clip-vit-base-patch32` (via HuggingFace Transformers)
- **Labels**: 200 common objects (see `runpod_worker/labels.txt`)
- **Inference**: GPU-accelerated on Runpod (CUDA if available, CPU fallback)

## Configuration

### Minimum Selection Size

The app requires selections to be at least **32x32 pixels** (in original image coordinates) to ensure good recognition quality. This is validated both client-side and server-side.

### Image Cropping

- Uses Sharp for fast, high-quality image processing
- Crops are converted to JPEG (quality 90) before sending to Runpod
- Box coordinates are clamped to image boundaries

### Error Handling

- Invalid image formats rejected (must be JPG/PNG)
- Box coordinates validated (must be numbers)
- Runpod errors caught and displayed to user
- Clear error messages for all failure cases

## Assumptions & Limitations

- **No authentication** - This is a hackathon demo
- **No database** - All processing is stateless
- **No rate limiting** - Add if deploying publicly
- **Single object recognition** - One prediction per request
- **~200 labels** - Limited vocabulary (expandable by editing `labels.txt`)
- **Cold starts** - First request to Runpod may be slow (~10-30s)

## Extending the App

### Add More Labels

Edit `runpod_worker/labels.txt` and redeploy:

```bash
echo "new_object_label" >> runpod_worker/labels.txt
# Rebuild and push docker image
# Update Runpod endpoint
```

### Use a Different Model

Edit `runpod_worker/handler.py`:

```python
# Change this line:
model_name = "openai/clip-vit-large-patch14"  # Larger model
```

### Add Multiple Selections

Modify the UI to store multiple boxes and send them as an array to the API.

## Troubleshooting

### "Recognition service error"

- Check that `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_URL` are set correctly
- Verify the Runpod endpoint is deployed and running
- Check Runpod logs in the console

### "Selection too small"

- Make sure your selection is at least 32x32 pixels
- Try selecting a larger area

### Slow first request

- Runpod serverless has cold starts (~10-30s for first request)
- Subsequent requests should be faster (<2s)
- Consider increasing "Max Workers" or reducing "Idle Timeout" in Runpod settings

### TypeScript errors

```bash
npm run build
# Fix any type errors reported
```

## Cost Estimates

### Runpod Costs
- **GPU runtime**: ~$0.20-0.50 per hour (varies by GPU type)
- **Serverless billing**: Only pay when processing requests
- **Cold starts**: No charge during idle periods
- **Estimate**: $1-5 for a hackathon demo day

### Vercel Costs
- **Hobby plan**: Free (with limits)
- **Usage**: Well within free tier for demo use

## License

MIT License - feel free to use for your own projects!

## Credits

- Built with [Next.js](https://nextjs.org/)
- ML powered by [OpenAI CLIP](https://github.com/openai/CLIP)
- Inference on [Runpod](https://www.runpod.io/)
- Deployed on [Vercel](https://vercel.com/)
