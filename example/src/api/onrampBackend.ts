interface CreateAuthIntentRequest {
  oauth_scopes: string;
}

interface CreateAuthIntentResponse {
  authIntentId: string;
  existing: boolean;
  state: string;
  token: string;
}

interface CreateLinkAuthTokenResponse {
  link_auth_token_client_secret: string;
  expires_in: number;
}

interface SaveUserRequest {
  crypto_customer_id: string;
}

interface SaveUserResponse {
  success: boolean;
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

interface GetCryptoCustomerResponse {
  crypto_customer_id: string;
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
  settlement_speed: 'instant' | 'standard';
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
      method?: 'GET' | 'POST';
    } = {}
  ): Promise<ApiResult<T>> {
    const {
      useTimeout = false,
      authToken,
      transformResponse,
      method = 'POST',
    } = options;

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

      const fetchOptions: RequestInit & { headers: Record<string, string> } = {
        method,
        headers,
        ...(controller && { signal: controller.signal }),
      } as any;

      if (method !== 'GET') {
        (fetchOptions as any).body = JSON.stringify(requestBody);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

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
   * Creates a Link Auth Token client secret for token-based Link authentication
   * @param authToken Bearer auth token from signup/login
   */
  async createLinkAuthToken(
    authToken: string
  ): Promise<ApiResult<CreateLinkAuthTokenResponse>> {
    return this.makeRequest<CreateLinkAuthTokenResponse>(
      '/v1/auth/create_link_auth_token',
      {},
      {
        authToken,
        transformResponse: (data) => ({
          link_auth_token_client_secret: data.link_auth_token_client_secret,
          expires_in: data.expires_in,
        }),
      }
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
   * Saves the authenticated user with their crypto customer id on the demo backend
   * @param cryptoCustomerId The crypto customer id to associate with the user
   * @param authToken Bearer auth token from signup/login
   */
  async saveUser(
    cryptoCustomerId: string,
    authToken: string
  ): Promise<ApiResult<SaveUserResponse>> {
    const requestBody: SaveUserRequest = {
      crypto_customer_id: cryptoCustomerId,
    };

    return this.makeRequest<SaveUserResponse>(
      '/v1/auth/save_user',
      requestBody,
      {
        authToken,
        transformResponse: (data) => ({ success: !!data.success }),
      }
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
    customerIpAddress: string,
    settlementSpeed: 'instant' | 'standard' = 'instant'
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
      settlement_speed: settlementSpeed,
    };

    return this.makeRequest<OnrampSessionResponse>(
      '/v1/create_onramp_session',
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

    return this.makeRequest<OnrampSessionResponse>(
      '/v1/checkout',
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
   * Retrieves the crypto customer id for the currently authenticated user
   * @param authToken Authorization token
   */
  async getCryptoCustomerId(
    authToken: string
  ): Promise<ApiResult<GetCryptoCustomerResponse>> {
    return this.makeRequest<GetCryptoCustomerResponse>(
      '/v1/auth/crypto_customer',
      null,
      {
        authToken,
        method: 'GET',
        transformResponse: (data) => ({
          crypto_customer_id: data.crypto_customer_id,
        }),
      }
    );
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
  customerIpAddress: string,
  settlementSpeed: 'instant' | 'standard' = 'instant'
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
    customerIpAddress,
    settlementSpeed
  );
};

export const createLinkAuthToken = async (
  authToken: string
): Promise<ApiResult<CreateLinkAuthTokenResponse>> => {
  return defaultClient.createLinkAuthToken(authToken);
};

export const checkout = async (
  cosId: string,
  authToken: string
): Promise<ApiResult<OnrampSessionResponse>> => {
  return defaultClient.checkout(cosId, authToken);
};

export const getCryptoCustomerId = async (
  authToken: string
): Promise<ApiResult<GetCryptoCustomerResponse>> => {
  return defaultClient.getCryptoCustomerId(authToken);
};

export const saveUser = async (
  cryptoCustomerId: string,
  authToken: string
): Promise<ApiResult<SaveUserResponse>> => {
  return defaultClient.saveUser(cryptoCustomerId, authToken);
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
  CreateLinkAuthTokenResponse,
  GetCryptoCustomerResponse,
  SaveUserRequest,
  SaveUserResponse,
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
