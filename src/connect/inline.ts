const MAX_INLINE_HEIGHT = 10000;

function clampInlineHeight(height: unknown): number | undefined {
  if (typeof height !== 'number' || !Number.isFinite(height)) return undefined;
  return Math.min(MAX_INLINE_HEIGHT, Math.max(0, height));
}

export function parseComponentHeightChanged(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') return undefined;
  return clampInlineHeight((data as { height?: unknown }).height);
}

export function parseSheetChanged(
  data: unknown
): { sheetId: string; height: number; dismissible: boolean } | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { sheetId, height, dismissible } = data as {
    sheetId?: unknown;
    height?: unknown;
    dismissible?: unknown;
  };
  const clampedHeight = clampInlineHeight(height);
  if (typeof sheetId !== 'string' || clampedHeight === undefined) {
    return undefined;
  }
  if (dismissible !== undefined && typeof dismissible !== 'boolean') {
    return undefined;
  }
  return { sheetId, height: clampedHeight, dismissible: dismissible ?? true };
}

// Changes whenever react-native-webview reinstalls its scripts, so the native message filter is reinstalled too.
export function scriptsRevision(script: string): number {
  let hash = 0;
  for (let i = 0; i < script.length; i++) {
    hash = (hash * 31 + script.charCodeAt(i)) % 2147483647;
  }
  return hash;
}
