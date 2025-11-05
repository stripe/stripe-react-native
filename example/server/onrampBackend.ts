interface CreateAuthIntentRequest {
  oauth_scopes: string;
}

interface CreateAuthIntentResponse {
  authIntentId: string;
  existing: boolean;
  state: string;
  token: string;
}

interface SignupRequest {
  email: string;
  password: string;
  livemode: boolean;
}

interface SignupUser {
  user_id: number;
  email: string;
  created_at: string;
}

interface SignupResponse {
  token: string;
  user: SignupUser;
}

interface LoginRequest {
  email: string;
  password: string;
  livemode: boolean;
}

interface LoginResponse {
  token: string;
  user: SignupUser;
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
   * Creates an auth intent using an existing user session token
   * @param authToken Bearer auth token from signup/login
   * @param oauthScopes OAuth scopes
   */
  async createAuthIntent(
    authToken: string,
    oauthScopes: string = 'kyc.status:read,crypto:ramp,auth.persist_login:read'
  ): Promise<ApiResult<CreateAuthIntentResponse>> {
    const requestBody: CreateAuthIntentRequest = {
      oauth_scopes: oauthScopes,
    };

    return this.makeRequest<CreateAuthIntentResponse>(
      '/v1/auth/create',
      requestBody,
      { authToken }
    );
  }

  /**
   * Signs up a new user for the demo backend
   * @param email User email address
   * @param password User password
   * @param livemode Whether to use livemode (defaults to false)
   */
  async signup(
    email: string,
    password: string,
    livemode: boolean = false
  ): Promise<ApiResult<SignupResponse>> {
    const requestBody: SignupRequest = {
      email,
      password,
      livemode,
    };

    return this.makeRequest<SignupResponse>('/v1/auth/signup', requestBody, {
      transformResponse: (data) => ({
        token: data.token,
        user: data.user,
      }),
    });
  }

  /**
   * Logs in an existing user
   * @param email User email address
   * @param password User password
   * @param livemode Whether to use livemode (defaults to false)
   */
  async login(
    email: string,
    password: string,
    livemode: boolean = false
  ): Promise<ApiResult<LoginResponse>> {
    const requestBody: LoginRequest = {
      email,
      password,
      livemode,
    };

    return this.makeRequest<LoginResponse>('/v1/auth/login', requestBody, {
      transformResponse: (data) => ({
        token: data.token,
        user: data.user,
      }),
    });
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
  authToken: string,
  oauthScopes?: string
): Promise<ApiResult<CreateAuthIntentResponse>> => {
  return defaultClient.createAuthIntent(authToken, oauthScopes);
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

export const signup = async (
  email: string,
  password: string,
  livemode?: boolean
): Promise<ApiResult<SignupResponse>> => {
  return defaultClient.signup(email, password, livemode);
};

export const login = async (
  email: string,
  password: string,
  livemode?: boolean
): Promise<ApiResult<LoginResponse>> => {
  return defaultClient.login(email, password, livemode);
};

export type {
  CreateAuthIntentRequest,
  CreateAuthIntentResponse,
  SignupRequest,
  SignupResponse,
  SignupUser,
  LoginRequest,
  LoginResponse,
  CreateOnrampSessionRequest,
  OnrampSessionResponse,
  CheckoutRequest,
  ApiResult,
};

export default OnrampBackend;
