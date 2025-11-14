import { Platform } from 'react-native';

// =============================================================================
// BACKEND CONFIGURATION
// =============================================================================

// Option 1: Demo Backend (Default - No setup required)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEMO_BACKEND_URL =
  'https://rigorous-heartbreaking-cephalopod.stripedemos.com';

// Option 2: Custom Backend (Local or Remote)

const LOCAL_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4242' : 'http://localhost:4242';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOM_BACKEND_URL = 'https://your-custom-backend.com';

// =============================================================================
// ACTIVE CONFIGURATION
// =============================================================================

export const API_URL = LOCAL_URL;

// =============================================================================
// SETUP INSTRUCTIONS
// =============================================================================

/*
🚀 Quick Start (Current Setup):
Uses demo backend - no configuration needed!

🛠️ To use Custom Backend:

Local Development:
1. Create .env file: cp example/.env.example example/.env
2. Add your Stripe keys to the .env file
3. Start backend server: yarn example start:server
4. Update API_URL above to: LOCAL_URL

Remote/Codesandbox:
1. Fork this codesandbox: https://codesandbox.io/p/devbox/rigorous-heartbreaking-cephalopod-m358cz
2. Deploy your fork or get the preview URL
3. Update CUSTOM_BACKEND_URL above with your URL
4. Update API_URL above to: CUSTOM_BACKEND_URL
*/
