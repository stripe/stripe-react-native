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
}

export default OnrampBackend;
