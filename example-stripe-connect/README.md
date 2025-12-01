# Stripe Connect Example App

This is an Expo application demonstrating Stripe Connect embedded components using the `@stripe/stripe-react-native` SDK.

## Features

- **Account Onboarding** - Localized onboarding form with data validation
- **Payouts (Beta)** - View and perform payouts
- **Payments (Beta)** - View payment details and manage disputes
- **Demo Account Management** - Switch between multiple pre-configured accounts or use custom accounts
- **Appearance Customization** - Multiple theme presets for embedded components
- **Configurable Settings** - Customize onboarding options and payment filters
- **Persistent Settings** - All settings saved using AsyncStorage

## Getting Started

### Prerequisites

- Node.js (v18+ recommended, though v18.14.0 works)
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
├── src/
│   ├── components/       # Reusable UI components
│   │   └── DropdownModal.tsx
│   ├── contexts/         # React Context providers
│   │   └── SettingsContext.tsx
│   ├── constants/        # App constants and default values
│   │   └── index.ts
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/          # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── AccountOnboardingScreen.tsx
│   │   ├── PayoutsScreen.tsx
│   │   ├── PaymentsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── ConfigureAppearanceScreen.tsx
│   │   ├── OnboardingSettingsScreen.tsx
│   │   └── PaymentsFilterSettingsScreen.tsx
│   └── types/            # TypeScript type definitions
│       └── index.ts
├── App.tsx               # App entry point
├── app.json              # Expo configuration
└── package.json

```

## Usage

### Home Screen

The home screen displays three main Connect components:
- Account onboarding
- Payouts (Beta)
- Payments (Beta)

Tap any item to view the embedded component.

### Settings (⚙️ icon)

Access settings to:
- **Select demo account**: Choose from pre-configured accounts or enter a custom account ID
- **Configure components**: Customize onboarding settings and payment filters
- **Set backend URL**: Configure the API server endpoint (defaults to Stripe's demo server)

### Appearance (🎨 icon)

Configure the visual appearance of embedded components with preset themes:
- Default
- Custom Font
- Dark mode
- Dynamic colors
- Forest
- Hot Dog Stand
- Link
- Ocean Breeze
- Ogre
- Retro

## Configuration

### Backend Server

The app uses a remote backend server by default:
```
https://stripe-connect-mobile-example-v1.stripedemos.com/
```

You can change this in Settings > API Server Settings.

### Demo Accounts

Pre-configured demo accounts include:
- Custom accounts (Default, Onboarding A-E)
- ORR (On-demand Recurring Revenue)
- Express accounts
- Standard accounts
- PNS (Payment Network Service) accounts
- SNS (Settlement Network Service) accounts
- Standard non-CBSP

You can also use custom accounts by entering an account ID in the "Other" field.

### Onboarding Settings

Configure:
- Terms of service URLs (full and recipient)
- Privacy policy URL
- Boolean options (skip terms, field options, requirements)

### Payments Filter Settings

Filter payments by:
- **Amount**: None, Equals, Greater than, Less than, Between
- **Date**: None, Before, After, Between
- **Status**: Multiple status filters (blocked, canceled, disputed, etc.)
- **Payment Method**: Filter by specific payment methods

## Architecture

### State Management

- **SettingsContext**: React Context for global app state
- **AsyncStorage**: Persistent storage for all settings

### Navigation

- **React Navigation**: Stack Navigator with modal presentation for settings screens
- **Navigation structure**:
  - Main screens (Home, Account Onboarding, Payouts, Payments)
  - Modal screens (Settings, Configure Appearance)
  - Nested screens (Onboarding Settings, Payments Filter Settings)

### Components

- **DropdownModal**: Custom modal-based dropdown for iOS-style selection
- **Reusable patterns**: Consistent styling across all screens

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

## Next Steps

To complete the implementation:

1. **Integrate actual Stripe Connect embedded components**:
   - Replace placeholder screens with actual Stripe Connect components
   - Implement account session creation
   - Add error handling for component loading

2. **Add backend integration**:
   - Implement API calls to create account sessions
   - Handle authentication and authorization
   - Add proper error handling

3. **Testing**:
   - Test on both iOS and Android devices
   - Verify all settings persist correctly
   - Test with different demo accounts

4. **Polish**:
   - Add loading states
   - Improve error messages
   - Add haptic feedback where appropriate

## License

This example app is for demonstration purposes.

## Related Documentation

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe React Native SDK](https://github.com/stripe/stripe-react-native)
- [Expo Documentation](https://docs.expo.dev/)
