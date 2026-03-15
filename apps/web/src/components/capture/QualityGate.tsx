import { useEffect, useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

interface QualityCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'checking';
  detail: string;
}

interface QualityGateProps {
  imageBlob: Blob;
  width: number;
  height: number;
  onComplete?: (allPassed: boolean) => void;
}

function computeLaplacianVariance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  // Convert to grayscale and compute Laplacian
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let variance = 0;
  let count = 0;
  // Simple Laplacian kernel [0, 1, 0; 1, -4, 1; 0, 1, 0]
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lap =
        gray[(y - 1) * w + x] +
        gray[(y + 1) * w + x] +
        gray[y * w + (x - 1)] +
        gray[y * w + (x + 1)] -
        4 * gray[y * w + x];
      variance += lap * lap;
      count++;
    }
  }

  return count > 0 ? variance / count : 0;
}

function computeCenterLuminance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  // Center crop: 50% of image
  const cropW = Math.floor(w * 0.5);
  const cropH = Math.floor(h * 0.5);
  const startX = Math.floor((w - cropW) / 2);
  const startY = Math.floor((h - cropH) / 2);

  const imageData = ctx.getImageData(startX, startY, cropW, cropH);
  const data = imageData.data;

  let totalLuminance = 0;
  const pixelCount = cropW * cropH;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    totalLuminance += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  return pixelCount > 0 ? totalLuminance / pixelCount : 0;
}

export function QualityGate({ imageBlob, width, height, onComplete }: QualityGateProps) {
  const [checks, setChecks] = useState<QualityCheck[]>([
    { id: 'resolution', label: 'Resolution', status: 'checking', detail: 'Checking...' },
    { id: 'blur', label: 'Sharpness', status: 'checking', detail: 'Analyzing...' },
    { id: 'lighting', label: 'Lighting', status: 'checking', detail: 'Measuring...' },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const results: QualityCheck[] = [];

      // Resolution check
      const resPass = width >= 1920 && height >= 1080;
      results.push({
        id: 'resolution',
        label: 'Resolution',
        status: resPass ? 'pass' : 'warn',
        detail: resPass ? `${width}x${height}` : `${width}x${height} (min 1920x1080)`,
      });

      // Load image for canvas analysis
      const url = URL.createObjectURL(imageBlob);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }

      // Use a smaller canvas for analysis to keep it fast
      const analysisW = Math.min(640, img.width);
      const analysisH = Math.round((analysisW / img.width) * img.height);
      const canvas = document.createElement('canvas');
      canvas.width = analysisW;
      canvas.height = analysisH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, analysisW, analysisH);

        // Blur detection
        const laplacianVar = computeLaplacianVariance(ctx, analysisW, analysisH);
        const blurThreshold = 100;
        const blurPass = laplacianVar > blurThreshold;
        results.push({
          id: 'blur',
          label: 'Sharpness',
          status: blurPass ? 'pass' : 'warn',
          detail: blurPass ? 'Image is sharp' : 'Image may be blurry',
        });

        // Lighting check
        const avgLum = computeCenterLuminance(ctx, analysisW, analysisH);
        const lightingPass = avgLum > 40 && avgLum < 230;
        results.push({
          id: 'lighting',
          label: 'Lighting',
          status: lightingPass ? 'pass' : 'warn',
          detail: lightingPass
            ? 'Good exposure'
            : avgLum <= 40
              ? 'Too dark'
              : 'Overexposed',
        });
      } else {
        results.push({
          id: 'blur',
          label: 'Sharpness',
          status: 'warn',
          detail: 'Unable to analyze',
        });
        results.push({
          id: 'lighting',
          label: 'Lighting',
          status: 'warn',
          detail: 'Unable to analyze',
        });
      }

      URL.revokeObjectURL(url);

      if (!cancelled) {
        setChecks(results);
        const allPassed = results.every((c) => c.status === 'pass');
        onComplete?.(allPassed);
      }
    }

    runChecks();
    return () => {
      cancelled = true;
    };
  }, [imageBlob, width, height, onComplete]);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
        Quality Checks
      </h3>
      {checks.map((check) => (
        <div
          key={check.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-forest-900/50 border border-[var(--border)]"
        >
          {check.status === 'checking' ? (
            <div className="w-4 h-4 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin flex-shrink-0" />
          ) : check.status === 'pass' ? (
            <div className="w-5 h-5 rounded-full bg-[var(--green)]/20 flex items-center justify-center flex-shrink-0">
              <Check size={12} className="text-[var(--green)]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={12} className="text-amber" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text)]">{check.label}</p>
            <p className="text-[10px] text-[var(--text3)]">{check.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
