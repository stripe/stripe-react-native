// Demo backend - no configuration needed
export const API_URL =
  'https://rigorous-heartbreaking-cephalopod.stripedemos.com';

export const FINANCIAL_CONNECTIONS_API_URL =
  'https://ios-financial-connections-playground.stripedemos.com';

/*
🛠️ To test pre-collected consent in CollectBankAccountScreen:

The financial_connections_pre_collected_consent preview isn't enabled on the
demo backend's default merchant. Fill in the account-specific test keys
below (do not commit real values) to have the demo backend use them via its
`custom_keys` merchant path instead.
*/
export const FINANCIAL_CONNECTIONS_CUSTOM_PK = '';
export const FINANCIAL_CONNECTIONS_CUSTOM_SK = '';

// To test Samsung Pay in the Crypto Onramp example, register the Android app
// with Samsung Pay and replace this value with the assigned in-app service ID.
// Samsung Pay SDK 2.22.00 must also be installed in example/android/libs.
export const SAMSUNG_PAY_SERVICE_ID = 'a38b24ecbba94a3c8bfbfe';

/*
🛠️ To use Custom Backend:

Remote/Codesandbox:
1. Fork this codesandbox: https://codesandbox.io/p/devbox/rigorous-heartbreaking-cephalopod-m358cz
2. Deploy your fork or get the preview URL
3. Update CUSTOM_BACKEND_URL above with your URL
4. Update API_URL above to: CUSTOM_BACKEND_URL
*/
