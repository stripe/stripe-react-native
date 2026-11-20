export type BridgeAuth = { token: string; origin: string; path: string };

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
// With `auth`, the wrapper document also gets a bridge that tags outgoing
// messages.
export function buildInjectedObjectScript(
  injectedObject: object,
  auth?: BridgeAuth
): string {
  // The inner stringify produces the JSON text injectedObjectJson() returns.
  // The outer one turns that text into a JS string literal, escaping quotes,
  // backslashes, and control characters, so the script can embed it verbatim.
  const jsonLiteral = JSON.stringify(JSON.stringify(injectedObject));

  const authBranch = auth
    ? `
      try {
        if (
          window.top === window &&
          window.location.origin === ${JSON.stringify(auth.origin)} &&
          window.location.pathname === ${JSON.stringify(auth.path)}
        ) {
          var token = ${JSON.stringify(auth.token)};
          var original = window.ReactNativeWebView;
          var replacement = Object.freeze({
            postMessage: function(data) {
              original.postMessage(
                JSON.stringify({ token: token, message: String(data) })
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
          return;
        }
      } catch (e) {
        /* Not replaceable: fall through to the plain definition. */
      }
`
    : '';

  return `
    (function() {
      var json = ${jsonLiteral};${authBranch}
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
