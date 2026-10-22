/**
 * SPHEREx Sky Explorer - Image Download Utilities
 *
 * Provides resilient client-side downloading for single frames, stacked frames,
 * blinking epochs, side-by-side comparison montages, and computed difference canvases.
 */

/**
 * Trigger browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Downloads an HTMLCanvasElement as a PNG image
 */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  type = 'image/png',
  quality = 1.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              downloadBlob(blob, filename);
              resolve();
            } else {
              // Fallback to dataURL
              const dataUrl = canvas.toDataURL(type, quality);
              downloadDataUrl(dataUrl, filename);
              resolve();
            }
          },
          type,
          quality
        );
      } else {
        const dataUrl = canvas.toDataURL(type, quality);
        downloadDataUrl(dataUrl, filename);
        resolve();
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Download a data: URL directly
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 200);
}

/**
 * Resiliently downloads an image from a URL as a named file.
 * Handles CORS via fetch -> Blob, fallback to hidden Canvas rendering,
 * and graceful fallback to direct anchor click.
 */
export async function downloadImageUrl(url: string, filename: string): Promise<void> {
  // Strategy 1: Fetch as blob (preserves exact source bytes, supports WebP/PNG)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      downloadBlob(blob, filename);
      return;
    }
  } catch {
    // Fetch failed (e.g. strict CORS), try strategy 2
  }

  // Strategy 2: Load into Image with crossOrigin, render to Canvas
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No 2D context');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, filename);
              resolve();
            } else {
              reject(new Error('Failed to generate image blob'));
            }
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for canvas export'));
      img.src = url;
    });
    return;
  } catch {
    // Strategy 2 failed (tainted canvas), fallback to direct link
  }

  // Strategy 3: Direct link trigger
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 200);
}

/**
 * Creates and downloads a side-by-side comparison montage image (Epoch A + Epoch B)
 * with annotated metadata headers.
 */
export async function downloadSideBySideMontage(options: {
  imgAUrl: string;
  imgBUrl: string;
  targetTitle: string;
  labelA: string;
  metaA: string;
  labelB: string;
  metaB: string;
  filename: string;
}): Promise<void> {
  const { imgAUrl, imgBUrl, targetTitle, labelA, metaA, labelB, metaB, filename } = options;

  const loadImg = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });

  const [imgA, imgB] = await Promise.all([loadImg(imgAUrl), loadImg(imgBUrl)]);

  const singleWidth = Math.max(imgA.naturalWidth || 600, 600);
  const singleHeight = Math.max(imgA.naturalHeight || 600, 600);
  const headerHeight = 70;
  const padding = 16;
  const gap = 16;

  const totalWidth = padding * 2 + singleWidth * 2 + gap;
  const totalHeight = padding * 2 + headerHeight + singleHeight + 40;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Background
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Top Title banner
  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`SPHEREx Sky Explorer — ${targetTitle}`, padding, padding + 22);

  ctx.fillStyle = '#71717a';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText('Dual-Epoch Side-by-Side Comparison', padding, padding + 42);

  // Epoch A Box
  const xA = padding;
  const yA = padding + headerHeight;
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 14px ui-monospace, monospace';
  ctx.fillText(`[EPOCH A] ${labelA}`, xA, yA - 10);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '12px ui-monospace, monospace';
  ctx.fillText(metaA, xA + 160, yA - 10);

  // Draw Img A
  ctx.drawImage(imgA, xA, yA, singleWidth, singleHeight);

  // Epoch B Box
  const xB = padding + singleWidth + gap;
  const yB = padding + headerHeight;
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 14px ui-monospace, monospace';
  ctx.fillText(`[EPOCH B] ${labelB}`, xB, yB - 10);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '12px ui-monospace, monospace';
  ctx.fillText(metaB, xB + 160, yB - 10);

  // Draw Img B
  ctx.drawImage(imgB, xB, yB, singleWidth, singleHeight);

  // Footer
  ctx.fillStyle = '#52525b';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(
    'NASA / SPHEREx Spectral Sky Survey • Generated with SPHEREx Sky Explorer',
    padding,
    totalHeight - 14
  );

  await downloadCanvas(canvas, filename);
}

/**
 * Creates clean, filesystem-safe filenames with relevant astronomical tags
 */
export function sanitizeFilename(parts: (string | number | undefined | null)[]): string {
  const cleaned = parts
    .filter((p): p is string | number => p !== undefined && p !== null && String(p).trim().length > 0)
    .map((p) =>
      String(p)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
    )
    .join('-');

  return `${cleaned || 'spherex-image'}.png`;
}
