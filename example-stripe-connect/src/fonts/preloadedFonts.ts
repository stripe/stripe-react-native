import { loadCustomFont, type CustomFontSource } from '../utils/fontLoader';

// Preload font at module initialization (when this file is imported)
let customFont: CustomFontSource | null = null;

// Load font immediately (async, but fire-and-forget)
loadCustomFont('Handjet-Regular.woff2', 'Handjet-Regular')
  .then((font) => {
    customFont = font;
    console.log('[Fonts] Custom font preloaded:', font.family);
  })
  .catch((error) => {
    console.error('[Fonts] Failed to preload custom font:', error);
    // Continue without custom font - app will use fallback fonts
  });

/**
 * Get the preloaded custom font.
 * Returns null if font hasn't loaded yet or failed to load.
 */
export function getCustomFont(): CustomFontSource | null {
  return customFont;
}
