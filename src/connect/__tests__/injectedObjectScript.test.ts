import { runInNewContext } from 'vm';
import {
  buildInjectedObjectScript,
  usesNativeInjectedObject,
} from '../injectedObjectScript';

describe('buildInjectedObjectScript', () => {
  it.each([
    '"Courier New", Courier, monospace',
    "O'Reilly",
    'C:\\fonts\\custom',
    'literal \\n and \\u0041',
    'line\nend\r\t',
    '`quoted`',
    '${window.executed = true}',
    '`}; window.executed = true; //',
    'a\u2028b\u2029c',
    'ヒラギノ😀',
    '',
  ])('round-trips special characters as data: %p', (value) => {
    const payload = {
      initParams: {
        appearance: { variables: { fontFamily: value } },
        locale: value,
        fonts: [{ family: value, src: value }],
      },
      initComponentProps: { setExample: [value, null, true, 42] },
      appInfo: { applicationId: value, omitted: undefined },
    };
    const window: any = {};
    const script = buildInjectedObjectScript(payload);
    expect(runInNewContext(script, { window })).toBe(true);
    expect(JSON.parse(window.ReactNativeWebView.injectedObjectJson())).toEqual(
      JSON.parse(JSON.stringify(payload))
    );
    expect(window.executed).toBeUndefined();
  });

  it('preserves messaging and the snapshot across repeated installation', () => {
    const postMessage = jest.fn();
    const window = { ReactNativeWebView: { postMessage } };
    const context = { window };
    runInNewContext(buildInjectedObjectScript({ value: 'initial' }), context);
    const bridge = window.ReactNativeWebView as any;
    const getter = bridge.injectedObjectJson;
    runInNewContext(buildInjectedObjectScript({ value: 'updated' }), context);
    // WebView may install a fallback getter after the before-content script.
    runInNewContext(
      'window.ReactNativeWebView.injectedObjectJson = function() { return null; };',
      context
    );
    expect(bridge.injectedObjectJson).toBe(getter);
    expect(JSON.parse(getter())).toEqual({ value: 'initial' });
    expect(bridge.postMessage).toBe(postMessage);

    const nextWindow: any = {};
    runInNewContext(buildInjectedObjectScript({ value: 'updated' }), {
      window: nextWindow,
    });
    nextWindow.ReactNativeWebView.postMessage = postMessage;
    expect(
      JSON.parse(nextWindow.ReactNativeWebView.injectedObjectJson())
    ).toEqual({ value: 'updated' });
    expect(nextWindow.ReactNativeWebView.postMessage).toBe(postMessage);
  });

  it('demonstrates the quote corruption in the original template-literal transport', () => {
    const payload = { fontFamily: '"Courier New", Courier, monospace' };
    const json = JSON.stringify(payload);
    const corrupted = runInNewContext('`' + json + '`');
    expect(() => JSON.parse(corrupted)).toThrow();
  });
});

describe('usesNativeInjectedObject', () => {
  it.each([
    ['13.5.1', false],
    ['13.6.0', true],
    ['13.12.9', true],
    ['13.13.0', true],
    ['13.13.1', false],
    ['13.15.0', false],
    ['13.16.0', false],
    ['14.0.0', false],
    ['13.12.0-beta.1', false],
    ['unknown', false],
  ])('selects the native Android bridge for %s: %s', (version, expected) => {
    expect(usesNativeInjectedObject('android', version)).toBe(expected);
    expect(usesNativeInjectedObject('ios', version)).toBe(false);
  });
});
