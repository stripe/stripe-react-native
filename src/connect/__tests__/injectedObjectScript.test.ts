import vm from 'vm';
import { buildInjectedObjectScript } from '../injectedObjectScript';

const BRIDGE = 'ReactNativeWebView';

// react-native-webview's iOS definition from `injectedJavaScriptObject`
// (apple/RNCWebViewImpl.m, setInjectedJavaScriptObject), added after
// `injectedJavaScriptBeforeContentLoaded`.
const rnwIOSObjectScript = (json: string) =>
  `window.${BRIDGE} = window.${BRIDGE} || {};` +
  `window.${BRIDGE}.injectedObjectJson = function () {` +
  `  return \`${json}\`;` +
  `};`;

// The same on Android from 13.13.1 (RNCWebView.java, injectJavascriptObject).
// It runs after `injectedJavaScriptBeforeContentLoaded` on page start, and
// again when the prop changes or after `injectedJavaScript`.
const rnwAndroidObjectScript = (json: string) =>
  `(function(){\n` +
  `    window.${BRIDGE} = window.${BRIDGE} || {};\n` +
  `    window.${BRIDGE}.injectedObjectJson = function () { return \`${json}\`; };\n` +
  `})();`;

// Android wraps `injectedJavaScriptBeforeContentLoaded` like this.
const androidBeforeContentLoaded = (script: string) =>
  `(function() {\n${script};\n})();`;

type Page = { [key: string]: any };

// Runs scripts in a fresh page-like context. A script that throws is recorded,
// not rethrown.
function runInPage(scripts: string[]): { page: Page; errors: string[] } {
  const page: Page = { [BRIDGE]: { postMessage: () => {} } };
  page.window = page;
  vm.createContext(page);
  const errors: string[] = [];
  for (const script of scripts) {
    try {
      vm.runInContext(script, page);
    } catch (error) {
      errors.push(String(error));
    }
  }
  return { page, errors };
}

// What the Connect page does on startup.
const readInjectedObject = (page: Page) =>
  JSON.parse(page[BRIDGE].injectedObjectJson() ?? '{}');

const initObject = (variables: Record<string, unknown>) => ({
  initParams: {
    appearance: { variables: { colorPrimary: '#635BFF', ...variables } },
    locale: 'en',
  },
  initComponentProps: {},
  appInfo: { applicationId: undefined },
});

describe('buildInjectedObjectScript', () => {
  const difficultValues: [string, string][] = [
    ['double-quoted font family', '"Courier New", Courier, monospace'],
    ['apostrophe inside double quotes', `"O'Reilly Sans", "Segoe UI", serif`],
    ['backslash', 'C:\\fonts\\custom'],
    ['newline and tab', 'line one\nline two\tend'],
    ['backtick', 'a `quoted` word'],
    ['template substitution', '${globalThis.executed = true}'],
    ['line and paragraph separators', 'a\u2028b\u2029c'],
    ['non-ASCII', 'Noto Sans JP, ヒラギノ角ゴ, 😀'],
  ];

  it.each(difficultValues)('round-trips a %s', (_label, value) => {
    const injected = initObject({ fontFamily: value });
    const { page, errors } = runInPage([buildInjectedObjectScript(injected)]);

    expect(errors).toEqual([]);
    expect(readInjectedObject(page)).toEqual(injected);
    expect(page.executed).toBeUndefined();
  });

  it("keeps its value when react-native-webview's iOS definition runs after it", () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const { page } = runInPage([
      buildInjectedObjectScript(injected),
      rnwIOSObjectScript(JSON.stringify(injected)),
    ]);

    expect(readInjectedObject(page)).toEqual(injected);
  });

  it("keeps its value when react-native-webview's Android definition runs after it", () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const json = JSON.stringify(injected);
    const { page } = runInPage([
      androidBeforeContentLoaded(buildInjectedObjectScript(injected)),
      rnwAndroidObjectScript(json),
      rnwAndroidObjectScript(json),
    ]);

    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('replaces an earlier react-native-webview definition with a read-only one', () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const { page, errors } = runInPage([
      rnwAndroidObjectScript(JSON.stringify(injected)),
      androidBeforeContentLoaded(buildInjectedObjectScript(injected)),
    ]);

    expect(errors).toEqual([]);
    expect(readInjectedObject(page)).toEqual(injected);
    expect(
      Object.getOwnPropertyDescriptor(page[BRIDGE], 'injectedObjectJson')
    ).toMatchObject({ writable: false, configurable: false });
  });

  it('keeps the first definition when it runs twice in one page', () => {
    const first = initObject({ fontFamily: '"First", serif' });
    const second = initObject({ fontFamily: '"Second", serif' });
    const { page, errors } = runInPage([
      buildInjectedObjectScript(first),
      buildInjectedObjectScript(second),
    ]);

    expect(errors).toEqual([]);
    expect(readInjectedObject(page)).toEqual(first);
  });

  it('escapes line and paragraph separators', () => {
    const script = buildInjectedObjectScript(
      initObject({ fontFamily: 'a\u2028b\u2029c' })
    );

    expect(script).not.toMatch(/[\u2028\u2029]/);
  });

  it("without it, react-native-webview's iOS definition corrupts a double-quoted value", () => {
    const json = JSON.stringify(initObject({ fontFamily: '"Segoe UI"' }));
    const { page } = runInPage([rnwIOSObjectScript(json)]);

    expect(() => readInjectedObject(page)).toThrow(SyntaxError);
  });

  it('keeps the existing postMessage bridge', () => {
    const { page } = runInPage([buildInjectedObjectScript(initObject({}))]);

    expect(typeof page[BRIDGE].postMessage).toBe('function');
  });

  it('creates the bridge object when none exists yet', () => {
    const page: Page = {};
    page.window = page;
    vm.createContext(page);
    vm.runInContext(buildInjectedObjectScript(initObject({})), page);

    expect(readInjectedObject(page)).toEqual(initObject({}));
  });
});
