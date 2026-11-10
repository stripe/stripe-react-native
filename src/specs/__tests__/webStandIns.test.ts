import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  StripeWebUnsupportedError,
  unsupportedComponent,
  unsupportedModule,
} from '../webUnsupported';

const specsDir = path.join(__dirname, '..');

const expectWebUnsupported = (error: unknown) => {
  expect(error).toMatchObject({
    code: 'WebUnsupported',
    name: 'StripeWebUnsupportedError',
  });
  expect(String((error as Error).message)).toContain('not supported on web');
};

const nativeSpecFiles = fs
  .readdirSync(specsDir)
  .filter(
    (name) =>
      name.startsWith('Native') &&
      name.endsWith('.ts') &&
      !name.endsWith('.web.ts')
  );

describe('Native spec web siblings', () => {
  it('requires a .web.ts stub for every Native*.ts spec', () => {
    const missing = nativeSpecFiles.filter(
      (name) =>
        !fs.existsSync(path.join(specsDir, name.replace(/\.ts$/, '.web.ts')))
    );
    expect(missing).toEqual([]);
  });
});

describe('webUnsupported helpers', () => {
  it('throws StripeWebUnsupportedError from unsupportedModule methods', () => {
    const module = unsupportedModule<{ foo(): void }>('TestModule');
    expect(() => module.foo()).toThrow(StripeWebUnsupportedError);
    try {
      module.foo();
    } catch (error) {
      expect(error).toBeInstanceOf(StripeWebUnsupportedError);
      expect((error as StripeWebUnsupportedError).code).toBe('WebUnsupported');
      expect((error as Error).message).toContain('TestModule.foo()');
    }
  });

  it('throws StripeWebUnsupportedError when an unsupported component mounts', async () => {
    const Component = unsupportedComponent('Probe');
    let captured: unknown;
    class CaptureBoundary extends React.Component<{
      children: React.ReactNode;
    }> {
      state = { ok: true };

      static getDerivedStateFromError() {
        return { ok: false };
      }

      componentDidCatch(error: unknown) {
        captured = error;
      }

      render() {
        return this.state.ok ? this.props.children : null;
      }
    }

    render(
      React.createElement(CaptureBoundary, null, React.createElement(Component))
    );
    await waitFor(() => {
      expect(captured).toBeDefined();
    });
    expectWebUnsupported(captured);
    expect(String((captured as Error).message)).toContain('Probe');
  });
});

describe('Native*.web.ts entries', () => {
  const commandSpecs = new Set([
    'NativeCardField.web.ts',
    'NativeCardForm.web.ts',
    'NativeEmbeddedPaymentElement.web.ts',
  ]);

  nativeSpecFiles.forEach((specFile) => {
    const webFile = specFile.replace(/\.ts$/, '.web.ts');
    const baseName = specFile.replace(/\.ts$/, '');

    it(`loads ${webFile}`, () => {
      const mod = require(`../${baseName}.web`);
      expect(mod).toBeDefined();
    });

    if (commandSpecs.has(webFile)) {
      it(`${webFile} Commands throw on call`, () => {
        const { Commands } = require(`../${baseName}.web`);
        expect(() => Commands.focus()).toThrow(StripeWebUnsupportedError);
      });
    } else if (webFile === 'NativeStripeSdkModule.web.ts') {
      it('NativeStripeSdkModule.web returns inert getConstants', () => {
        const NativeStripeSdk = require('../NativeStripeSdkModule.web').default;
        expect(NativeStripeSdk.getConstants().SYSTEM_INFO.deviceType).toBe(
          'web'
        );
        expect(() => NativeStripeSdk.initialise({})).toThrow(
          StripeWebUnsupportedError
        );
      });
    } else if (webFile === 'NativeOnrampSdkModule.web.ts') {
      it('NativeOnrampSdkModule.web exports null', () => {
        const mod = require('../NativeOnrampSdkModule.web').default;
        expect(mod).toBeNull();
      });
    } else {
      it(`${webFile} default export is a component stub`, () => {
        const mod = require(`../${baseName}.web`);
        expect(typeof mod.default).toBe('function');
      });
    }
  });
});

describe('web call-time error styles', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('initStripe throws StripeWebUnsupportedError', async () => {
    jest.doMock('../../specs/NativeStripeSdkModule', () =>
      jest.requireActual('../../specs/NativeStripeSdkModule.web')
    );
    jest.doMock('../../specs/NativeOnrampSdkModule', () =>
      jest.requireActual('../../specs/NativeOnrampSdkModule.web')
    );
    const { initStripe } = jest.requireActual(
      '../../components/StripeProvider'
    );
    try {
      await initStripe({ publishableKey: 'pk_test' });
      throw new Error('expected initStripe to reject');
    } catch (error) {
      expectWebUnsupported(error);
    }
  });

  it('initPaymentSheet returns { error: StripeWebUnsupportedError }', async () => {
    jest.doMock('../NativeStripeSdkModule', () =>
      jest.requireActual('../NativeStripeSdkModule.web')
    );
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { initPaymentSheet } = jest.requireActual('../../functions');
    const result = await initPaymentSheet({
      merchantDisplayName: 'Test',
    });
    expectWebUnsupported(result.error);
  });
});
