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

  private async makeRequest<T>(
    endpoint: string,
    requestBody: any,
    options: {
      useTimeout?: boolean;
      authToken?: string;
      transformResponse?: (data: any) => T;
    } = {}
  ): Promise<ApiResult<T>> {
    const { useTimeout = false, authToken, transformResponse } = options;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      let controller: AbortController | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (useTimeout) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller!.abort(), 60000); // 60 seconds timeout
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        ...(controller && { signal: controller.signal }),
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          `[OnrampBackend] Request to ${endpoint} failed:`,
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

      const transformedData = transformResponse
        ? transformResponse(responseData)
        : responseData;

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      console.error(
        `[OnrampBackend] Error making request to ${endpoint}:`,
        error
      );

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
   * Creates an auth intent for the given email and OAuth scopes
   * @param email User email address
   * @param oauthScopes OAuth scopes
   */
  async createAuthIntent(
    email: string,
    oauthScopes: string = 'kyc.status:read,crypto:ramp'
  ): Promise<ApiResult<CreateAuthIntentResponse>> {
    const requestBody: CreateAuthIntentRequest = {
      email,
      oauth_scopes: oauthScopes,
    };

    return this.makeRequest<CreateAuthIntentResponse>(
      '/auth_intent/create',
      requestBody
    );
  }

  /**
   * Creates an onramp session for crypto purchase
   * @param paymentToken Payment token from collectPaymentMethod
   * @param walletAddress Destination wallet address
   * @param cryptoCustomerId Customer ID from authentication
   * @param authToken Authorization token
   * @param destinationNetwork Destination network (e.g., "ethereum", "solana", "bitcoin")
   * @param sourceAmount Source amount in USD
   * @param sourceCurrency Source currency (e.g., "usd")
   * @param destinationCurrency Destination currency (e.g., "eth", "sol", "btc")
   * @param customerIpAddress Customer IP address
   */
  async createOnrampSession(
    paymentToken: string,
    walletAddress: string,
    cryptoCustomerId: string,
    authToken: string,
    destinationNetwork: string,
    sourceAmount: number,
    sourceCurrency: string,
    destinationCurrency: string,
    customerIpAddress: string
  ): Promise<ApiResult<OnrampSessionResponse>> {
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

    return this.makeRequest<OnrampSessionResponse>(
      '/create_onramp_session',
      requestBody,
      {
        useTimeout: true,
        authToken,
        transformResponse: (data) => ({
          id: data.id,
          client_secret: data.client_secret,
        }),
      }
    );
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
    const requestBody: CheckoutRequest = {
      cos_id: cosId,
    };

    return this.makeRequest<OnrampSessionResponse>('/checkout', requestBody, {
      useTimeout: true,
      authToken,
      transformResponse: (data) => ({
        id: data.id,
        client_secret: data.client_secret,
      }),
    });
  }
}

const defaultClient = new OnrampBackend();

export const createAuthIntent = async (
  email: string,
  oauthScopes?: string
): Promise<ApiResult<CreateAuthIntentResponse>> => {
  return defaultClient.createAuthIntent(email, oauthScopes);
};

export const createOnrampSession = async (
  paymentToken: string,
  walletAddress: string,
  cryptoCustomerId: string,
  authToken: string,
  destinationNetwork: string,
  sourceAmount: number,
  sourceCurrency: string,
  destinationCurrency: string,
  customerIpAddress: string
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

export const checkout = async (
  cosId: string,
  authToken: string
): Promise<ApiResult<OnrampSessionResponse>> => {
  return defaultClient.checkout(cosId, authToken);
};

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
