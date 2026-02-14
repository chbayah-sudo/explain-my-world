import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { recognizeObject } from '@/lib/runpod';
import { clampBox, type Box } from '@/lib/box';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

interface RecognizeRequest {
  imageBase64: string;
  box: Box;
}

// Configuration
const MAX_IMAGE_SIZE_MB = 8;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Rate limiting: 10 requests per minute per IP
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    maxRequests: 10,
    windowSeconds: 60,
  });

  // Add rate limit headers
  const headers = {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
  };

  if (!rateLimit.allowed) {
    const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Please try again in ${resetIn} seconds.`,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  try {
    // Parse and validate request body
    const body = (await request.json()) as RecognizeRequest;

    if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageBase64 field' },
        { status: 400 }
      );
    }

    if (!body.box || typeof body.box !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid box field' },
        { status: 400 }
      );
    }

    const { x, y, w, h } = body.box;

    // Validate box coordinates
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof w !== 'number' ||
      typeof h !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Box coordinates must be numbers' },
        { status: 400 }
      );
    }

    // Validate minimum box size
    if (w < 32 || h < 32) {
      return NextResponse.json(
        { error: 'Selection too small. Minimum size is 32x32 pixels' },
        { status: 400 }
      );
    }

    // Remove data URI prefix if present
    let imageBase64Clean = body.imageBase64;
    if (imageBase64Clean.includes(',')) {
      imageBase64Clean = imageBase64Clean.split(',')[1];
    }

    // Validate image size (8MB limit)
    const imageSizeBytes = Math.ceil((imageBase64Clean.length * 3) / 4);
    if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (imageSizeBytes / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `Image too large (${sizeMB}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`,
        },
        { status: 413, headers }
      );
    }

    // Decode base64 to buffer
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(imageBase64Clean, 'base64');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid base64 image data' },
        { status: 400 }
      );
    }

    // Load image with sharp and get metadata
    let image = sharp(imageBuffer);
    let metadata;
    try {
      metadata = await image.metadata();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid JPG or PNG image' },
        { status: 400 }
      );
    }

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Could not determine image dimensions' },
        { status: 400 }
      );
    }

    // Clamp box coordinates to image bounds
    const clampedBox = clampBox(
      { x, y, w, h },
      { w: metadata.width, h: metadata.height }
    );

    // Extract and crop region
    let croppedBuffer: Buffer;
    try {
      croppedBuffer = await sharp(imageBuffer)
        .extract({
          left: clampedBox.x,
          top: clampedBox.y,
          width: clampedBox.w,
          height: clampedBox.h,
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      console.error('Image cropping error:', error);
      return NextResponse.json(
        { error: 'Failed to crop image' },
        { status: 500 }
      );
    }

    // Convert cropped image to base64
    const croppedBase64 = croppedBuffer.toString('base64');

    // Call Runpod endpoint
    let top5;
    try {
      top5 = await recognizeObject(croppedBase64);
    } catch (error) {
      console.error('Runpod error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: `Recognition service error: ${errorMessage}` },
        { status: 502 }
      );
    }

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // Return results
    return NextResponse.json(
      {
        top5,
        latencyMs,
      },
      { headers }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

