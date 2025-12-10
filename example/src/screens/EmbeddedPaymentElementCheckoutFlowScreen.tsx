import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import { API_URL } from '../Config';
import type {
  IntentConfiguration,
  EmbeddedPaymentElementConfiguration,
  BillingDetails,
  Address,
  IntentCreationCallbackParams,
  PaymentMethod,
  PaymentOptionDisplayData,
} from '@stripe/stripe-react-native';
import {
  useEmbeddedPaymentElement,
  AppearanceParams,
  RowStyle,
} from '@stripe/stripe-react-native';
import { colors } from '../colors';

type ScreenMode = 'checkout' | 'selection';

export default function EmbeddedPaymentElementCheckoutFlowScreen() {
  const [mode, setMode] = React.useState<ScreenMode>('checkout');
  const [loading, setLoading] = React.useState(false);

  // Hold configs once initialized
  const [intentConfig, setIntentConfig] =
    React.useState<IntentConfiguration | null>(null);
  const [elementConfig, setElementConfig] =
    React.useState<EmbeddedPaymentElementConfiguration | null>(null);

  // Fetch secrets and customer ID
  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${API_URL}/payment-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_key_type: 'customer_session' }),
    });
    const json = await response.json();
    return {
      customer: json.customer,
      customerSessionClientSecret: json.customerSessionClientSecret,
    };
  };

  // Initialize Stripe element configs
  const initialize = React.useCallback(async () => {
    const { customer, customerSessionClientSecret } =
      await fetchPaymentSheetParams();

    const address: Address = {
      city: 'San Francisco',
      country: 'US',
      line1: '510 Townsend St.',
      line2: 'Suite 123',
      postalCode: '94102',
      state: 'CA',
    };
    const billingDetails: BillingDetails = {
      name: 'Jane Doe',
      email: 'foo@bar.com',
      phone: '555-555-5555',
      address,
    };

    // Modern, clean appearance
    const appearance: AppearanceParams = {
      colors: {
        light: {
          primary: '#0A2540',
          background: '#FFFFFF',
          componentBackground: '#F6F9FC',
          componentBorder: '#E0E6EB',
          componentDivider: '#E0E6EB',
          primaryText: '#0A2540',
          secondaryText: '#516F90',
          componentText: '#0A2540',
          placeholderText: '#8898AA',
          icon: '#516F90',
          error: '#DF1B41',
        },
        dark: {
          primary: '#7A73FF',
          background: '#0A2540',
          componentBackground: '#1A3A5C',
          componentBorder: '#2D4F6C',
          componentDivider: '#2D4F6C',
          primaryText: '#FFFFFF',
          secondaryText: '#A3BFDC',
          componentText: '#FFFFFF',
          placeholderText: '#6B8EAD',
          icon: '#A3BFDC',
          error: '#FD665F',
        },
      },
      shapes: {
        borderRadius: 12,
        borderWidth: 1,
      },
      embeddedPaymentElement: {
        row: {
          style: RowStyle.FlatWithDisclosure,
          additionalInsets: 8,
          flat: {
            separatorThickness: 1,
            topSeparatorEnabled: false,
            bottomSeparatorEnabled: false,
          },
        },
      },
    };

    // Element UI config with immediate action behavior
    const uiConfig: EmbeddedPaymentElementConfiguration = {
      merchantDisplayName: 'Demo Store',
      returnURL: 'com.stripe.react.native://stripe-redirect',
      customerId: customer,
      customerSessionClientSecret,
      defaultBillingDetails: billingDetails,
      formSheetAction: {
        type: 'continue',
      },
      rowSelectionBehavior: {
        type: 'immediateAction',
        onSelectPaymentOption: () => {
          // Navigate back to checkout when a payment option is selected
          setMode('checkout');
        },
      },
      appearance,
    };

    // Intent config
    const newIntentConfig: IntentConfiguration = {
      confirmHandler: async (
        paymentMethod: PaymentMethod.Result,
        _save,
        callback: (res: IntentCreationCallbackParams) => void
      ) => {
        const resp = await fetch(
          `${API_URL}/payment-intent-for-payment-sheet`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethodId: paymentMethod.id,
              customerId: customer,
            }),
          }
        );
        const { clientSecret, error } = await resp.json();
        if (error)
          callback({
            error: {
              code: 'Failed',
              message: error.raw.message,
              localizedMessage: error.raw.message,
            },
          });
        else callback({ clientSecret });
      },
      mode: { amount: 2499, currencyCode: 'USD' },
      paymentMethodTypes: ['card', 'klarna', 'cashapp'],
    };

    setElementConfig(uiConfig);
    setIntentConfig(newIntentConfig);
  }, []);

  // Hook into Stripe element
  const {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    loadingError,
    isLoaded,
  } = useEmbeddedPaymentElement(intentConfig!, elementConfig!);

  // Payment action
  const handleBuy = React.useCallback(async () => {
    setLoading(true);
    const result = await confirm();
    if (result.status === 'completed') {
      Alert.alert('Success', 'Payment completed!');
    } else if (result.status === 'failed') {
      Alert.alert('Error', `Payment failed: ${result.error.message}`);
    } else {
      Alert.alert('Cancelled', 'Payment was cancelled');
    }
    setLoading(false);
  }, [confirm]);

  // Render both views but only show one at a time
  // This keeps the embedded element mounted to preserve its state
  return (
    <>
      {/* Selection Screen - shown when mode is 'selection' */}
      <View
        style={[
          styles.fullScreen,
          { display: mode === 'selection' ? 'flex' : 'none' },
        ]}
        pointerEvents={mode === 'selection' ? 'auto' : 'none'}
      >
        <SafeAreaView style={styles.selectionContainer}>
          <View style={styles.selectionHeader}>
            <TouchableOpacity
              onPress={() => setMode('checkout')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Select Payment Method</Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.embeddedContainer}>
            {loadingError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Failed to load:</Text>
                <Text style={styles.errorMessage}>{loadingError.message}</Text>
              </View>
            )}

            {!loadingError && !isLoaded && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.blurple} />
                <Text style={styles.loadingText}>
                  Loading payment methods...
                </Text>
              </View>
            )}

            <View style={{ opacity: isLoaded ? 1 : 0 }}>
              {embeddedPaymentElementView}
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Checkout Screen - shown when mode is 'checkout' */}
      <View
        style={[
          styles.fullScreen,
          { display: mode === 'checkout' ? 'flex' : 'none' },
        ]}
        pointerEvents={mode === 'checkout' ? 'auto' : 'none'}
      >
        <PaymentScreen onInit={initialize}>
          <View style={styles.checkoutContainer}>
            {/* Order Summary */}
            <View style={styles.orderSummary}>
              <Text style={styles.orderTitle}>Order Summary</Text>
              <View style={styles.orderItem}>
                <Text style={styles.itemName}>Premium Subscription</Text>
                <Text style={styles.itemPrice}>$24.99</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderItem}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalPrice}>$24.99</Text>
              </View>
            </View>

            {/* Payment Option Selector */}
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <PaymentOptionRow
              paymentOption={paymentOption}
              isLoaded={isLoaded}
              onPress={() => setMode('selection')}
            />

            {/* Buy Button */}
            <View style={styles.buyButtonContainer}>
              <Button
                variant="primary"
                title={`Pay $24.99`}
                onPress={handleBuy}
                loading={loading}
                disabled={!paymentOption || !isLoaded}
              />
            </View>

            {loadingError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorMessage}>{loadingError.message}</Text>
              </View>
            )}
          </View>
        </PaymentScreen>
      </View>
    </>
  );
}

// Component to display the selected payment option
function PaymentOptionRow({
  paymentOption,
  isLoaded,
  onPress,
}: {
  paymentOption: PaymentOptionDisplayData | null;
  isLoaded: boolean;
  onPress: () => void;
}) {
  if (!isLoaded) {
    return (
      <View style={styles.paymentOptionRow}>
        <ActivityIndicator size="small" color={colors.blurple} />
        <Text style={styles.paymentOptionPlaceholder}>
          Loading payment methods...
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.paymentOptionRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {paymentOption ? (
        <>
          {paymentOption.image && (
            <Image
              source={{ uri: `data:image/png;base64,${paymentOption.image}` }}
              style={styles.paymentIcon}
              resizeMode="contain"
            />
          )}
          <Text style={styles.paymentLabel}>{paymentOption.label}</Text>
        </>
      ) : (
        <Text style={styles.paymentOptionPlaceholder}>
          Select a payment method
        </Text>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Layout styles
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Checkout styles
  checkoutContainer: {
    flex: 1,
    padding: 20,
  },
  orderSummary: {
    backgroundColor: '#F6F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 16,
    color: '#516F90',
  },
  itemPrice: {
    fontSize: 16,
    color: '#0A2540',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E6EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A2540',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#516F90',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E6EB',
    padding: 16,
    marginBottom: 24,
  },
  paymentIcon: {
    width: 40,
    height: 26,
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#0A2540',
  },
  paymentOptionPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#8898AA',
  },
  chevron: {
    fontSize: 24,
    color: '#8898AA',
    fontWeight: '300',
  },
  buyButtonContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },

  // Selection screen styles
  selectionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6EB',
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.blurple,
    fontWeight: '500',
  },
  selectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0A2540',
  },
  embeddedContainer: {
    flex: 1,
    padding: 16,
  },

  // Shared styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#516F90',
  },
  errorContainer: {
    backgroundColor: '#FDF2F4',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DF1B41',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#DF1B41',
  },
});
