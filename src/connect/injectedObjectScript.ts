// Builds the script passed as `injectedJavaScriptBeforeContentLoaded`. It
// defines `window.ReactNativeWebView.injectedObjectJson()`, which the Connect
// page JSON.parses on startup. react-native-webview's own definition, from
// `injectedJavaScriptObject`, embeds the JSON in a template literal on iOS and
// on Android from 13.13.1, so a double quote, backslash, or backtick in any
// value corrupts it and the component never loads. Here the JSON is a string
// literal, and the property is read-only: it replaces an earlier assignment by
// react-native-webview and ignores later ones.
// https://github.com/react-native-webview/react-native-webview/issues/3957
// https://github.com/react-native-webview/react-native-webview/issues/3942
export function buildInjectedObjectScript(injectedObject: object): string {
  // JSON.stringify of a string is a valid JS string literal; U+2028 and U+2029
  // are also escaped for pre-ES2019 engines.
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
        /* Already defined, e.g. by an earlier run in this document: keep it. */
      }
    })();
    true;
  `;
}
