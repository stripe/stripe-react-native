/**
 * Analytics event types for Connect components
 * Matches the Swift iOS SDK implementation
 */

/**
 * Event names matching Swift SDK
 */
export const EVENT_NAMES = {
  COMPONENT_CREATED: 'component.created',
  COMPONENT_VIEWED: 'component.viewed',
  COMPONENT_WEB_PAGE_LOADED: 'component.web.page_loaded',
  COMPONENT_WEB_COMPONENT_LOADED: 'component.web.component_loaded',
  COMPONENT_WEB_ERROR_PAGE_LOAD: 'component.web.error.page_load',
  COMPONENT_WEB_ERROR_UNEXPECTED_NAVIGATION:
    'component.web.error.unexpected_navigation',
  COMPONENT_WEB_ERROR_UNEXPECTED_LOAD_ERROR_TYPE:
    'component.web.error.unexpected_load_error_type',
  COMPONENT_WEB_WARN_UNRECOGNIZED_SETTER:
    'component.web.warn.unrecognized_setter_function',
  COMPONENT_WEB_ERROR_DESERIALIZE_MESSAGE:
    'component.web.error.deserialize_message',
  COMPONENT_AUTHENTICATED_WEB_OPENED: 'component.authenticated_web.opened',
  COMPONENT_AUTHENTICATED_WEB_CANCELED: 'component.authenticated_web.canceled',
  COMPONENT_AUTHENTICATED_WEB_REDIRECTED:
    'component.authenticated_web.redirected',
  COMPONENT_AUTHENTICATED_WEB_ERROR: 'component.authenticated_web.error',
  CLIENT_ERROR: 'client_error',
} as const;

/**
 * Common fields included in all analytics events
 */
export interface CommonAnalyticsFields {
  event_id: string;
  created: number;
  client_id: string;
  origin: string;
  sdk_platform: 'ios' | 'android';
  sdk_version: string;
  os_version: string;
  device_type: string;
  app_name: string;
  app_version: string;
  publishable_key?: string;
  platform_id?: string;
  merchant_id?: string;
  livemode?: boolean;
  component: string;
  component_instance: string;
}

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  event_name: string;
  event_metadata?: Record<string, any>;
}

/**
 * Component created event
 */
export interface ComponentCreatedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_CREATED;
}

/**
 * Component viewed event (first time component becomes visible)
 */
export interface ComponentViewedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_VIEWED;
}

/**
 * Web page loaded event (HTML page finished loading)
 */
export interface ComponentWebPageLoadedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_PAGE_LOADED;
  event_metadata: {
    time_to_load: number;
  };
  time_to_load: number;
}

/**
 * Component loaded event (Connect JS fully initialized)
 */
export interface ComponentWebComponentLoadedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_COMPONENT_LOADED;
  event_metadata: {
    page_view_id?: string;
    time_to_load: number;
    perceived_time_to_load?: number;
  };
  page_view_id?: string;
  time_to_load: number;
  perceived_time_to_load?: number;
}

/**
 * Page load error event
 */
export interface PageLoadErrorEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_ERROR_PAGE_LOAD;
  event_metadata: {
    error_message: string;
    error_domain?: string;
    error_code?: string;
    url?: string;
  };
  error_message: string;
  error_domain?: string;
  error_code?: string;
  url?: string;
}

/**
 * Unexpected navigation error event
 */
export interface UnexpectedNavigationEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_NAVIGATION;
  event_metadata: {
    url?: string;
  };
  url?: string;
}

/**
 * Unexpected load error type event
 */
export interface UnexpectedLoadErrorTypeEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_ERROR_UNEXPECTED_LOAD_ERROR_TYPE;
  event_metadata: {
    error_type: string;
  };
  error_type: string;
}

/**
 * Unrecognized setter function warning event
 */
export interface UnrecognizedSetterEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_WARN_UNRECOGNIZED_SETTER;
  event_metadata: {
    setter_name: string;
  };
  setter_name: string;
}

/**
 * Message deserialization error event
 */
export interface DeserializeMessageErrorEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_WEB_ERROR_DESERIALIZE_MESSAGE;
  event_metadata: {
    message_name: string;
    error_message: string;
  };
  message_name: string;
  error_message: string;
}

/**
 * Authenticated web view opened event
 */
export interface AuthenticatedWebViewOpenedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_OPENED;
  event_metadata: {
    id: string;
  };
  id: string;
}

/**
 * Authenticated web view canceled event
 */
export interface AuthenticatedWebViewCanceledEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_CANCELED;
  event_metadata: {
    id: string;
  };
  id: string;
}

/**
 * Authenticated web view redirected event
 */
export interface AuthenticatedWebViewRedirectedEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_REDIRECTED;
  event_metadata: {
    id: string;
  };
  id: string;
}

/**
 * Authenticated web view error event
 */
export interface AuthenticatedWebViewErrorEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.COMPONENT_AUTHENTICATED_WEB_ERROR;
  event_metadata: {
    id: string;
    error_message: string;
  };
  id: string;
  error_message: string;
}

/**
 * Client error event (catch-all for mobile client errors)
 */
export interface ClientErrorEvent extends AnalyticsEvent {
  event_name: typeof EVENT_NAMES.CLIENT_ERROR;
  event_metadata: {
    error_message: string;
    error_domain?: string;
    error_code?: string;
    file?: string;
    line?: number;
  };
  error_message: string;
  error_domain?: string;
  error_code?: string;
  file?: string;
  line?: number;
}

/**
 * Union type of all possible analytics events
 */
export type ConnectAnalyticsEvent =
  | ComponentCreatedEvent
  | ComponentViewedEvent
  | ComponentWebPageLoadedEvent
  | ComponentWebComponentLoadedEvent
  | PageLoadErrorEvent
  | UnexpectedNavigationEvent
  | UnexpectedLoadErrorTypeEvent
  | UnrecognizedSetterEvent
  | DeserializeMessageErrorEvent
  | AuthenticatedWebViewOpenedEvent
  | AuthenticatedWebViewCanceledEvent
  | AuthenticatedWebViewRedirectedEvent
  | AuthenticatedWebViewErrorEvent
  | ClientErrorEvent;

/**
 * Full analytics payload sent to backend
 */
export interface AnalyticsPayload
  extends CommonAnalyticsFields,
    AnalyticsEvent {}
