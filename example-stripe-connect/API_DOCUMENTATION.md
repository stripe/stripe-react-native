# StripeConnect Example API Documentation

This document describes all API requests and responses used in the StripeConnect Example application.

## Base Configuration

The API uses a configurable base URL stored in the app settings context (`SettingsContext`).

All responses use snake_case for JSON keys in the API, which are parsed as-is in TypeScript.

## Endpoints

### 1. Get App Info

Retrieves application information including the publishable key and available merchants.

**Endpoint:** `GET /app_info`

**Request:**
```typescript
// No request body
// Headers:
{
  'Content-Type': 'application/json'
}
```

**Response (200 OK):**
```typescript
interface AppInfoResponse {
  publishable_key: string;
  available_merchants: MerchantInfo[];
}

interface MerchantInfo {
  display_name: string | null;
  merchant_id: string;
}
```

**Example Response:**
```json
{
  "publishable_key": "pk_test_...",
  "available_merchants": [
    {
      "display_name": "Example Merchant",
      "merchant_id": "acct_..."
    }
  ]
}
```

**Usage:**
- Called on app initialization via React Query (`useAppInfo` hook)
- Provides the Stripe publishable key for SDK initialization
- Provides the list of merchants available for account sessions

---

### 2. Create Account Session

Creates an account session for a specific merchant or the default account.

**Endpoint:** `POST /account_session`

**Request Headers:**
```typescript
{
  'Content-Type': 'application/json',
  account?: string  // Optional merchant ID
}
```

**Request:**
```typescript
// No request body
// Optional header: { "account": "acct_..." }
```

**Response (200 OK):**
```typescript
interface AccountSessionResponse {
  client_secret: string;
}
```

**Example Response:**
```json
{
  "client_secret": "cas_..."
}
```

**Usage:**
- Called to obtain a client secret for initializing Stripe Connect embedded components
- The `account` header specifies which merchant account to create the session for
- If no merchant ID is provided in the header, uses the default account
- Used by `fetchClientSecret` prop in `ConnectComponentsProvider`

---

## Error Responses

When an API request fails (non-200 status code), the server returns an error response.

**Error Response:**
```typescript
interface APIErrorResponse {
  error: string; // Human-readable error message
}
```

**Example Error Response:**
```json
{
  "error": "Invalid merchant ID"
}
```

## Error Types

The API client handles several types of errors:

```typescript
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
```

**Error Descriptions:**
- `failedToParse`: Failed to parse the JSON response
- `invalidURL`: The constructed URL is invalid
- `networkError`: Network-level error (no connection, timeout, etc.)
- `responseError`: Server returned an error response (non-200 status)
- `unknown`: Unexpected error occurred

## Implementation Notes

### Request Configuration

All requests are made using the native `fetch` API with the following configuration:

1. **Base URL**: Configurable via `SettingsContext` (`backendUrl` setting)
2. **Content Type**: `application/json`
3. **Error Handling**: Comprehensive error catching and typing

### Response Handling

1. **Success (200)**: Response body is parsed as JSON to the expected type
2. **Error (non-200)**:
   - Attempts to parse response as `APIErrorResponse`
   - Falls back to status code/text if parsing fails
   - Throws typed `ResponseError`
3. **Network Failure**: Catches `TypeError` and wraps as `NetworkError`
4. **Unknown Errors**: Catches all other errors and wraps as `UnknownError`

### Type Safety

The API client is implemented as a TypeScript class with full type safety:

```typescript
export class StripeConnectAPI {
  constructor(private baseURL: string);

  async appInfo(baseURL?: string): Promise<AppInfoResponse>;
  async accountSession(merchantId?: string, baseURL?: string): Promise<AccountSessionResponse>;
}
```

## Complete TypeScript Type Definitions

```typescript
// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from GET /app_info
 * Contains Stripe configuration and available merchants
 */
export interface AppInfoResponse {
  publishable_key: string;
  available_merchants: MerchantInfo[];
}

/**
 * Information about a merchant account
 */
export interface MerchantInfo {
  display_name: string | null;
  merchant_id: string;
}

/**
 * Response from POST /account_session
 * Contains the client secret for Connect embedded components
 */
export interface AccountSessionResponse {
  client_secret: string;
}

/**
 * Error response returned by the API
 */
export interface APIErrorResponse {
  error: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Union type representing all possible API errors
 */
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

/**
 * API client for StripeConnect Example
 */
export class StripeConnectAPI {
  constructor(baseURL: string);

  /**
   * Get application info including publishable key and merchants
   * @param baseURL - Optional override for the base URL
   */
  appInfo(baseURL?: string): Promise<AppInfoResponse>;

  /**
   * Create an account session for a merchant
   * @param merchantId - Optional merchant ID to create session for
   * @param baseURL - Optional override for the base URL
   */
  accountSession(
    merchantId?: string,
    baseURL?: string
  ): Promise<AccountSessionResponse>;
}

/**
 * Factory function to create an API client instance
 * @param baseURL - Base URL for the API
 */
export function createAPIClient(baseURL: string): StripeConnectAPI;
```

## Usage Examples

### Client Instantiation

```typescript
import { createAPIClient } from './api/StripeConnectAPI';

// Create client with base URL
const client = createAPIClient('https://api.example.com');
```

### Get App Info

```typescript
try {
  const appInfo = await client.appInfo();
  console.log('Publishable Key:', appInfo.publishable_key);
  console.log('Merchants:', appInfo.available_merchants);
} catch (error) {
  if ((error as APIError).type === 'responseError') {
    console.error('API Error:', error.response.error);
  } else if ((error as APIError).type === 'networkError') {
    console.error('Network Error:', error.message);
  } else {
    console.error('Unknown Error:', error);
  }
}
```

### Create Account Session

```typescript
try {
  const session = await client.accountSession('acct_123');
  console.log('Client Secret:', session.client_secret);
} catch (error) {
  if ((error as APIError).type === 'responseError') {
    console.error('API Error:', error.response.error);
  }
}
```

### React Query Integration

The app uses React Query for data fetching. Example hooks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createAPIClient } from '../api/StripeConnectAPI';

// Hook to fetch app info
export function useAppInfo(baseURL: string) {
  return useQuery({
    queryKey: ['appInfo', baseURL],
    queryFn: async () => {
      const client = createAPIClient(baseURL);
      return await client.appInfo();
    },
  });
}

// Hook to fetch account session
export function useAccountSession(merchantId: string, baseURL: string) {
  return useQuery({
    queryKey: ['accountSession', merchantId, baseURL],
    queryFn: async () => {
      const client = createAPIClient(baseURL);
      return await client.accountSession(merchantId);
    },
  });
}
```

## Integration with Stripe Connect SDK

The account session client secret is used to initialize Stripe Connect components:

```typescript
import { ConnectComponentsProvider } from '@stripe/stripe-react-native';

function App() {
  const { data: appInfo } = useAppInfo(backendUrl);
  const apiClient = createAPIClient(backendUrl);

  const fetchClientSecret = async () => {
    const response = await apiClient.accountSession(selectedMerchantId);
    return response.client_secret;
  };

  return (
    <ConnectComponentsProvider
      publishableKey={appInfo.publishable_key}
      fetchClientSecret={fetchClientSecret}
    >
      {/* Your app components */}
    </ConnectComponentsProvider>
  );
}
```

## Project Structure

```
src/
├── api/
│   └── StripeConnectAPI.ts      # API client implementation
├── contexts/
│   └── SettingsContext.tsx       # App settings including backend URL
└── hooks/
    └── useAppInfo.ts             # React Query hooks for API calls
```
