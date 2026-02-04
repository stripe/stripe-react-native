/**
 * Tests for AnalyticsClient
 */

import { AnalyticsClient } from '../AnalyticsClient';
import { EVENT_NAMES } from '../events';
import type { AnalyticsPayload } from '../events';

// Mock fetch
global.fetch = jest.fn();

describe('AnalyticsClient', () => {
  let analyticsClient: AnalyticsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });

    analyticsClient = new AnalyticsClient({
      sdkVersion: '1.2.3',
      osVersion: '17.0',
      deviceType: 'ios',
      appName: '@stripe/stripe-react-native',
      appVersion: '1.2.3',
    });
  });

  describe('sendEvent', () => {
    it('should POST to correct analytics URL', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_123',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_123',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await analyticsClient.sendEvent(payload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://r.stripe.com/0',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include proper headers', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_123',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_123',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];

      expect(options.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'User-Agent': expect.stringContaining('Stripe/v1'),
        })
      );
    });

    it('should build correct User-Agent header', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_123',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_123',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const userAgent = options.headers['User-Agent'];

      expect(userAgent).toBeDefined();
      expect(userAgent).toBe('Stripe/v1 ios/1.2.3');
    });

    it('should send payload as JSON body', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_456',
        created: 1234567890,
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'android',
        sdk_version: '1.2.3',
        os_version: '14',
        device_type: 'android',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payouts',
        component_instance: 'comp_456',
        event_name: EVENT_NAMES.COMPONENT_VIEWED,
        publishable_key: 'pk_test_123',
        platform_id: 'platform_123',
        merchant_id: 'merchant_123',
        livemode: false,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.event_id).toBe('evt_456');
      expect(sentPayload.created).toBe(1234567890);
      expect(sentPayload.event_name).toBe(EVENT_NAMES.COMPONENT_VIEWED);
      expect(sentPayload.component).toBe('payouts');
      expect(sentPayload.publishable_key).toBe('pk_test_123');
      expect(sentPayload.platform_id).toBe('platform_123');
      expect(sentPayload.merchant_id).toBe('merchant_123');
      expect(sentPayload.livemode).toBe(false);
    });

    it('should merge system info with payload', async () => {
      const client = new AnalyticsClient({
        sdkVersion: '2.0.0',
        osVersion: '18.0',
        deviceType: 'android',
        appName: 'MyApp',
        appVersion: '3.0.0',
      });

      const payload: AnalyticsPayload = {
        event_id: 'evt_789',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'android',
        sdk_version: '1.0.0', // Should be overridden
        os_version: '10', // Should be overridden
        device_type: 'ios', // Should be overridden
        app_name: 'OldApp', // Should be overridden
        app_version: '1.0.0', // Should be overridden
        component: 'payments',
        component_instance: 'comp_789',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await client.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.sdk_version).toBe('2.0.0');
      expect(sentPayload.os_version).toBe('18.0');
      expect(sentPayload.device_type).toBe('android');
      expect(sentPayload.app_name).toBe('MyApp');
      expect(sentPayload.app_version).toBe('3.0.0');
    });

    it('should handle events with event_metadata', async () => {
      const payload: any = {
        event_id: 'evt_meta',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_meta',
        event_name: EVENT_NAMES.COMPONENT_WEB_PAGE_LOADED,
        event_metadata: {
          time_to_load: 1.234,
        },
        time_to_load: 1.234,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.event_metadata).toEqual({
        time_to_load: 1.234,
      });
      expect(sentPayload.time_to_load).toBe(1.234);
    });

    it('should silently handle network errors', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const payload: AnalyticsPayload = {
        event_id: 'evt_error',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_error',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      // Should not throw
      await expect(analyticsClient.sendEvent(payload)).resolves.toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    it('should silently handle HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const payload: AnalyticsPayload = {
        event_id: 'evt_500',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_500',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      // Should not throw
      await expect(analyticsClient.sendEvent(payload)).resolves.toBeUndefined();
    });

    it('should handle optional fields gracefully', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_minimal',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_minimal',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
        // Optional fields intentionally omitted
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.publishable_key).toBeUndefined();
      expect(sentPayload.platform_id).toBeUndefined();
      expect(sentPayload.merchant_id).toBeUndefined();
      expect(sentPayload.livemode).toBeUndefined();
    });
  });

  describe('platform detection', () => {
    it('should use Platform.OS for sdk_platform', async () => {
      // Note: Platform.OS is mocked as 'ios' by default in Jest
      const client = new AnalyticsClient({
        sdkVersion: '1.0.0',
        osVersion: '17.0',
        deviceType: 'ios',
        appName: 'TestApp',
        appVersion: '1.0.0',
      });

      const payload: AnalyticsPayload = {
        event_id: 'evt_platform',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'stripe-connect-react-native',
        sdk_platform: 'android', // Should be overridden with Platform.OS
        sdk_version: '1.0.0',
        os_version: '17.0',
        device_type: 'ios',
        app_name: 'TestApp',
        app_version: '1.0.0',
        component: 'payments',
        component_instance: 'comp_platform',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await client.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      // Platform.OS is 'ios' in test environment
      expect(sentPayload.sdk_platform).toBe('ios');
    });
  });

  describe('constants', () => {
    it('should always use mobile_connect_sdk client_id', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_client',
        created: Date.now(),
        client_id: 'wrong_client', // Should be overridden
        origin: 'stripe-connect-react-native',
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_client',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.client_id).toBe('mobile_connect_sdk');
    });

    it('should always use stripe-connect-react-native origin', async () => {
      const payload: AnalyticsPayload = {
        event_id: 'evt_origin',
        created: Date.now(),
        client_id: 'mobile_connect_sdk',
        origin: 'wrong_origin', // Should be overridden
        sdk_platform: 'ios',
        sdk_version: '1.2.3',
        os_version: '17.0',
        device_type: 'ios',
        app_name: '@stripe/stripe-react-native',
        app_version: '1.2.3',
        component: 'payments',
        component_instance: 'comp_origin',
        event_name: EVENT_NAMES.COMPONENT_CREATED,
      };

      await analyticsClient.sendEvent(payload);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      const sentPayload = JSON.parse(options.body);

      expect(sentPayload.origin).toBe('stripe-connect-react-native');
    });
  });
});
