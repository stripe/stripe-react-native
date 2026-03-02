/**
 * Analytics HTTP client for sending events to Stripe backend
 * Matches the Swift iOS SDK's AnalyticsClientV2 user agent format
 */

import { Platform } from 'react-native';
import type { AnalyticsPayload } from './events';

const ANALYTICS_URL = 'https://r.stripe.com/0';
const CLIENT_ID = 'mobile_connect_sdk';
const ORIGIN = 'stripe-connect-react-native';

/**
 * System information for analytics
 */
export interface SystemInfo {
  sdkVersion: string;
  osVersion: string;
  deviceType: string;
  appName: string;
  appVersion: string;
}

/**
 * Analytics client for sending events to Stripe backend
 */
export class AnalyticsClient {
  private systemInfo: SystemInfo;

  constructor(systemInfo: SystemInfo) {
    this.systemInfo = systemInfo;
  }

  /**
   * Send an analytics event to the Stripe backend
   * Silently fails if network request fails - analytics should never break app functionality
   */
  async sendEvent(payload: AnalyticsPayload): Promise<void> {
    try {
      const fullPayload = {
        ...payload,
        client_id: CLIENT_ID,
        origin: ORIGIN,
        sdk_platform: Platform.OS as 'ios' | 'android',
        sdk_version: this.systemInfo.sdkVersion,
        os_version: this.systemInfo.osVersion,
        device_type: this.systemInfo.deviceType,
        app_name: this.systemInfo.appName,
        app_version: this.systemInfo.appVersion,
      };

      await fetch(ANALYTICS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.buildUserAgent(),
        },
        body: JSON.stringify(fullPayload),
      });
    } catch (error) {
      // Silently fail - analytics should never break app functionality
      if (__DEV__) {
        console.warn('[StripeConnect] Analytics event failed:', error);
      }
    }
  }

  /**
   * Build user agent string for analytics requests
   */
  private buildUserAgent(): string {
    const platform = Platform.OS; // 'ios' or 'android'
    return `Stripe/v1 ${platform}/${this.systemInfo.sdkVersion}`;
  }
}
