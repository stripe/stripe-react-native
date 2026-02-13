/**
 * Tests for ComponentAnalyticsClient
 */

import { ComponentAnalyticsClient } from '../ComponentAnalyticsClient';
import { AnalyticsClient } from '../AnalyticsClient';
import { EVENT_NAMES } from '../events';

// Mock AnalyticsClient
jest.mock('../AnalyticsClient');

describe('ComponentAnalyticsClient', () => {
  let mockAnalyticsClient: jest.Mocked<AnalyticsClient>;
  let componentAnalytics: ComponentAnalyticsClient;
  let sendEventSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAnalyticsClient = new AnalyticsClient({
      sdkVersion: '1.0.0',
      osVersion: '17.0',
      deviceType: 'ios',
      appName: 'test-app',
      appVersion: '1.0.0',
    }) as jest.Mocked<AnalyticsClient>;

    sendEventSpy = jest
      .spyOn(mockAnalyticsClient, 'sendEvent')
      .mockResolvedValue();

    componentAnalytics = new ComponentAnalyticsClient(mockAnalyticsClient, {
      publishableKey: 'pk_test_123',
      platformId: 'platform_123',
      merchantId: 'merchant_123',
      livemode: false,
      component: 'payments',
    });
  });

  describe('constructor', () => {
    it('should initialize with unique component instance ID', () => {
      const client1 = new ComponentAnalyticsClient(mockAnalyticsClient, {
        component: 'payments',
      });
      const client2 = new ComponentAnalyticsClient(mockAnalyticsClient, {
        component: 'payments',
      });

      // Trigger events to capture component_instance values
      client1.logComponentCreated();
      client2.logComponentCreated();

      const call1 = sendEventSpy.mock.calls[0][0] as any;
      const call2 = sendEventSpy.mock.calls[1][0] as any;

      expect(call1.component_instance).toBeDefined();
      expect(call2.component_instance).toBeDefined();
      expect(call1.component_instance).not.toBe(call2.component_instance);
    });

    it('should set loadStart timestamp', () => {
      const beforeCreate = Date.now();
      const client = new ComponentAnalyticsClient(mockAnalyticsClient, {
        component: 'payments',
      });
      const afterCreate = Date.now();

      client.logComponentWebPageLoaded();

      const payload = sendEventSpy.mock.calls[0][0] as any;
      const timeToLoad = payload.time_to_load || 0;
      const estimatedLoadStart = Date.now() - timeToLoad * 1000;

      expect(estimatedLoadStart).toBeGreaterThanOrEqual(beforeCreate);
      // Allow 10ms tolerance for CI timing variability
      expect(estimatedLoadStart).toBeLessThanOrEqual(afterCreate + 10);
    });
  });

  describe('logComponentCreated', () => {
    it('should send component.created event', () => {
      componentAnalytics.logComponentCreated();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(EVENT_NAMES.COMPONENT_CREATED);
      expect(payload.component).toBe('payments');
      expect(payload.publishable_key).toBe('pk_test_123');
      expect(payload.platform_id).toBe('platform_123');
      expect(payload.merchant_id).toBe('merchant_123');
      expect(payload.livemode).toBe(false);
    });

    it('should include event_id and created timestamp', () => {
      componentAnalytics.logComponentCreated();

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.event_id).toBeDefined();
      expect(typeof payload.event_id).toBe('string');
      expect(payload.created).toBeDefined();
      expect(typeof payload.created).toBe('number');
    });
  });

  describe('logComponentViewed', () => {
    it('should send component.viewed event', () => {
      componentAnalytics.logComponentViewed();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.event_name).toBe(EVENT_NAMES.COMPONENT_VIEWED);
    });

    it('should only log once (deduplication)', () => {
      componentAnalytics.logComponentViewed();
      componentAnalytics.logComponentViewed();
      componentAnalytics.logComponentViewed();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('logComponentWebPageLoaded', () => {
    it('should send component.web.page_loaded event with timing', () => {
      componentAnalytics.logComponentWebPageLoaded();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(EVENT_NAMES.COMPONENT_WEB_PAGE_LOADED);
      expect(payload.time_to_load).toBeDefined();
      expect(typeof payload.time_to_load).toBe('number');
      expect(payload.time_to_load).toBeGreaterThanOrEqual(0);
      expect(payload.event_metadata?.time_to_load).toBe(payload.time_to_load);
    });

    it('should capture pageViewId if provided', () => {
      componentAnalytics.logComponentWebPageLoaded('page_view_123');

      // pageViewId is stored internally for later use in logComponentLoaded
      expect(sendEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should only log once (deduplication)', () => {
      componentAnalytics.logComponentWebPageLoaded();
      componentAnalytics.logComponentWebPageLoaded();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should calculate time_to_load in seconds', (done) => {
      // Wait 100ms then log
      setTimeout(() => {
        componentAnalytics.logComponentWebPageLoaded();

        const payload = sendEventSpy.mock.calls[0][0] as any;
        expect(payload.time_to_load).toBeGreaterThanOrEqual(0.1); // At least 100ms = 0.1s
        expect(payload.time_to_load).toBeLessThan(1); // Less than 1 second
        done();
      }, 100);
    });
  });

  describe('logComponentLoaded', () => {
    it('should send component.web.component_loaded event with timing', () => {
      componentAnalytics.logComponentLoaded();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_COMPONENT_LOADED
      );
      expect(payload.time_to_load).toBeDefined();
      expect(typeof payload.time_to_load).toBe('number');
      expect(payload.event_metadata?.time_to_load).toBe(payload.time_to_load);
    });

    it('should include perceived_time_to_load when component was viewed', () => {
      componentAnalytics.logComponentViewed();
      componentAnalytics.logComponentLoaded();

      const payload = sendEventSpy.mock.calls[1][0] as any;
      expect(payload.perceived_time_to_load).toBeDefined();
      expect(typeof payload.perceived_time_to_load).toBe('number');
      expect(payload.event_metadata?.perceived_time_to_load).toBe(
        payload.perceived_time_to_load
      );
    });

    it('should not include perceived_time_to_load when component was not viewed', () => {
      componentAnalytics.logComponentLoaded();

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.perceived_time_to_load).toBeUndefined();
    });

    it('should include pageViewId if page was loaded first', () => {
      componentAnalytics.logComponentWebPageLoaded('page_view_456');
      componentAnalytics.logComponentLoaded();

      const payload = sendEventSpy.mock.calls[1][0] as any;
      expect(payload.page_view_id).toBe('page_view_456');
      expect(payload.event_metadata?.page_view_id).toBe('page_view_456');
    });

    it('should only log once (deduplication)', () => {
      componentAnalytics.logComponentLoaded();
      componentAnalytics.logComponentLoaded();

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('logPageLoadError', () => {
    it('should send page load error event', () => {
      const error = new Error('Network error');
      componentAnalytics.logPageLoadError(error, 'https://example.com');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_ERROR_PAGE_LOAD
      );
      expect(payload.error_message).toBe('Network error');
      expect(payload.error_domain).toBe('Error');
      expect(payload.url).toBe('https://example.com');
      expect(payload.event_metadata?.error_message).toBe('Network error');
      expect(payload.event_metadata?.url).toBe('https://example.com');
    });

    it('should work without URL', () => {
      const error = new Error('Unknown error');
      componentAnalytics.logPageLoadError(error);

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.url).toBeUndefined();
    });
  });

  describe('logUnexpectedNavigation', () => {
    it('should send unexpected navigation event', () => {
      componentAnalytics.logUnexpectedNavigation('https://malicious.com');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_NAVIGATION
      );
      expect(payload.url).toBe('https://malicious.com');
      expect(payload.event_metadata?.url).toBe('https://malicious.com');
    });
  });

  describe('logUnexpectedLoadErrorType', () => {
    it('should send unexpected load error type event', () => {
      componentAnalytics.logUnexpectedLoadErrorType('SSL_ERROR');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_LOAD_ERROR_TYPE
      );
      expect(payload.error_type).toBe('SSL_ERROR');
      expect(payload.event_metadata?.error_type).toBe('SSL_ERROR');
    });
  });

  describe('logUnrecognizedSetter', () => {
    it('should send unrecognized setter warning', () => {
      componentAnalytics.logUnrecognizedSetter('unknownFunction');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_WARN_UNRECOGNIZED_SETTER
      );
      expect(payload.setter_name).toBe('unknownFunction');
      expect(payload.event_metadata?.setter_name).toBe('unknownFunction');
    });
  });

  describe('logDeserializeMessageError', () => {
    it('should send deserialize message error event', () => {
      const error = new Error('Invalid JSON');
      componentAnalytics.logDeserializeMessageError('paymentUpdate', error);

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(
        EVENT_NAMES.COMPONENT_WEB_ERROR_DESERIALIZE_MESSAGE
      );
      expect(payload.message_name).toBe('paymentUpdate');
      expect(payload.error_message).toBe('Invalid JSON');
      expect(payload.event_metadata?.message_name).toBe('paymentUpdate');
      expect(payload.event_metadata?.error_message).toBe('Invalid JSON');
    });
  });

  describe('authenticated web view events', () => {
    describe('logAuthenticatedWebViewOpened', () => {
      it('should send authenticated web view opened event', () => {
        componentAnalytics.logAuthenticatedWebViewOpened('auth_123');

        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        const payload = sendEventSpy.mock.calls[0][0] as any;

        expect(payload.event_name).toBe(
          EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_OPENED
        );
        expect(payload.id).toBe('auth_123');
        expect(payload.event_metadata?.id).toBe('auth_123');
      });
    });

    describe('logAuthenticatedWebViewCanceled', () => {
      it('should send authenticated web view canceled event', () => {
        componentAnalytics.logAuthenticatedWebViewCanceled('auth_123');

        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        const payload = sendEventSpy.mock.calls[0][0] as any;

        expect(payload.event_name).toBe(
          EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_CANCELED
        );
        expect(payload.id).toBe('auth_123');
      });
    });

    describe('logAuthenticatedWebViewRedirected', () => {
      it('should send authenticated web view redirected event', () => {
        componentAnalytics.logAuthenticatedWebViewRedirected('auth_123');

        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        const payload = sendEventSpy.mock.calls[0][0] as any;

        expect(payload.event_name).toBe(
          EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_REDIRECTED
        );
        expect(payload.id).toBe('auth_123');
      });
    });

    describe('logAuthenticatedWebViewError', () => {
      it('should send authenticated web view error event', () => {
        const error = new Error('Auth failed');
        componentAnalytics.logAuthenticatedWebViewError('auth_123', error);

        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        const payload = sendEventSpy.mock.calls[0][0] as any;

        expect(payload.event_name).toBe(
          EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_ERROR
        );
        expect(payload.id).toBe('auth_123');
        expect(payload.error_message).toBe('Auth failed');
      });
    });
  });

  describe('logClientError', () => {
    it('should send client error event with full details', () => {
      const error = new Error('Client crashed');
      componentAnalytics.logClientError(error, 'EmbeddedComponent.tsx', 123);

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const payload = sendEventSpy.mock.calls[0][0] as any;

      expect(payload.event_name).toBe(EVENT_NAMES.CLIENT_ERROR);
      expect(payload.error_message).toBe('Client crashed');
      expect(payload.error_domain).toBe('Error');
      expect(payload.file).toBe('EmbeddedComponent.tsx');
      expect(payload.line).toBe(123);
      expect(payload.event_metadata?.error_message).toBe('Client crashed');
      expect(payload.event_metadata?.file).toBe('EmbeddedComponent.tsx');
      expect(payload.event_metadata?.line).toBe(123);
    });

    it('should work without file and line', () => {
      const error = new Error('Generic error');
      componentAnalytics.logClientError(error);

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.file).toBeUndefined();
      expect(payload.line).toBeUndefined();
    });
  });

  describe('common fields', () => {
    it('should include all config fields in events', () => {
      const client = new ComponentAnalyticsClient(mockAnalyticsClient, {
        publishableKey: 'pk_live_abc',
        platformId: 'platform_xyz',
        merchantId: 'merchant_xyz',
        livemode: true,
        component: 'payouts',
      });

      client.logComponentCreated();

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.publishable_key).toBe('pk_live_abc');
      expect(payload.platform_id).toBe('platform_xyz');
      expect(payload.merchant_id).toBe('merchant_xyz');
      expect(payload.livemode).toBe(true);
      expect(payload.component).toBe('payouts');
    });

    it('should work with minimal config', () => {
      const client = new ComponentAnalyticsClient(mockAnalyticsClient, {
        component: 'payments',
      });

      client.logComponentCreated();

      const payload = sendEventSpy.mock.calls[0][0] as any;
      expect(payload.publishable_key).toBeUndefined();
      expect(payload.platform_id).toBeUndefined();
      expect(payload.merchant_id).toBeUndefined();
      expect(payload.livemode).toBeUndefined();
      expect(payload.component).toBe('payments');
    });

    it('should generate unique event_id for each event', () => {
      componentAnalytics.logComponentCreated();
      componentAnalytics.logComponentViewed();

      const payload1 = sendEventSpy.mock.calls[0][0] as any;
      const payload2 = sendEventSpy.mock.calls[1][0] as any;

      expect(payload1.event_id).toBeDefined();
      expect(payload2.event_id).toBeDefined();
      expect(payload1.event_id).not.toBe(payload2.event_id);
    });

    it('should use same component_instance for all events', () => {
      componentAnalytics.logComponentCreated();
      componentAnalytics.logComponentViewed();
      componentAnalytics.logComponentLoaded();

      const payload1 = sendEventSpy.mock.calls[0][0] as any;
      const payload2 = sendEventSpy.mock.calls[1][0] as any;
      const payload3 = sendEventSpy.mock.calls[2][0] as any;

      expect(payload1.component_instance).toBeDefined();
      expect(payload1.component_instance).toBe(payload2.component_instance);
      expect(payload2.component_instance).toBe(payload3.component_instance);
    });
  });

  describe('timing calculations', () => {
    it('should calculate perceived_time_to_load correctly', (done) => {
      componentAnalytics.logComponentViewed();

      setTimeout(() => {
        componentAnalytics.logComponentLoaded();

        const payload = sendEventSpy.mock.calls[1][0] as any;
        expect(payload.perceived_time_to_load).toBeGreaterThanOrEqual(0.04); // At least 40ms
        // perceived_time_to_load should be less than or equal to time_to_load
        expect(payload.perceived_time_to_load).toBeLessThanOrEqual(
          (payload.time_to_load || 0) + 0.01 // Allow 10ms tolerance
        );
        done();
      }, 50);
    });

    it('should measure time from construction to page load', (done) => {
      setTimeout(() => {
        componentAnalytics.logComponentWebPageLoaded();

        const payload = sendEventSpy.mock.calls[0][0] as any;
        expect(payload.time_to_load).toBeGreaterThanOrEqual(0.04); // At least 40ms
        done();
      }, 50);
    });
  });
});
