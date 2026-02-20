import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * CustomFontSource type for Stripe Connect
 * Matches the type defined in @stripe/stripe-react-native connectTypes
 */
export interface CustomFontSource {
  /**
   * The name to give the font
   */
  family: string;
  /**
   * A valid src value pointing to your custom font file.
   */
  src: string;
  /**
   * A valid font-display value.
   */
  display?: string;
  /**
   * Defaults to `normal`.
   */
  style?: 'normal' | 'italic' | 'oblique';
  /**
   * A valid unicode-range value.
   */
  unicodeRange?: string;
  /**
   * A valid font-weight, as a string.
   */
  weight?: string;
}

// Cache to avoid re-encoding fonts
const fontCache = new Map<string, string>();

/**
 * Loads a font file from the assets and converts it to a base64 data URI
 * @param fontPath - Path to the font file relative to assets/fonts/
 * @param fontFamily - Font family name to use in CSS
 * @returns Promise<CustomFontSource> - Font source object for Stripe Connect
 */
export async function loadCustomFont(
  fontPath: string,
  fontFamily: string
): Promise<CustomFontSource> {
  // Check cache first
  const cacheKey = `${fontFamily}-${fontPath}`;
  if (fontCache.has(cacheKey)) {
    return {
      family: fontFamily,
      src: fontCache.get(cacheKey)!,
      display: 'swap', // Better UX: show fallback font while custom font loads
    };
  }

  try {
    // Map font paths to their static require statements
    // Metro bundler requires static requires for asset bundling
    const fontModules: Record<string, number> = {
      'Handjet-Regular.woff2': require('../../assets/fonts/Handjet-Regular.woff2'),
    };

    const fontModule = fontModules[fontPath];
    if (!fontModule) {
      throw new Error(
        `Font file not found: ${fontPath}. Available fonts: ${Object.keys(fontModules).join(', ')}`
      );
    }

    // Resolve the asset
    const asset = Asset.fromModule(fontModule);

    // Download/cache the asset if needed
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error(`Failed to load font asset: ${fontPath}`);
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: 'base64',
    });

    // Determine MIME type from file extension
    const extension = fontPath.split('.').pop()?.toLowerCase();
    const mimeType = getMimeTypeForFont(extension || '');

    // Create data URI wrapped in url() for CSS @font-face
    const dataUri = `data:${mimeType};base64,${base64}`;
    const cssUrl = `url(${dataUri})`;

    // Cache the result
    fontCache.set(cacheKey, cssUrl);

    return {
      family: fontFamily,
      src: cssUrl,
      display: 'swap',
      weight: 'normal',
      style: 'normal',
    };
  } catch (error) {
    console.error(`Failed to load custom font ${fontPath}:`, error);
    throw error;
  }
}

/**
 * Get MIME type for font file extension
 */
function getMimeTypeForFont(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return mimeTypes[extension] || 'font/ttf';
}

/**
 * Clears the font cache (useful for development/testing)
 */
export function clearFontCache(): void {
  fontCache.clear();
}
