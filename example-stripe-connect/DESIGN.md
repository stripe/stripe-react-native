# Stripe Connect Example App - Design Document

## Overview

This is an Expo application that demonstrates Stripe Connect embedded components using the `@stripe/stripe-react-native` SDK. The app showcases the three main Connect embedded components: Account Onboarding, Payouts, and Payments.

## Purpose

Provide a working example and reference implementation for developers integrating Stripe Connect embedded components into their React Native/Expo applications.

## Target Features

### Stripe Connect Embedded Components
- [x] **Account Onboarding** - Localized onboarding form with data validation
- [x] **Payouts (Beta)** - Show payouts and allow users to perform payouts
- [x] **Payments (Beta)** - Show payments and allow users to view payment details and manage disputes

## Architecture

### Tech Stack
- **Framework**: Expo (React Native)
- **SDK**: `@stripe/stripe-react-native`
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack Navigator)
- **State Management**: React Context for settings management
- **Data Fetching**: TanStack React Query (for API requests)
- **Persistence**: AsyncStorage

### Backend Requirements
- **Default Backend**: Remote server at `https://stripe-connect-mobile-example-v1.stripedemos.com/`
- **Configurable**: Users can change backend URL in settings
- Required endpoints:
  - `POST /account-session` - Create account session for embedded components
  - Any other Connect-specific endpoints needed by the embedded components

### State Management & Persistence
- **Data Fetching**: TanStack React Query for:
  - Fetching merchants list from API (`GET /app_info`)
  - Automatic caching and refetching
  - Loading states and error handling
  - 5-minute stale time for cached data
- **Settings Storage**: AsyncStorage for persisting:
  - Selected merchant ID
  - Custom merchant ID (if "Other" is selected)
  - Backend URL (if changed from default)
  - Component-specific settings (onboarding, payments filters)
- **App State**: React Context for:
  - Current selected merchant (from API)
  - Available merchants list (from React Query)
  - Publishable key (from API)
  - Settings values accessible across screens
  - Settings change tracking (for enabling/disabling Save button)

## User Flow

1. App launches to **Home Screen** with list of Connect components
2. User can select demo account from navigation bar (painter palette icon)
3. User can access settings from home screen (gear icon)
4. User taps on a component (Account Onboarding, Payouts, or Payments)
5. App navigates to component-specific screen showing the embedded component
6. User interacts with the embedded component
7. User can navigate back to home screen or switch accounts

## Screens/Components

### 1. Home Screen
- **Purpose**: Main menu to access all Connect embedded components
- **Features**:
  - List of available components with descriptions
  - Settings icon (gear) in navigation bar (top-left) - Opens Settings modal
  - Appearance selector (palette icon) in navigation bar (top-right) - Opens Configure Appearance modal
  - Navigation to component screens
- **UI Elements**:
  - Header: "Demo account: [Account Name]"
  - Three list items:
    - "Account onboarding" - "Show a localized onboarding form that validates data."
    - "Payouts Beta" - "Show payouts and allow your users to perform payouts."
    - "Payments Beta" - "Show payments and allow your users to view payment details and manage disputes."

### 2. Account Onboarding Screen
- **Purpose**: Display the account onboarding embedded component
- **Features**:
  - Embedded onboarding form
  - Appearance selector (palette icon) in navigation bar
  - Back navigation to home

### 3. Payouts Screen
- **Purpose**: Display the payouts embedded component
- **Features**:
  - Embedded payouts interface
  - Appearance selector (palette icon) in navigation bar
  - Back navigation to home

### 4. Payments Screen
- **Purpose**: Display the payments embedded component
- **Features**:
  - Embedded payments interface
  - Appearance selector (palette icon) in navigation bar
  - Back navigation to home

### 5. Settings Screen
- **Purpose**: Configure app settings and manage demo accounts
- **Presentation**: Modal window
- **Navigation**:
  - Cancel button (left) - Dismisses modal without saving
  - Save button (right) - Saves changes and dismisses modal
  - **Save button state**: Disabled (grayed out) when no changes have been made
- **Persistence**: All settings saved using AsyncStorage
- **Sections**:

  #### Section 1: Select a demo account
  - List of pre-configured demo accounts
  - Each account shows:
    - Display name with type in parentheses (e.g., "Default (Custom)", "Onboarding A (Custom)")
    - Account ID below the name (e.g., "acct_1N9FIXfQ26HdRIxHg")
  - Selected account shows checkmark on the right
  - User can select one account at a time

  **Pre-configured Demo Account Types:**
  - Custom accounts (Default, Onboarding A-E)
  - ORR (On-demand Recurring Revenue)
  - Express accounts
  - Standard accounts
  - PNS (Payment Network Service) accounts (1-4)
  - SNS (Settlement Network Service) accounts (1-4)
  - Standard non-CBSP

  **Custom Account Entry:**
  - "Other" option at the end of the list
  - Text input field with placeholder "acct_xxxx"
  - Allows users to enter their own Stripe connected account ID

  #### Section 2: Component Settings
  - Header: "Component Settings"
  - Navigation items (chevron on the right):
    - **Account onboarding** - Navigate to account onboarding-specific settings
    - **Payments** - Navigate to payments component settings

### 6. Onboarding Settings Screen
- **Purpose**: Configure account onboarding component options
- **Presentation**: Pushed onto navigation stack (back button to return)
- **Navigation**:
  - Back button (left) - Returns to Settings screen
  - Save button (right) - Saves changes (disabled when no changes)
- **Settings Fields**:

  **URL Fields (Text Inputs):**
  - **Full terms of service** - URL input with placeholder "https://example.com"
  - **Recipient terms of service** - URL input with placeholder "https://example.com"
  - **Privacy policy** - URL input with placeholder "https://example.com"

  **Boolean Options (Dropdowns with 3 values):**
  - **Skip terms of service** - Dropdown: "Default" | "False" | "True"
  - **Field option** - Dropdown: "Default" | "False" | "True"
  - **Future requirements** - Dropdown: "Default" | "False" | "True"
  - **Requirements** - Dropdown: "Default" | "False" | "True"

  **Reset Button:**
  - Blue text link: "Reset to defaults"
  - Restores all onboarding settings to their default values

### 7. Payments Filter Settings Screen
- **Purpose**: Configure filters for the Payments component
- **Presentation**: Pushed onto navigation stack (back button to return)
- **Navigation**:
  - Back button (left) - Returns to Settings screen
  - Save button (right) - Saves changes (disabled when no changes)
- **Settings Sections**:

  #### Amount Filter
  - **Amount Filter Type** - Dropdown with options:
    - None (default, selected with checkmark)
    - Equals
    - Greater than
    - Less than
    - Between
  - **Single Amount Input** - (appears when filter type is "Equals", "Greater than", or "Less than")
    - Layout: Label on left ("Amount (dollars)"), input on right
    - Numeric text input field
    - Placeholder: "0"
  - **Range Amount Inputs** - (appears when filter type is "Between")
    - Two rows:
      1. Label: "Lower bound (dollars)" | Input field (right side)
      2. Label: "Upper bound (dollars)" | Input field (right side)
    - Numeric text input fields
    - Placeholder: "0"

  #### Date Filter
  - **Date Filter Type** - Dropdown with options:
    - None (default, selected with checkmark)
    - Before
    - After
    - Between
  - **Single Date Input** - (appears when filter type is "Before" or "After")
    - Layout: Label on left, date display on right
    - Label changes based on filter type:
      - "Before Date" (when "Before" is selected)
      - "After Date" (when "After" is selected)
    - Date selector using `@react-native-community/datetimepicker`
    - Date display format: "30 Nov 2025" (DD MMM YYYY)
    - Tapping date opens native date picker:
      - iOS: Spinner-style picker with "Done" button
      - Android: System date picker dialog
  - **Range Date Inputs** - (appears when filter type is "Between")
    - Two rows:
      1. Label: "Start Date" | Date display (right side)
      2. Label: "End Date" | Date display (right side)
    - Each date is tappable and opens the native date picker
    - Date display format: "30 Nov 2025" (DD MMM YYYY)

  #### Status Filter
  - Header: "Status Filter"
  - **Multi-select list** (users can select zero or many):
    - Blocked
    - Canceled
    - Disputed
    - Early Fraud Warning
    - Failed
    - Incomplete
    - Partially Refunded
    - Pending
    - Refund Pending
    - Refunded
    - Successful
    - Uncaptured
  - Selected items show checkmark on the right
  - No visual indicator when unselected (just plain text)

  #### Payment Method Filter
  - **Payment Method** - Dropdown (single selection) with options:
    - None (default, selected with checkmark)
    - Ach Credit Transfer
    - Ach Debit
    - Acss Debit
    - Affirm
    - Afterpay Clearpay
    - Alipay
    - Alma
    - Amazon Pay
    - Amex Express Checkout
    - Android Pay
    - [Note: This is a partial list - there may be more payment methods]

  **Reset Button:**
  - Blue text link: "Reset to defaults"
  - Restores all payment filter settings to their default values

### 8. Configure Appearance Screen
- **Purpose**: Select appearance/theme preset for the embedded components
- **Presentation**: Modal window
- **Navigation**:
  - Cancel button (left) - Dismisses modal without saving
  - Save button (right) - Saves selection and dismisses modal
  - **Save button state**: Disabled (grayed out) when no changes have been made
- **Content**:
  - Header: "Select a preset"
  - **Single-select list** of appearance presets:
    - Default (selected by default with checkmark)
    - Custom Font
    - Dark mode
    - Dynamic colors
    - Forest
    - Hot Dog Stand
    - Link
    - Ocean Breeze
    - Ogre
    - Retro
  - Selected preset shows checkmark on the right
- **Persistence**: Selected appearance saved using AsyncStorage

  #### Section 3: API Server Settings
  - Header: "API Server Settings"
  - **Backend URL field:**
    - Text input for custom backend server URL
    - Default value: `https://stripe-connect-mobile-example-v1.stripedemos.com/`
    - Editable by user
  - **Reset to default button:**
    - Blue text link: "Reset to default"
    - Restores the default backend URL when tapped

## Default Values & Initial State

When the app launches for the first time (no saved settings in AsyncStorage):

### Account Settings
- **Selected Account**: "Default (Custom)" - first account in the list
- **Account ID**: `acct_1N9FIXfQ26HdRIxHg`

### Backend Settings
- **Backend URL**: `https://stripe-connect-mobile-example-v1.stripedemos.com/`

### Appearance Settings
- **Selected Preset**: "Default"

### Onboarding Component Settings
- **Full terms of service**: Empty
- **Recipient terms of service**: Empty
- **Privacy policy**: Empty
- **Skip terms of service**: Default
- **Field option**: Default
- **Future requirements**: Default
- **Requirements**: Default

### Payments Filter Settings
- **Amount Filter Type**: None
- **Amount Value**: Empty
- **Amount Lower Bound**: Empty
- **Amount Upper Bound**: Empty
- **Date Filter Type**: None
- **Date Value**: Empty
- **Start Date**: Empty
- **End Date**: Empty
- **Status Filter**: No statuses selected (all unchecked)
- **Payment Method**: None

## Implementation Notes

- Standalone Expo app in `example-stripe-connect/` directory
- Uses remote backend by default (no local server required)
- All settings persist using AsyncStorage
- Supports both iOS and Android
- Uses TypeScript for type safety
- Follows existing example app patterns where applicable

### API Integration
- **API Client**: Custom TypeScript client in `src/api/StripeConnectAPI.ts`
  - Type-safe requests and responses
  - Comprehensive error handling
  - Converts API snake_case to camelCase
- **Data Types**: Uses `MerchantInfo` from API (no local DemoAccount type)
  - `merchant_id`: Stripe account ID
  - `display_name`: Human-readable merchant name (nullable)
- **React Query Integration**:
  - Query key: `['appInfo', backendUrl]`
  - Automatic refetch when backend URL changes
  - 5-minute stale time
  - Graceful error handling with fallbacks

### UI/UX Components
- **Native Menus**: Uses `@react-native-menu/menu` for dropdown menus
  - iOS: UIMenu component (iOS 14+)
  - Android: PopupMenu component
  - Renders natively on top of modals
- **Date Picker**: Uses `@react-native-community/datetimepicker`
  - iOS: Spinner-style inline picker with "Done" button
  - Android: System date picker dialog
- **Layout Pattern**: Label-on-left, input-on-right for filter settings
  - Provides consistent visual alignment
  - Makes efficient use of horizontal space

## Technical Considerations

### Expo Configuration
- Need to configure Stripe SDK plugin in `app.json`
- Minimum iOS/Android version requirements per Stripe SDK
- Required permissions for the app

### State Management
- React Context for global state (selected account, appearance, settings)
- AsyncStorage for persistence
- Settings change detection for enabling/disabling Save buttons
- `useCallback` hooks for performance optimization of handler functions
- State management for date picker (active field, visibility, temporary date value)

### Navigation Structure
```
Stack Navigator
├── Home Screen
├── Account Onboarding Screen
├── Payouts Screen
├── Payments Screen
└── Modals:
    ├── Settings Modal
    │   ├── Settings Screen
    │   ├── Onboarding Settings Screen
    │   └── Payments Filter Settings Screen
    └── Configure Appearance Modal
```

---

**Status**: Ready for implementation
