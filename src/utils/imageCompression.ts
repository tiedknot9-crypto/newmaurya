/**
 * High-performance client-side image compression utility.
 * Reduces raw camera / scan uploads (3MB - 10MB) down to optimized JPEG/WebP (50KB - 200KB)
 * maintaining aspect ratio and legibility without hitting browser storage quotas.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.82,
  mimeType: 'image/jpeg',
};

/**
 * Compresses an image File using HTML5 Canvas.
 * Non-image files (e.g. PDFs) are safely read directly as Data URLs without modification.
 */
export async function compressImageFile(
  file: File,
  customOptions?: CompressionOptions
): Promise<string> {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  // If not an image (e.g., application/pdf), read directly
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // If the image is already tiny in dimensions, just re-encode lightly
          if (width > options.maxWidth || height > options.maxHeight) {
            if (width > height) {
              height = Math.round((height * options.maxWidth) / width);
              width = options.maxWidth;
            } else {
              width = Math.round((width * options.maxHeight) / height);
              height = options.maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl); // Safe fallback
            return;
          }

          // Clear with white background in case source had alpha/transparency (prevents black background on JPEG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed data URL
          const compressed = canvas.toDataURL(options.mimeType, options.quality);

          // If compression resulted in smaller size, use it; otherwise fallback to original
          if (compressed.length < rawDataUrl.length) {
            resolve(compressed);
          } else {
            resolve(rawDataUrl);
          }
        } catch (e) {
          console.warn('[ImageCompression] Canvas error, falling back to original:', e);
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => {
        resolve(rawDataUrl); // Fallback on image decode error
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing Base64 Data URL string to shrink localStorage footprints.
 */
export async function compressBase64Image(
  dataUrl: string,
  customOptions?: CompressionOptions
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > options.maxWidth || height > options.maxHeight) {
          if (width > height) {
            height = Math.round((height * options.maxWidth) / width);
            width = options.maxWidth;
          } else {
            width = Math.round((width * options.maxHeight) / height);
            height = options.maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL(options.mimeType, options.quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch (e) {
        console.warn('[ImageCompression] Base64 compression fallback:', e);
        resolve(dataUrl);
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
