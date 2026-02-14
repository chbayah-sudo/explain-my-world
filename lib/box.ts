export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dimensions {
  w: number;
  h: number;
}

/**
 * Convert display coordinates to natural image coordinates
 * @param displayBox - Box in display (CSS-scaled) coordinates
 * @param displayDims - Display dimensions of the image
 * @param naturalDims - Natural (original) dimensions of the image
 * @returns Box in natural image coordinates
 */
export function displayToNaturalCoords(
  displayBox: Box,
  displayDims: Dimensions,
  naturalDims: Dimensions
): Box {
  const scaleX = naturalDims.w / displayDims.w;
  const scaleY = naturalDims.h / displayDims.h;

  return {
    x: Math.round(displayBox.x * scaleX),
    y: Math.round(displayBox.y * scaleY),
    w: Math.round(displayBox.w * scaleX),
    h: Math.round(displayBox.h * scaleY),
  };
}

/**
 * Validate box dimensions meet minimum size requirements
 * @param box - Box to validate
 * @param minSize - Minimum width and height required
 * @returns true if box is valid, false otherwise
 */
export function isValidBox(box: Box | null, minSize: number = 32): boolean {
  if (!box) return false;
  return box.w >= minSize && box.h >= minSize;
}

/**
 * Clamp box coordinates to image boundaries
 * @param box - Box to clamp
 * @param imageDims - Image dimensions to clamp to
 * @returns Clamped box
 */
export function clampBox(box: Box, imageDims: Dimensions): Box {
  const x = Math.max(0, Math.min(box.x, imageDims.w - 1));
  const y = Math.max(0, Math.min(box.y, imageDims.h - 1));
  const w = Math.min(box.w, imageDims.w - x);
  const h = Math.min(box.h, imageDims.h - y);

  return { x, y, w, h };
}
