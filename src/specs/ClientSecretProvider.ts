// Internal JS/native transport. Request IDs never reach merchant providers.
export type ClientSecretProviderRequest = {
  requestId: string;
};

export type CustomerSessionProviderResult = {
  requestId: string;
  customerId?: string;
  clientSecret?: string;
  error?: string;
};

export type SetupIntentProviderResult = {
  requestId: string;
  clientSecret?: string;
  error?: string;
};
