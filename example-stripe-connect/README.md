# Stripe Connect Example App

This is an Expo application demonstrating Stripe Connect embedded components using the `@stripe/stripe-react-native` SDK. The app showcases the three main Connect embedded components: Account Onboarding, Payouts, and Payments.

## Features

### Stripe Connect Embedded Components
- **Account Onboarding** - Localized onboarding form with data validation and configurable collection options
- **Payouts** - View and perform payouts with embedded component
- **Payments** - View payment details, manage disputes, and filter payments by amount, date, status, and payment method

### Configuration & Customization
- **Demo Account Management** - Switch between multiple pre-configured accounts or use custom account IDs
- **Appearance Customization** - 9 theme presets for embedded components (Default, Dark mode, Dynamic colors, Forest, Hot Dog Stand, Link, Ocean Breeze, Ogre, Retro)
- **Presentation Modes** - Configure components to present modally, via navigation push, or embedded in tab bars
- **Payment Filters** - Advanced filtering by amount (equals, greater than, less than, between), date (before, after, between), status, and payment method
- **Persistent Settings** - All settings automatically saved using AsyncStorage

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

3. Run on iOS or Android:
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
example-stripe-connect/
├── app/                           # Expo Router app directory
│   ├── _layout.tsx                # Root layout with providers
│   ├── index.tsx                  # Home screen
│   ├── account-onboarding.tsx     # Account onboarding component
│   ├── payments.tsx               # Payments component
│   ├── payouts.tsx                # Payouts component
│   ├── configure-appearance.tsx   # Appearance selector
│   ├── (tabs)/                    # Tab-based layout group
│   │   ├── _layout.tsx            # Native tabs configuration
│   │   └── [component].tsx        # Dynamic component router
│   └── (settings)/                # Settings modal group
│       ├── _layout.tsx            # Settings stack navigation
│       ├── index.tsx              # Main settings screen
│       ├── onboarding-settings.tsx
│       ├── payments-filter-settings.tsx
│       └── view-controller-options.tsx
├── src/
│   ├── api/                       # API integration
│   │   └── StripeConnectAPI.ts    # Type-safe API client
│   ├── components/                # Reusable UI components
│   │   ├── AmountInput.tsx
│   │   ├── AnimatedCheckmark.tsx
│   │   ├── ChevronRight.tsx
│   │   ├── DropdownModal.tsx
│   │   ├── Section.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── SelectableRow.tsx
│   │   └── Separator.tsx
│   ├── connect/                   # Stripe Connect component wrappers
│   │   ├── ConnectAccountOnboardingView.tsx
│   │   ├── ConnectPaymentsView.tsx
│   │   └── ConnectPayoutsView.tsx
│   ├── constants/                 # App constants and configuration
│   │   ├── index.ts               # Default values and storage keys
│   │   ├── colors.ts              # Color palette
│   │   └── appearancePresets.ts   # Appearance configurations
│   ├── contexts/                  # React Context providers
│   │   └── SettingsContext.tsx    # Global app settings state
│   ├── hooks/                     # Custom React hooks
│   │   └── useAppearanceTextColor.ts
│   ├── screens/                   # Full screen components
│   │   ├── ConnectScreen.tsx
│   │   ├── ConfigureAppearanceScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── OnboardingSettingsScreen.tsx
│   │   ├── PaymentsFilterSettingsScreen.tsx
│   │   └── ViewControllerOptionsScreen.tsx
│   ├── types/                     # TypeScript type definitions
│   │   └── index.ts
│   └── utils/                     # Utility functions
│       ├── booleans.ts
│       └── money.ts
├── App.tsx                        # (Not used - Expo Router entry)
├── app.json                       # Expo configuration
└── package.json
```

## Usage

### Home Screen

The home screen displays three main Connect components:
- **Account onboarding** - "Show a localized onboarding form that validates data."
- **Payouts** - "Show payouts and allow your users to perform payouts."
- **Payments** - "Show payments and allow your users to view payment details and manage disputes."

Tap any item to view the embedded component. The navigation bar includes:
- **Settings icon (⚙️)** - Opens settings modal (left)
- **Appearance icon (🎨)** - Opens appearance configuration (right)

### Settings

Access settings via the gear icon to configure:

#### 1. Select a Demo Account
Choose from pre-configured demo accounts:
- **Custom accounts**: Default, Onboarding A-E
- **ORR**: On-demand Recurring Revenue
- **Express**: Express accounts
- **Standard**: Standard accounts
- **PNS**: Payment Network Service accounts (1-4)
- **SNS**: Settlement Network Service accounts (1-4)
- **Standard non-CBSP**
- **Other**: Enter a custom Stripe connected account ID (acct_xxxx)

#### 2. Component Settings

**Account Onboarding Settings:**
- **Full terms of service** - URL for complete terms
- **Recipient terms of service** - URL for recipient-specific terms
- **Privacy policy** - URL for privacy policy
- **Field option** - Dropdown: Default | currently_due | eventually_due
- **Future requirements** - Dropdown: Default | Include | Exclude
- **Requirements** - Multi-line text input to include/exclude specific fields
- **Reset to defaults** - Restore default settings

**Payments Filter Settings:**
- **Amount Filter**:
  - Type: None | Equals | Greater than | Less than | Between
  - Single amount input or range (lower/upper bounds)
- **Date Filter**:
  - Type: None | Before | After | Between
  - Single date picker or range (start/end dates)
  - Native date pickers (iOS: spinner-style, Android: system dialog)
- **Status Filter** (multi-select):
  - Blocked, Canceled, Disputed, Early Fraud Warning, Failed, Incomplete, Partially Refunded, Pending, Refund Pending, Refunded, Successful, Uncaptured
- **Payment Method** (single-select):
  - None | Ach Credit Transfer | Ach Debit | Acss Debit | Affirm | Afterpay Clearpay | Alipay | and more
- **Reset to defaults** - Restore default filters

**View Controller Options:**
- **Presentation type** - navigation_push | present_modally
- **Embed in navigation bar** - Toggle
- **Embed in tab bar** - Toggle (enables native tabs)

#### 3. API Server Settings
- **Backend URL** - Configure the API server endpoint
- **Default**: `https://stripe-connect-mobile-example-v1.stripedemos.com/`
- **Reset to default** - Restore default backend URL

### Appearance Configuration

Configure the visual appearance of embedded components with preset themes:
- **Default** - Uses Stripe SDK defaults
- **Dark mode** - Comprehensive dark theme
- **Dynamic colors** - GitHub-inspired palette
- **Forest** - Nature-inspired green theme
- **Hot Dog Stand** - Bold red/yellow theme
- **Link** - Teal/green theme with custom spacing
- **Ocean Breeze** - Light blue theme
- **Ogre** - Lime/brown experimental theme
- **Retro** - 90s-inspired monochrome

Each preset can customize colors, button styles, border radius, typography, spacing, and more.

## Architecture

### Tech Stack
- **Framework**: Expo (React Native)
- **SDK**: `@stripe/stripe-react-native` (linked locally)
- **Navigation**: Expo Router (file-based routing with native tabs)
- **State Management**: React Context + TanStack React Query
- **Persistence**: AsyncStorage
- **Language**: TypeScript

### State Management

The app uses a combination of:
- **SettingsContext**: React Context for global app state (selected merchant, appearance, component settings)
- **React Query**: Server state management for fetching merchant list and publishable key
- **AsyncStorage**: Persistent storage for all user preferences

All settings changes are tracked in real-time, with Save/Cancel buttons enabled only when changes are detected.

### Navigation Structure

```
Stack Navigator
├── Home Screen (index)
├── Account Onboarding Screen
├── Payouts Screen
├── Payments Screen
├── (tabs) Group - Dynamic component routing with NativeTabs
└── Modals:
    ├── Settings Modal Stack
    │   ├── Settings Screen (index)
    │   ├── Onboarding Settings Screen
    │   ├── Payments Filter Settings Screen
    │   └── View Controller Options Screen
    └── Configure Appearance Modal
```

### Backend Integration

The app communicates with a remote backend server:
- **Default URL**: `https://stripe-connect-mobile-example-v1.stripedemos.com/`
- **Endpoints**:
  - `GET /app_info` - Returns publishable key and available merchants
  - `POST /account_session` - Creates account session for embedded components

The API client (`src/api/StripeConnectAPI.ts`) provides:
- Type-safe requests and responses
- Comprehensive error handling
- Automatic snake_case to camelCase conversion

For detailed API documentation including request/response schemas and examples, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

### Key Components

#### StripeProvider
Root provider that initializes the Stripe SDK with the publishable key fetched from the backend.

#### ConnectComponentsProvider
Wrapper around each Connect component that:
- Fetches client secret from backend
- Applies appearance variables
- Manages Connect instance lifecycle
- Handles loading and error states

#### Connect Components
- **ConnectAccountOnboarding** - Full onboarding flow with configurable collection options
- **ConnectPayments** - Payment management with advanced filtering
- **ConnectPayouts** - Payout management

## Development

### TypeScript

The app is fully typed with TypeScript. Run type checking with:
```bash
npx tsc --noEmit
```

### Code Structure

- All business logic is in React hooks and contexts
- Screens are presentational components
- Constants and types are centralized for easy maintenance
- API client provides type-safe backend communication

### Default Values

When the app launches for the first time (no saved settings):

**Account Settings:**
- Selected Account: First merchant from API (or "Default (Custom)" as fallback)
- Account ID: From API response

**Backend Settings:**
- Backend URL: `https://stripe-connect-mobile-example-v1.stripedemos.com/`

**Appearance Settings:**
- Selected Preset: Default (empty configuration)

**Onboarding Settings:**
- All URL fields: Empty
- Field option: Default (undefined)
- Future requirements: Default (undefined)
- Requirements: Empty

**Payments Filter Settings:**
- Amount Filter: None
- Date Filter: None
- Status Filter: No statuses selected
- Payment Method: None

**View Controller Options:**
- Presentation: navigation_push
- Embed in navigation bar: false
- Embed in tab bar: false

## Platform Support

- **iOS**: Requires iOS 13+, supports tablets, includes camera usage description for identity verification
- **Android**: API 21+, edge-to-edge enabled, predictive back gestures disabled
- **New Architecture**: Fully enabled (`newArchEnabled: true`)

## Dependencies

### Core Dependencies
- `expo` ~54.0.25
- `react` 19.1.0
- `react-native` 0.81.5
- `@stripe/stripe-react-native` (linked from parent directory)

### Navigation & Routing
- `expo-router` ^6.0.15
- `react-native-screens` ^4.18.0
- `react-native-safe-area-context` ^5.6.2

### State & Data
- `@tanstack/react-query` ^5.90.11
- `@react-native-async-storage/async-storage` 2.2.0

### UI Components
- `@react-native-menu/menu` ^2.0.0 (native dropdowns)
- `@react-native-community/datetimepicker` 8.4.4 (date pickers)
- `expo-symbols` ^1.0.7 (SF Symbols on iOS)
- `react-native-keyboard-controller` 1.18.5

### Utilities
- `react-native-localize` ^3.6.0
- `react-native-reanimated` ~4.1.1
- `react-native-webview` 13.15.0

## Testing

Test the app on both platforms to verify:
- All settings persist correctly across app restarts
- Component embedding works in both modal and tab bar modes
- Appearance presets apply correctly to embedded components
- Payment filters work with various combinations
- Date pickers work on both iOS and Android
- Merchant selection updates components properly

## License

This example app is for demonstration purposes.

## Related Documentation

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Connect Embedded Components](https://docs.stripe.com/connect/embedded-components)
- [Stripe React Native SDK](https://github.com/stripe/stripe-react-native)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
