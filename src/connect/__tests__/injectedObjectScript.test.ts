import vm from 'vm';
import { buildInjectedObjectScript } from '../injectedObjectScript';

const ORIGIN = 'https://connect-js.stripe.com';
const PATH = '/v1.0/react_native_webview.html';
const TOKEN = 'f00dfeedf00dfeedf00dfeedf00dfeed';
const AUTH = { token: TOKEN, origin: ORIGIN, path: PATH };
const WRAPPER_LOCATION = { origin: ORIGIN, pathname: PATH };

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
  const page: Page = {
    [BRIDGE]: { postMessage: () => {} },
    location: WRAPPER_LOCATION,
  };
  page.window = page.top = page;
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
    const { page, errors } = runInPage([
      buildInjectedObjectScript(injected, AUTH),
    ]);

    expect(errors).toEqual([]);
    expect(readInjectedObject(page)).toEqual(injected);
    expect(page.executed).toBeUndefined();
  });

  it("keeps its value when react-native-webview's iOS definition runs after it", () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const { page } = runInPage([
      buildInjectedObjectScript(injected, AUTH),
      rnwIOSObjectScript(JSON.stringify(injected)),
    ]);

    expect(readInjectedObject(page)).toEqual(injected);
  });

  it("keeps its value when react-native-webview's Android definition runs after it", () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const json = JSON.stringify(injected);
    const { page } = runInPage([
      androidBeforeContentLoaded(buildInjectedObjectScript(injected, AUTH)),
      rnwAndroidObjectScript(json),
      rnwAndroidObjectScript(json),
    ]);

    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('replaces an earlier react-native-webview definition with a read-only one', () => {
    const injected = initObject({ fontFamily: '"Courier New", monospace' });
    const { page, errors } = runInPage([
      rnwAndroidObjectScript(JSON.stringify(injected)),
      androidBeforeContentLoaded(buildInjectedObjectScript(injected, AUTH)),
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
      buildInjectedObjectScript(first, AUTH),
      buildInjectedObjectScript(second, AUTH),
    ]);

    expect(errors).toEqual([]);
    expect(readInjectedObject(page)).toEqual(first);
  });

  it("without it, react-native-webview's iOS definition corrupts a double-quoted value", () => {
    const json = JSON.stringify(initObject({ fontFamily: '"Segoe UI"' }));
    const { page } = runInPage([rnwIOSObjectScript(json)]);

    expect(() => readInjectedObject(page)).toThrow(SyntaxError);
  });

  it('keeps the existing postMessage bridge', () => {
    const { page } = runInPage([
      buildInjectedObjectScript(initObject({}), AUTH),
    ]);

    expect(typeof page[BRIDGE].postMessage).toBe('function');
  });

  it('creates the bridge object when none exists yet', () => {
    const page: Page = { location: WRAPPER_LOCATION };
    page.window = page.top = page;
    vm.createContext(page);
    vm.runInContext(buildInjectedObjectScript(initObject({}), AUTH), page);

    expect(readInjectedObject(page)).toEqual(initObject({}));
  });
});

describe('buildInjectedObjectScript with bridge authorization', () => {
  const injected = initObject({ fontFamily: '"Courier New", monospace' });
  const script = buildInjectedObjectScript(injected, AUTH);

  const serializePage = (page: Page) =>
    JSON.stringify(page, (key, value) =>
      key === 'window' || key === 'top' ? undefined : value
    );

  // A page at the given location whose original bridge records what it
  // receives.
  function load(
    options: {
      origin?: string;
      pathname?: string;
      isTop?: boolean;
      bridge?: object;
    } = {},
    scripts: string[] = [script]
  ) {
    const received: string[] = [];
    const original = options.bridge ?? {
      postMessage: (data: string) => received.push(data),
    };
    const page: Page = {
      location: {
        origin: options.origin ?? ORIGIN,
        pathname: options.pathname ?? PATH,
      },
      [BRIDGE]: original,
    };
    page.window = page;
    page.top = options.isTop === false ? {} : page;
    vm.createContext(page);
    scripts.forEach((s) => vm.runInContext(s, page));
    return { page, received, original };
  }

  it('wraps outgoing messages with the token on the wrapper document', () => {
    const { page, received } = load();

    page[BRIDGE].postMessage('{"type":"x"}');

    expect(received.map((m) => JSON.parse(m))).toEqual([
      { token: TOKEN, message: '{"type":"x"}' },
    ]);
    expect(readInjectedObject(page)).toEqual(injected);
    expect(serializePage(page)).not.toContain(TOKEN);
    expect(String(page[BRIDGE].postMessage)).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page).join()).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page[BRIDGE]).sort()).toEqual([
      'injectedObjectJson',
      'postMessage',
    ]);
  });

  it('wraps a bridge whose properties always resolve to the original', () => {
    const received: string[] = [];
    const postMessage = (data: string) => received.push(data);
    const bridge = new Proxy({}, { get: () => postMessage });
    const { page } = load({ bridge });

    page[BRIDGE].postMessage('m');

    expect(received.map((m) => JSON.parse(m))).toEqual([
      { token: TOKEN, message: 'm' },
    ]);
  });

  it('cannot be replaced or modified afterwards', () => {
    const json = JSON.stringify(injected);
    const { page, received } = load({}, [
      androidBeforeContentLoaded(script),
      androidBeforeContentLoaded(script),
      rnwAndroidObjectScript(json),
      rnwAndroidObjectScript(json),
    ]);
    const spy = jest.fn();
    Object.assign(page, { spy });

    vm.runInContext(
      `try { window.${BRIDGE} = { postMessage: spy }; } catch (e) {}
       try { window.${BRIDGE}.postMessage = spy; } catch (e) {}
       try { delete window.${BRIDGE}; } catch (e) {}
       try { Object.defineProperty(window, '${BRIDGE}', { value: { postMessage: spy } }); } catch (e) {}`,
      page
    );
    page[BRIDGE].postMessage('m');

    expect(spy).not.toHaveBeenCalled();
    expect(received.map((m) => JSON.parse(m))).toEqual([
      { token: TOKEN, message: 'm' },
    ]);
    expect(readInjectedObject(page)).toEqual(injected);
  });

  it.each([
    ['a foreign origin', { origin: 'https://evil.example' }],
    ['the wrong path', { pathname: '/other.html' }],
    ['a non-top document', { isTop: false }],
  ])('leaves the page untouched on %s', (_desc, options) => {
    const { page, received, original } = load(options);

    page[BRIDGE].postMessage('{"type":"x"}');

    expect(page[BRIDGE]).toBe(original);
    expect(received).toEqual(['{"type":"x"}']);
    expect(page[BRIDGE].injectedObjectJson).toBeUndefined();
    expect(serializePage(page)).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page).join()).not.toContain(TOKEN);
  });
});
