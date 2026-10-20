// Android 13.6.0–13.13.0 exposes the object through a Java bridge rather than JavaScript.
export function usesNativeInjectedObject(
  platform: string,
  version: string
): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (platform !== 'android' || !match) return false;
  const [, major, minor, patch] = match.map(Number);
  return (
    major === 13 && minor >= 6 && (minor < 13 || (minor === 13 && patch === 0))
  );
}

export function buildInjectedObjectScript(injectedObject: object): string {
  // Serialize the JSON text as a string literal, not a template literal.
  const jsonLiteral = JSON.stringify(JSON.stringify(injectedObject))
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `
    (function() {
      var json = ${jsonLiteral};
      var bridge = (window.ReactNativeWebView = window.ReactNativeWebView || {});
      try {
        Object.defineProperty(bridge, 'injectedObjectJson', {
          value: function() { return json; },
          writable: false,
          configurable: false,
          enumerable: true,
        });
      } catch (e) {
        /* Keep the initialization snapshot if already installed in this document. */
      }
    })();
    true;
  `;
}
