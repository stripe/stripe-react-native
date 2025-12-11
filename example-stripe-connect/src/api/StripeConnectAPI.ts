/**
 * API client for StripeConnect Example
 * Based on API_DOCUMENTATION.md
 */

// ============================================================================
// Response Types
// ============================================================================

export interface AppInfoResponse {
  publishable_key: string;
  available_merchants: MerchantInfo[];
}

export interface MerchantInfo {
  display_name: string | null;
  merchant_id: string;
}

export interface AccountSessionResponse {
  client_secret: string;
}

export interface APIErrorResponse {
  error: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type APIError =
  | FailedToParseError
  | InvalidURLError
  | NetworkError
  | ResponseError
  | UnknownError;

export interface FailedToParseError {
  type: 'failedToParse';
  message: string;
  underlyingError: Error;
}

export interface InvalidURLError {
  type: 'invalidURL';
  message: 'Invalid url';
}

export interface NetworkError {
  type: 'networkError';
  message: string;
  underlyingError: Error;
}

export interface ResponseError {
  type: 'responseError';
  response: APIErrorResponse;
}

export interface UnknownError {
  type: 'unknown';
  message: string;
  underlyingError: Error;
}

// ============================================================================
// API Client
// ============================================================================

export class StripeConnectAPI {
  constructor(private baseURL: string) {}

  /**
   * Get application info including publishable key and merchants
   * @param baseURL - Optional override for the base URL
   */
  async appInfo(baseURL?: string): Promise<AppInfoResponse> {
    const url = `${baseURL || this.baseURL}/app_info`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorResponse: APIErrorResponse;
        try {
          errorResponse = await response.json();
        } catch {
          errorResponse = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        throw {
          type: 'responseError',
          response: errorResponse,
        } as ResponseError;
      }

      return await response.json();
    } catch (error) {
      if ((error as APIError).type === 'responseError') {
        throw error;
      }

      if (error instanceof TypeError) {
        throw {
          type: 'networkError',
          message: error.message,
          underlyingError: error,
        } as NetworkError;
      }

      throw {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        underlyingError:
          error instanceof Error ? error : new Error(String(error)),
      } as UnknownError;
    }
  }

  /**
   * Create an account session for a merchant
   * @param merchantId - Optional merchant ID to create session for
   * @param baseURL - Optional override for the base URL
   */
  async accountSession(
    merchantId?: string,
    baseURL?: string
  ): Promise<AccountSessionResponse> {
    const url = `${baseURL || this.baseURL}/account_session`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (merchantId) {
      headers.account = merchantId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        let errorResponse: APIErrorResponse;
        try {
          errorResponse = await response.json();
        } catch {
          errorResponse = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        throw {
          type: 'responseError',
          response: errorResponse,
        } as ResponseError;
      }

      return await response.json();
    } catch (error) {
      if ((error as APIError).type === 'responseError') {
        throw error;
      }

      if (error instanceof TypeError) {
        throw {
          type: 'networkError',
          message: error.message,
          underlyingError: error,
        } as NetworkError;
      }

      throw {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        underlyingError:
          error instanceof Error ? error : new Error(String(error)),
      } as UnknownError;
    }
  }
}

/**
 * Default API client instance
 * Uses the default backend URL from constants
 */
export const createAPIClient = (baseURL: string): StripeConnectAPI => {
  return new StripeConnectAPI(baseURL);
};
