/**
 * Component Analytics Client for tracking Connect component events
 * Matches the Swift iOS SDK's ComponentAnalyticsClient implementation
 */

import { AnalyticsClient } from './AnalyticsClient';
import {
  EVENT_NAMES,
  type AnalyticsPayload,
  type CommonAnalyticsFields,
  type ConnectAnalyticsEvent,
} from './events';

/**
 * Configuration for ComponentAnalyticsClient
 */
export interface ComponentAnalyticsConfig {
  publishableKey?: string;
  platformId?: string;
  merchantId?: string;
  livemode?: boolean;
  component: string;
}

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  /* eslint-disable no-bitwise */
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  /* eslint-enable no-bitwise */
}

/**
 * Component Analytics Client for tracking lifecycle, web view, and error events
 */
export class ComponentAnalyticsClient {
  private analyticsClient: AnalyticsClient;
  private config: ComponentAnalyticsConfig;
  private componentInstance: string;
  private pageViewId?: string;
  private loadStart: number;
  private componentFirstViewedTime?: number;
  private loggedPageLoaded: boolean = false;
  private loggedComponentLoaded: boolean = false;

  constructor(
    analyticsClient: AnalyticsClient,
    config: ComponentAnalyticsConfig
  ) {
    this.analyticsClient = analyticsClient;
    this.config = config;
    this.componentInstance = generateUUID();
    this.loadStart = Date.now();
  }

  /**
   * Build common fields for all events
   */
  private buildCommonFields(): CommonAnalyticsFields {
    return {
      event_id: generateUUID(),
      created: Date.now(),
      client_id: 'mobile_connect_sdk',
      origin: 'stripe-connect-react-native',
      sdk_platform: 'ios' as 'ios' | 'android',
      sdk_version: '',
      os_version: '',
      device_type: '',
      app_name: '',
      app_version: '',
      publishable_key: this.config.publishableKey,
      platform_id: this.config.platformId,
      merchant_id: this.config.merchantId,
      livemode: this.config.livemode,
      component: this.config.component,
      component_instance: this.componentInstance,
    };
  }

  /**
   * Send an analytics event
   */
  private async log(event: ConnectAnalyticsEvent): Promise<void> {
    const payload: AnalyticsPayload = {
      ...this.buildCommonFields(),
      ...event,
    };

    await this.analyticsClient.sendEvent(payload);
  }

  /**
   * Log component created event
   */
  logComponentCreated(): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_CREATED,
    });
  }

  /**
   * Log component viewed event (first time component becomes visible)
   */
  logComponentViewed(): void {
    if (this.componentFirstViewedTime) {
      return;
    }

    this.componentFirstViewedTime = Date.now();
    this.log({
      event_name: EVENT_NAMES.COMPONENT_VIEWED,
    });
  }

  /**
   * Log web page loaded event
   */
  logComponentWebPageLoaded(pageViewId?: string): void {
    if (this.loggedPageLoaded) {
      return;
    }

    this.loggedPageLoaded = true;
    if (pageViewId) {
      this.pageViewId = pageViewId;
    }

    const timeToLoad = (Date.now() - this.loadStart) / 1000;

    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_PAGE_LOADED,
      event_metadata: {
        time_to_load: timeToLoad,
      },
      time_to_load: timeToLoad,
    });
  }

  /**
   * Log component loaded event (Connect JS fully initialized)
   */
  logComponentLoaded(): void {
    if (this.loggedComponentLoaded) {
      return;
    }

    this.loggedComponentLoaded = true;

    const timeToLoad = (Date.now() - this.loadStart) / 1000;
    const perceivedTimeToLoad = this.componentFirstViewedTime
      ? (Date.now() - this.componentFirstViewedTime) / 1000
      : undefined;

    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_COMPONENT_LOADED,
      event_metadata: {
        page_view_id: this.pageViewId,
        time_to_load: timeToLoad,
        perceived_time_to_load: perceivedTimeToLoad,
      },
      page_view_id: this.pageViewId,
      time_to_load: timeToLoad,
      perceived_time_to_load: perceivedTimeToLoad,
    });
  }

  /**
   * Log page load error
   */
  logPageLoadError(error: Error, url?: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_ERROR_PAGE_LOAD,
      event_metadata: {
        error_message: error.message,
        error_domain: error.name,
        url,
      },
      error_message: error.message,
      error_domain: error.name,
      url,
    });
  }

  /**
   * Log unexpected navigation error
   */
  logUnexpectedNavigation(url?: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_NAVIGATION,
      event_metadata: {
        url,
      },
      url,
    });
  }

  /**
   * Log unexpected load error type
   */
  logUnexpectedLoadErrorType(errorType: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_LOAD_ERROR_TYPE,
      event_metadata: {
        error_type: errorType,
      },
      error_type: errorType,
    });
  }

  /**
   * Log unrecognized setter function warning
   */
  logUnrecognizedSetter(setterName: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_WARN_UNRECOGNIZED_SETTER,
      event_metadata: {
        setter_name: setterName,
      },
      setter_name: setterName,
    });
  }

  /**
   * Log message deserialization error
   */
  logDeserializeMessageError(messageName: string, error: Error): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_WEB_ERROR_DESERIALIZE_MESSAGE,
      event_metadata: {
        message_name: messageName,
        error_message: error.message,
      },
      message_name: messageName,
      error_message: error.message,
    });
  }

  /**
   * Log authenticated web view opened
   */
  logAuthenticatedWebViewOpened(id: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_OPENED,
      event_metadata: {
        id,
      },
      id,
    });
  }

  /**
   * Log authenticated web view canceled
   */
  logAuthenticatedWebViewCanceled(id: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_CANCELED,
      event_metadata: {
        id,
      },
      id,
    });
  }

  /**
   * Log authenticated web view redirected
   */
  logAuthenticatedWebViewRedirected(id: string): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_REDIRECTED,
      event_metadata: {
        id,
      },
      id,
    });
  }

  /**
   * Log authenticated web view error
   */
  logAuthenticatedWebViewError(id: string, error: Error): void {
    this.log({
      event_name: EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_ERROR,
      event_metadata: {
        id,
        error_message: error.message,
      },
      id,
      error_message: error.message,
    });
  }

  /**
   * Log client error (catch-all for mobile client errors)
   */
  logClientError(error: Error, file?: string, line?: number): void {
    this.log({
      event_name: EVENT_NAMES.CLIENT_ERROR,
      event_metadata: {
        error_message: error.message,
        error_domain: error.name,
        file,
        line,
      },
      error_message: error.message,
      error_domain: error.name,
      file,
      line,
    });
  }
}
