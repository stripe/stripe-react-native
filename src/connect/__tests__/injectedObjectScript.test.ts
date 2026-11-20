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

describe('buildInjectedObjectScript with bridge authorization', () => {
  const ORIGIN = 'https://connect-js.stripe.com';
  const PATH = '/v1.0/react_native_webview.html';
  const TOKEN = 'f00dfeedf00dfeedf00dfeedf00dfeed';
  const injected = initObject({ fontFamily: '"Courier New", monospace' });
  const script = buildInjectedObjectScript(injected, {
    token: TOKEN,
    origin: ORIGIN,
    path: PATH,
  });

  type Options = {
    origin?: string;
    pathname?: string;
    isTop?: boolean;
    bridge?: object;
    wrap?: (script: string) => string;
  };

  const serializePage = (page: Page) =>
    JSON.stringify(page, (key, value) =>
      key === 'window' || key === 'top' ? undefined : value
    );

  // A top-level (or not) page at the given location whose original bridge
  // records what it receives.
  function load(options: Options = {}, scripts: string[] = [script]) {
    const received: string[] = [];
    const bridge = options.bridge ?? {
      postMessage: (data: string) => received.push(data),
    };
    const page: Page = {
      location: {
        origin: options.origin ?? ORIGIN,
        pathname: options.pathname ?? PATH,
      },
      [BRIDGE]: bridge,
    };
    page.window = page;
    page.top = options.isTop === false ? {} : page;
    vm.createContext(page);
    const errors: string[] = [];
    for (const s of scripts) {
      try {
        vm.runInContext(options.wrap ? options.wrap(s) : s, page);
      } catch (error) {
        errors.push(String(error));
      }
    }
    return { page, received, errors };
  }

  it('wraps outgoing messages with the token on the wrapper document', () => {
    const { page, received, errors } = load();

    page[BRIDGE].postMessage('{"type":"x"}');

    expect(errors).toEqual([]);
    expect(received).toHaveLength(1);
    const envelope = JSON.parse(received[0]!);
    expect(envelope.token).toMatch(/^[0-9a-f]{32}$/);
    expect(envelope).toEqual({ token: TOKEN, message: '{"type":"x"}' });
  });

  it('keeps serving the init object from the replacement bridge', () => {
    const { page } = load();

    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('works when wrapped like Android does', () => {
    const { page, received } = load({
      wrap: androidBeforeContentLoaded,
    });

    page[BRIDGE].postMessage('m');

    expect(JSON.parse(received[0]!).token).toBe(TOKEN);
    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('wraps a bridge whose properties always resolve to the original', () => {
    const received: string[] = [];
    const postMessage = (data: string) => received.push(data);
    const bridge = new Proxy({}, { get: () => postMessage });
    const { page } = load({ bridge });

    page[BRIDGE].postMessage('m');

    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0]!)).toEqual({ token: TOKEN, message: 'm' });
  });

  it('stringifies non-string messages', () => {
    const { page, received } = load();

    page[BRIDGE].postMessage(42);

    expect(JSON.parse(received[0]!).message).toBe('42');
  });

  it('cannot be replaced or modified afterwards', () => {
    const { page, received } = load();
    const spy = jest.fn();

    vm.runInContext(
      `try { window.${BRIDGE} = { postMessage: spy }; } catch (e) {}
       try { window.${BRIDGE}.postMessage = spy; } catch (e) {}
       try { delete window.${BRIDGE}; } catch (e) {}
       try { Object.defineProperty(window, '${BRIDGE}', { value: { postMessage: spy } }); } catch (e) {}`,
      Object.assign(page, { spy })
    );
    page[BRIDGE].postMessage('m');

    expect(spy).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0]!).token).toBe(TOKEN);
  });

  it('does not wrap twice when run again in the same page', () => {
    const { page, received } = load({}, [script, script]);

    page[BRIDGE].postMessage('m');

    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0]!)).toEqual({ token: TOKEN, message: 'm' });
  });

  it.each([
    ['a foreign origin', { origin: 'https://evil.example' }],
    ['the wrong path', { pathname: '/other.html' }],
    ['http on the same host', { origin: 'http://connect-js.stripe.com' }],
    ['a non-top document', { isTop: false }],
  ])('leaves messages untouched on %s', (_desc, options) => {
    const { page, received, errors } = load(options);

    page[BRIDGE].postMessage('{"type":"x"}');

    expect(errors).toEqual([]);
    expect(received).toEqual(['{"type":"x"}']);
    expect(readInjectedObject(page)).toEqual(injected);
    expect(serializePage(page)).not.toContain(TOKEN);
    expect(String(page[BRIDGE].postMessage)).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page).join()).not.toContain(TOKEN);
  });

  it('does not throw when the page has no location', () => {
    const page: Page = { [BRIDGE]: { postMessage: () => {} } };
    page.window = page;
    vm.createContext(page);

    expect(() => vm.runInContext(script, page)).not.toThrow();
    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('does not throw when reading the location throws', () => {
    const page: Page = { [BRIDGE]: { postMessage: () => {} } };
    Object.defineProperty(page, 'location', {
      get() {
        throw new Error('no location');
      },
    });
    page.window = page;
    page.top = page;
    vm.createContext(page);

    expect(() => vm.runInContext(script, page)).not.toThrow();
    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('survives the Android object re-assignment running twice', () => {
    const json = JSON.stringify(injected);
    const { page, received } = load({}, [
      androidBeforeContentLoaded(script),
      rnwAndroidObjectScript(json),
      rnwAndroidObjectScript(json),
    ]);

    page[BRIDGE].postMessage('m');

    expect(JSON.parse(received[0]!)).toEqual({ token: TOKEN, message: 'm' });
    expect(readInjectedObject(page)).toEqual(injected);
  });

  it('keeps the token out of the page', () => {
    const { page } = load();

    expect(serializePage(page)).not.toContain(TOKEN);
    expect(String(page[BRIDGE].postMessage)).not.toContain(TOKEN);
    expect(String(page[BRIDGE].injectedObjectJson)).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page).join()).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page[BRIDGE]).sort()).toEqual([
      'injectedObjectJson',
      'postMessage',
    ]);
  });

  it('falls back to a plain definition when the bridge cannot be replaced', () => {
    const received: string[] = [];
    const page: Page = {
      location: { origin: ORIGIN, pathname: PATH },
    };
    Object.defineProperty(page, BRIDGE, {
      value: { postMessage: (data: string) => received.push(data) },
      configurable: false,
      writable: false,
    });
    page.window = page;
    page.top = page;
    vm.createContext(page);

    expect(() => vm.runInContext(script, page)).not.toThrow();
    expect(readInjectedObject(page)).toEqual(injected);
    page[BRIDGE].postMessage('m');
    expect(received).toEqual(['m']);
    expect(serializePage(page)).not.toContain(TOKEN);
    expect(String(page[BRIDGE].postMessage)).not.toContain(TOKEN);
    expect(Object.getOwnPropertyNames(page).join()).not.toContain(TOKEN);
  });
});
