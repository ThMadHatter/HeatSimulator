import cv from '@techstark/opencv-js';

let cvReady = false;
cv.onRuntimeInitialized = () => {
  cvReady = true;
};

export function isOpenCVReady(): boolean {
  // If it's already defined and not a promise, it might be ready
  // techstark version usually has a way to check
  return cvReady || (typeof cv.Mat !== 'undefined');
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Detects the PCB outline from an image element.
 * @param imgElement The HTMLImageElement to process
 * @param epsilonFactor Factor for polygon approximation (smaller = more points)
 * @returns An array of points representing the simplified contour in pixel coordinates
 */
export async function detectPCBOutline(
  imgElement: HTMLImageElement,
  epsilonFactor: number = 0.02
): Promise<Point[]> {
  return new Promise((resolve, reject) => {
    try {
      // 1. Load image into Mat
      const src = cv.imread(imgElement);
      const gray = new cv.Mat();
      const blurred = new cv.Mat();
      const edges = new cv.Mat();
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();

      // 2. Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      // 3. Apply Gaussian blur to reduce noise
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

      // 4. Canny edge detection
      // We use Otsu's method or just sensible defaults for PCB images
      cv.Canny(blurred, edges, 50, 150, 3, false);

      // 5. Find contours
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // 6. Find the largest contour by area
      let maxArea = 0;
      let maxContourIdx = -1;
      for (let i = 0; i < contours.size(); ++i) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area > maxArea) {
          maxArea = area;
          maxContourIdx = i;
        }
      }

      if (maxContourIdx === -1) {
        // Cleanup
        src.delete(); gray.delete(); blurred.delete(); edges.delete();
        contours.delete(); hierarchy.delete();
        return resolve([]);
      }

      const largestContour = contours.get(maxContourIdx);

      // 7. Simplify contour using polygon approximation
      const simplified = new cv.Mat();
      const perimeter = cv.arcLength(largestContour, true);
      cv.approxPolyDP(largestContour, simplified, epsilonFactor * perimeter, true);

      // 8. Convert simplified Mat to Point array
      const points: Point[] = [];
      for (let i = 0; i < simplified.rows; i++) {
        points.push({
          x: simplified.data32S[i * 2],
          y: simplified.data32S[i * 2 + 1],
        });
      }

      // Cleanup
      src.delete(); gray.delete(); blurred.delete(); edges.delete();
      contours.delete(); hierarchy.delete(); simplified.delete();

      resolve(points);
    } catch (err) {
      reject(err);
    }
  });
}
