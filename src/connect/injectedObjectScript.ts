export type BridgeAuth = { token: string; origin: string; path: string };

// Page-side expression that is true only in a document at origin + path.
export function wrapperDocumentCondition(origin: string, path: string): string {
  return `window.location.origin === ${JSON.stringify(origin)} && window.location.pathname === ${JSON.stringify(path)}`;
}

// Builds the script passed as `injectedJavaScriptBeforeContentLoaded`. In the
// Connect wrapper document it replaces `window.ReactNativeWebView` with a
// read-only bridge object that defines `injectedObjectJson()`, which the
// Connect page JSON.parses on startup, and tags outgoing messages.
// react-native-webview's own definition, from `injectedJavaScriptObject`,
// embeds the JSON in a template literal on iOS and on Android from 13.13.1, so
// a double quote, backslash, or backtick in any value corrupts it and the
// component never loads. Here the JSON is a string literal, and the
// replacement ignores later assignments.
// https://github.com/react-native-webview/react-native-webview/issues/3957
// https://github.com/react-native-webview/react-native-webview/issues/3942
export function buildInjectedObjectScript(
  injectedObject: object,
  auth: BridgeAuth
): string {
  // The inner stringify produces the JSON text injectedObjectJson() returns.
  // The outer one turns that text into a JS string literal, escaping quotes,
  // backslashes, and control characters, so the script can embed it verbatim.
  const jsonLiteral = JSON.stringify(JSON.stringify(injectedObject));

  return `
    (function() {
      var json = ${jsonLiteral};
      try {
        if (
          window.top === window &&
          ${wrapperDocumentCondition(auth.origin, auth.path)}
        ) {
          var token = ${JSON.stringify(auth.token)};
          var documentId = Math.random().toString(36).slice(2) + Date.now().toString(36);
          var original = window.ReactNativeWebView;
          var replacement = Object.freeze({
            documentId: documentId,
            postMessage: function(data) {
              original.postMessage(
                JSON.stringify({ token: token, documentId: documentId, message: String(data) })
              );
            },
            injectedObjectJson: function() { return json; },
          });
          Object.defineProperty(window, 'ReactNativeWebView', {
            value: replacement,
            writable: false,
            configurable: false,
            enumerable: true,
          });
        }
      } catch (e) {
        /* Already replaced in this document, or not replaceable: leave it as is. */
      }
    })();
    true;
  `;
}
