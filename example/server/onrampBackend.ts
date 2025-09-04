interface CreateAuthIntentRequest {
  email: string;
  oauth_scopes: string;
}

interface AuthIntentData {
  id: string;
  expiresAt: number; // Unix timestamp
}

interface CreateAuthIntentResponse {
  data: AuthIntentData;
  token: string;
}

interface CreateOnrampSessionRequest {
  ui_mode: string;
  payment_token: string;
  source_amount: number;
  source_currency: string;
  destination_currency: string;
  destination_network: string;
  wallet_address: string;
  crypto_customer_id: string;
  customer_ip_address: string;
}

interface OnrampSessionResponse {
  id: string;
  client_secret: string;
}

interface CheckoutRequest {
  cos_id: string;
}

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class OnrampBackend {
  private baseUrl: string;

  constructor(
    baseUrl: string = 'https://crypto-onramp-example.stripedemos.com'
  ) {
    this.baseUrl = baseUrl;
  }

  /**
   * Creates an auth intent for the given email and OAuth scopes
   * @param email User email address
   * @param oauthScopes OAuth scopes
   */
  async createAuthIntent(
    email: string,
    oauthScopes: string = 'kyc.status:read,crypto:ramp'
  ): Promise<ApiResult<CreateAuthIntentResponse>> {
    try {
      const requestBody: CreateAuthIntentRequest = {
        email,
        oauth_scopes: oauthScopes,
      };

      const response = await fetch(`${this.baseUrl}/auth_intent/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          '[OnrampBackend] API request failed:',
          response.status,
          responseData
        );
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message:
              responseData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('[OnrampBackend] Error creating auth intent:', error);

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  /**
   * Creates an onramp session for crypto purchase
   * @param paymentToken Payment token from collectPaymentMethod
   * @param walletAddress Destination wallet address
   * @param cryptoCustomerId Customer ID from authentication
   * @param authToken Authorization token
   * @param destinationNetwork Destination network (default: "ethereum")
   * @param sourceAmount Source amount (default: 10.0)
   * @param sourceCurrency Source currency (default: "usd")
   * @param destinationCurrency Destination currency (default: "eth")
   * @param customerIpAddress Customer IP address (default: "127.0.0.1")
   */
  async createOnrampSession(
    paymentToken: string,
    walletAddress: string,
    cryptoCustomerId: string,
    authToken: string,
    destinationNetwork: string = 'ethereum',
    sourceAmount: number = 10.0,
    sourceCurrency: string = 'usd',
    destinationCurrency: string = 'eth',
    customerIpAddress: string = '127.0.0.1'
  ): Promise<ApiResult<OnrampSessionResponse>> {
    try {
      const requestBody: CreateOnrampSessionRequest = {
        ui_mode: 'headless',
        payment_token: paymentToken,
        source_amount: sourceAmount,
        source_currency: sourceCurrency,
        destination_currency: destinationCurrency,
        destination_network: destinationNetwork,
        wallet_address: walletAddress,
        crypto_customer_id: cryptoCustomerId,
        customer_ip_address: customerIpAddress,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

      const response = await fetch(`${this.baseUrl}/create_onramp_session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          '[OnrampBackend] Create onramp session failed:',
          response.status,
          responseData
        );
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message:
              responseData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return {
        success: true,
        data: {
          id: responseData.id,
          client_secret: responseData.client_secret,
        },
      };
    } catch (error) {
      console.error('[OnrampBackend] Error creating onramp session:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request timed out after 60 seconds',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  /**
   * Performs checkout for an existing onramp session
   * @param cosId Crypto onramp session ID
   * @param authToken Authorization token
   */
  async checkout(
    cosId: string,
    authToken: string
  ): Promise<ApiResult<OnrampSessionResponse>> {
    try {
      const requestBody: CheckoutRequest = {
        cos_id: cosId,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

      const response = await fetch(`${this.baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          '[OnrampBackend] Checkout failed:',
          response.status,
          responseData
        );
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message:
              responseData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return {
        success: true,
        data: {
          id: responseData.id,
          client_secret: responseData.client_secret,
        },
      };
    } catch (error) {
      console.error('[OnrampBackend] Error during checkout:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request timed out after 60 seconds',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }
}

// Create a default client instance for convenience functions
const defaultClient = new OnrampBackend();

/**
 * Convenience function to create an auth intent using the default client
 */
export const createAuthIntent = async (
  email: string,
  oauthScopes?: string
): Promise<ApiResult<CreateAuthIntentResponse>> => {
  return defaultClient.createAuthIntent(email, oauthScopes);
};

/**
 * Convenience function to create an onramp session using the default client
 */
export const createOnrampSession = async (
  paymentToken: string,
  walletAddress: string,
  cryptoCustomerId: string,
  authToken: string,
  destinationNetwork?: string,
  sourceAmount?: number,
  sourceCurrency?: string,
  destinationCurrency?: string,
  customerIpAddress?: string
): Promise<ApiResult<OnrampSessionResponse>> => {
  return defaultClient.createOnrampSession(
    paymentToken,
    walletAddress,
    cryptoCustomerId,
    authToken,
    destinationNetwork,
    sourceAmount,
    sourceCurrency,
    destinationCurrency,
    customerIpAddress
  );
};

/**
 * Convenience function to perform checkout using the default client
 */
export const checkout = async (
  cosId: string,
  authToken: string
): Promise<ApiResult<OnrampSessionResponse>> => {
  return defaultClient.checkout(cosId, authToken);
};

// Export types for use in other files
export type {
  CreateAuthIntentRequest,
  CreateAuthIntentResponse,
  AuthIntentData,
  CreateOnrampSessionRequest,
  OnrampSessionResponse,
  CheckoutRequest,
  ApiResult,
};

export default OnrampBackend;
