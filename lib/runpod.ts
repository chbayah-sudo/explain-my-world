export interface RunpodRequest {
  input: {
    image_base64: string;
  };
}

export interface RunpodResponse {
  status: 'COMPLETED' | 'FAILED';
  output?: Array<{ label: string; score: number }>;
  error?: string;
}

/**
 * Call Runpod serverless endpoint for object recognition
 * @param imageBase64 - Base64 encoded image (without data URI prefix)
 * @returns Array of top-5 predictions with labels and scores
 * @throws Error if Runpod configuration is missing or API call fails
 */
export async function recognizeObject(
  imageBase64: string
): Promise<Array<{ label: string; score: number }>> {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointUrl = process.env.RUNPOD_ENDPOINT_URL;

  if (!apiKey || !endpointUrl) {
    throw new Error(
      'Runpod configuration missing. Please set RUNPOD_API_KEY and RUNPOD_ENDPOINT_URL environment variables.'
    );
  }

  const requestBody: RunpodRequest = {
    input: {
      image_base64: imageBase64,
    },
  };

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Runpod API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data: RunpodResponse = await response.json();

    if (data.status === 'FAILED') {
      throw new Error(`Recognition failed: ${data.error || 'Unknown error'}`);
    }

    if (!data.output || data.output.length === 0) {
      throw new Error('No predictions returned from Runpod');
    }

    return data.output;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Runpod service error: ${error.message}`);
    }
    throw new Error('Unknown error calling Runpod service');
  }
}
