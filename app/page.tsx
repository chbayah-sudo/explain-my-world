'use client';

import { useState, useRef, useEffect } from 'react';
import { displayToNaturalCoords, isValidBox, type Box } from '@/lib/box';

interface Prediction {
  label: string;
  score: number;
}

interface RecognitionResult {
  top5: Prediction[];
  latencyMs: number;
}

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionBox, setSelectionBox] = useState<Box | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Please upload a JPG or PNG image');
      return;
    }

    setImageFile(file);
    setError(null);
    setResult(null);
    setSelectionBox(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Update canvas size when image loads
  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      drawSelection();
    }
  }, [imageDataUrl, selectionBox]);

  // Draw selection rectangle on canvas
  const drawSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (selectionBox) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
    }
  };

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setSelectionBox(null);
    setError(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const currentPos = getMousePos(e);
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);

    setSelectionBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPos(null);
  };

  // Reset selection
  const handleReset = () => {
    setSelectionBox(null);
    setError(null);
    setResult(null);
  };

  // Recognize object
  const handleRecognize = async () => {
    if (!imageDataUrl || !selectionBox || !imageRef.current) return;

    // Validate selection in original coordinates
    const img = imageRef.current;
    const naturalBox = displayToNaturalCoords(
      selectionBox,
      { w: img.clientWidth, h: img.clientHeight },
      { w: img.naturalWidth, h: img.naturalHeight }
    );

    if (!isValidBox(naturalBox, 32)) {
      setError('Selection too small. Please select at least 32x32 pixels.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          box: naturalBox,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Recognition failed');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('Failed to connect to recognition service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Explain My World V1
          </h1>
          <p className="text-slate-600">
            Upload an image, draw a rectangle around an object, and get AI-powered recognition
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Image Upload & Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              1. Upload & Select
            </h2>

            {/* File Upload */}
            <div className="mb-4">
              <label
                htmlFor="file-upload"
                className="block w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="mx-auto h-12 w-12 text-slate-400 mb-2"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-slate-600">
                  {imageFile ? imageFile.name : 'Click to upload JPG or PNG'}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Display & Canvas */}
            {imageDataUrl && (
              <div className="relative inline-block max-w-full">
                <img
                  ref={imageRef}
                  src={imageDataUrl}
                  alt="Uploaded"
                  className="max-w-full h-auto rounded-lg"
                  onLoad={() => {
                    if (imageRef.current && canvasRef.current) {
                      const canvas = canvasRef.current;
                      canvas.width = imageRef.current.clientWidth;
                      canvas.height = imageRef.current.clientHeight;
                    }
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            )}

            {/* Instructions */}
            {imageDataUrl && !selectionBox && (
              <p className="mt-4 text-sm text-slate-500 text-center">
                Click and drag to select an object
              </p>
            )}

            {/* Action Buttons */}
            {imageDataUrl && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleRecognize}
                  disabled={!selectionBox || isLoading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Recognizing...' : 'Recognize'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={!selectionBox}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              2. Results
            </h2>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div>
                <div className="mb-4 text-sm text-slate-600">
                  Recognition completed in{' '}
                  <span className="font-semibold text-slate-900">
                    {result.latencyMs}ms
                  </span>
                </div>

                <div className="space-y-3">
                  {result.top5.map((prediction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-slate-900">
                          {prediction.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${prediction.score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                          {(prediction.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!result && !error && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-16 w-16 text-slate-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-slate-500">
                  Upload an image and select an object to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Powered by CLIP (ViT-B/32) on Runpod Serverless GPU
          </p>
        </div>
      </div>
    </div>
  );
}
