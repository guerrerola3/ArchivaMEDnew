import * as ImageManipulator from "expo-image-manipulator";

/**
 * Comprime una imagen para almacenamiento optimizado
 * Reduce el tamaño a 800x1067 (calidad media) para balance entre calidad y tamaño
 */
export async function compressImageForStorage(base64: string): Promise<string> {
  try {
    // Create a temporary URI from base64
    const tempUri = `data:image/jpeg;base64,${base64}`;

    // Use ImageManipulator to resize and compress
    // 800x1067 es una buena resolución para documentos (calidad media)
    const result = await ImageManipulator.manipulateAsync(tempUri, [
      { resize: { width: 800, height: 1067 } },
    ]);

    if (result.base64) {
      // Calculate size reduction
      const originalSize = base64.length;
      const compressedSize = result.base64.length;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(0);
      console.log(
        `[Image Compression] Original: ${(originalSize / 1024).toFixed(1)}KB → Compressed: ${(compressedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`
      );
      return result.base64;
    }
    return base64; // Fallback to original if compression fails
  } catch (e) {
    console.warn("[Image Compression] Failed to compress image, using original:", e);
    return base64; // Fallback to original on error
  }
}

/**
 * Comprime una imagen para OCR (extracción de datos)
 * Reduce el tamaño a 1200x1600 para mantener legibilidad del texto
 */
export async function compressImageForOCR(base64: string): Promise<string> {
  try {
    // Create a temporary URI from base64
    const tempUri = `data:image/jpeg;base64,${base64}`;

    // Use ImageManipulator to resize and compress
    const result = await ImageManipulator.manipulateAsync(tempUri, [
      { resize: { width: 1200, height: 1600 } }, // Reduce to max 1200x1600
    ]);

    if (result.base64) {
      // Calculate size reduction
      const originalSize = base64.length;
      const compressedSize = result.base64.length;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(0);
      console.log(
        `[OCR Compression] Original: ${(originalSize / 1024).toFixed(1)}KB → Compressed: ${(compressedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`
      );
      return result.base64;
    }
    return base64; // Fallback to original if compression fails
  } catch (e) {
    console.warn("[OCR Compression] Failed to compress image, using original:", e);
    return base64; // Fallback to original on error
  }
}
