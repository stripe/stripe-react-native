import React from 'react';
import {
  Alert,
  View,
  Text,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';
import SelectedPaymentOption from '../components/SelectedPaymentOption';
import { API_URL } from '../Config';
import {
  IntentConfiguration,
  EmbeddedPaymentElementConfiguration,
  AddressDetails,
  BillingDetails,
  Address,
  IntentCreationCallbackParams,
  CustomPaymentMethod,
  CustomPaymentMethodResult,
  CustomPaymentMethodResultStatus,
  ConfirmationToken,
} from '@stripe/stripe-react-native';
import {
  useEmbeddedPaymentElement,
  AppearanceParams,
  RowStyle,
} from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';

const ORIGINAL_AMOUNT = 6099;
const DISCOUNTED_AMOUNT = Math.round(ORIGINAL_AMOUNT * 0.85); // 15% off

function PaymentElementView({ intentConfig, elementConfig }: any) {
  const [loading, setLoading] = React.useState(false);
  const [discountApplied, setDiscountApplied] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Hook into Stripe element
  const {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    clearPaymentOption,
    update,
    loadingError,
    isLoaded,
  } = useEmbeddedPaymentElement(intentConfig!, elementConfig!);

  // Handle discount toggle
  const handleDiscountToggle = React.useCallback(
    async (value: boolean) => {
      setDiscountApplied(value);
      setIsUpdating(true);

      const updatedIntentConfig: IntentConfiguration = {
        ...intentConfig!,
        mode: {
          amount: value ? DISCOUNTED_AMOUNT : ORIGINAL_AMOUNT,
          currencyCode: 'USD',
        },
      };

      try {
        await update(updatedIntentConfig);
      } catch (error) {
        console.error('Unexpected error during update:', error);
        // Revert the toggle if update fails
        setDiscountApplied(!value);
      } finally {
        setIsUpdating(false);
      }
    },
    [intentConfig, update]
  );

  // Payment action
  const handlePay = React.useCallback(async () => {
    setLoading(true);
    const result = await confirm();
    if (result.status === 'completed')
      Alert.alert('Success', 'Payment confirmed');
    else if (result.status === 'failed')
      Alert.alert('Error', `Failed: ${result.error.message}`);
    else Alert.alert('Cancelled');
    setLoading(false);
  }, [confirm]);

  return (
    <>
      {loadingError && (
        <View style={{ padding: 12, backgroundColor: '#fee', margin: 8 }}>
          <Text style={{ color: '#900', fontWeight: '600' }}>
            Failed to load payment form:
          </Text>
          <Text style={{ color: '#900' }}>{loadingError.message}</Text>
        </View>
      )}

      {/* Discount toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>
            Apply 15% discount
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {discountApplied
              ? `$${(DISCOUNTED_AMOUNT / 100).toFixed(2)}`
              : `$${(ORIGINAL_AMOUNT / 100).toFixed(2)}`}
          </Text>
        </View>
        <Switch
          testID="discount_toggle_switch"
          value={discountApplied}
          onValueChange={handleDiscountToggle}
          disabled={isUpdating || !isLoaded}
        />
      </View>

      <View style={{ position: 'relative' }}>
        <View style={{ opacity: isLoaded ? 1 : 0 }}>
          {embeddedPaymentElementView}
        </View>

        {/* Updating overlay */}
        {isUpdating && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
            }}
          >
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
              Updating...
            </Text>
          </View>
        )}
      </View>

      {!isLoaded && !loadingError && (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Selected payment option */}
      <SelectedPaymentOption paymentOption={paymentOption} />

      <Button
        variant="primary"
        title="Complete payment"
        onPress={handlePay}
        loading={loading}
        disabled={!paymentOption || isUpdating}
      />

      <Button
        variant="default"
        title="Clear"
        onPress={clearPaymentOption}
        disabled={!paymentOption || isUpdating}
      />
      <View style={{ height: 40 }} />
    </>
  );
}

export default function EmbeddedPaymentElementScreen() {
  const navigation = useNavigation();

  // Local UI state
  const [modalVisible, setModalVisible] = React.useState(false);
  const [opensCardScannerAutomatically, setOpensCardScannerAutomatically] =
    React.useState(false);

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
  const initialize = React.useCallback(
    async (shippingDetails?: AddressDetails) => {
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

      const actionPink = '#EA0B8C'; // A vibrant pink color
      const brandWhite = '#FFFFFF';
      const lightGrayBg = '#F5F5F5'; // Backgrounds
      const mediumGrayUI = '#BDBDBD'; // Borders, placeholders
      const darkGrayText = '#6B6B6B'; // Secondary text (light mode)
      const nearBlackBg = '#1C1C1E'; // Dark mode background / Light mode primary text
      const nearWhiteText = '#E0E0E0'; // Dark mode primary text / Light mode backgrounds
      const darkComponentBg = '#2C2C2E'; // Dark mode component background
      const darkBorderColor = '#48484A'; // Dark mode border
      const darkSecondaryText = '#8E8E93'; // Dark mode secondary text

      // Blurple colors for success states
      const blurple = '#635BFF'; // Stripe's signature blurple color
      const blurpleText = '#FFFFFF'; // White text on blurple

      const appearance: AppearanceParams = {
        colors: {
          light: {
            primary: actionPink,
            background: brandWhite,
            componentBackground: lightGrayBg,
            componentBorder: mediumGrayUI,
            componentDivider: mediumGrayUI,
            primaryText: nearBlackBg,
            secondaryText: darkGrayText,
            componentText: nearBlackBg,
            placeholderText: mediumGrayUI,
            icon: darkGrayText,
            error: '#FF3B30', // Standard iOS red
          },
          dark: {
            primary: actionPink,
            background: nearBlackBg,
            componentBackground: darkComponentBg,
            componentBorder: darkBorderColor,
            componentDivider: darkBorderColor,
            primaryText: nearWhiteText,
            secondaryText: darkSecondaryText,
            componentText: nearWhiteText,
            placeholderText: darkSecondaryText, // Using secondary for better visibility
            icon: darkSecondaryText,
            error: '#FF453A', // Standard iOS dark red
          },
        },
        shapes: {
          borderRadius: 8, // Moderate rounding
          borderWidth: 1.0, // Standard subtle border
          shadow: {
            // Subtle shadow for elevation
            color: '#000000',
            opacity: 0.1,
            offset: { x: 0, y: 2 },
            blurRadius: 4,
          },
        },
        primaryButton: {
          shapes: {
            borderRadius: 8,
            borderWidth: 0,
          },
          colors: {
            light: {
              background: actionPink,
              text: brandWhite, // White text on pink
              border: '00000000', // No border color needed
              successBackgroundColor: blurple, // Blurple success background
              successTextColor: blurpleText, // White text on blurple
            } as any,
            dark: {
              background: actionPink,
              text: brandWhite, // White text on pink
              border: '#00000000', // No border color needed
              successBackgroundColor: blurple, // Blurple success background
              successTextColor: blurpleText, // White text on blurple
            } as any,
          },
        },
        embeddedPaymentElement: {
          row: {
            style: RowStyle.FloatingButton,
            flat: {
              separatorColor: { light: '#FF0000', dark: '#0000FF' },
              checkmark: { color: { light: '#FF0000', dark: '#0000FF' } },
              radio: {
                selectedColor: { light: '#FF0000', dark: '#0000FF' },
                unselectedColor: { light: '#FF0000', dark: '#0000FF' },
              },
            },
          },
        },
      };

      // 4. Element UI config
      const uiConfig: EmbeddedPaymentElementConfiguration = {
        merchantDisplayName: 'Example Inc.',
        returnURL: 'stripe-example://stripe-redirect',
        customerId: customer,
        customerSessionClientSecret,
        defaultBillingDetails: billingDetails,
        defaultShippingDetails: shippingDetails,
        formSheetAction: {
          type: 'continue',
        },
        customPaymentMethodConfiguration: {
          customPaymentMethods: [
            {
              id: 'cpmt_1RlDWcCWPdGs21gLuSlYP6FB', // The requested custom payment method ID
              subtitle: 'Demo custom payment method',
              disableBillingDetailCollection: false,
            },
          ],
          confirmCustomPaymentMethodCallback: (
            customPaymentMethod: CustomPaymentMethod,
            cpmBillingDetails: BillingDetails | null,
            confirmHandler: (result: CustomPaymentMethodResult) => void
          ) => {
            // Show an alert to simulate custom payment method processing
            Alert.alert(
              'Custom Payment Method',
              `Processing payment with ${customPaymentMethod.id}`,
              [
                {
                  text: 'Success',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Completed,
                    }),
                },
                {
                  text: 'Fail',
                  style: 'destructive',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Failed,
                      error: 'Custom payment failed',
                    }),
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () =>
                    confirmHandler({
                      status: CustomPaymentMethodResultStatus.Canceled,
                    }),
                },
              ]
            );
          },
        },
        appearance,
        opensCardScannerAutomatically,
      };

      // 5. Intent config
      const newIntentConfig: IntentConfiguration = {
        confirmationTokenConfirmHandler: async (
          confirmationToken: ConfirmationToken.Result,
          callback: (res: IntentCreationCallbackParams) => void
        ) => {
          const resp = await fetch(
            `${API_URL}/payment-intent-for-payment-sheet`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
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
        mode: { amount: 6099, currencyCode: 'USD' },
      };

      setElementConfig(uiConfig);
      setIntentConfig(newIntentConfig);
    },
    [opensCardScannerAutomatically]
  );

  // Update config when opensCardScannerAutomatically changes
  React.useEffect(() => {
    setElementConfig((prev) =>
      prev ? { ...prev, opensCardScannerAutomatically } : null
    );
  }, [opensCardScannerAutomatically]);

  return (
    <PaymentScreen onInit={initialize}>
      <View style={{ flexDirection: 'row', gap: 20, marginBottom: 10 }}>
        <Button
          variant="default"
          title="Open screen"
          onPress={() => {
            navigation.navigate('HomeScreen');
          }}
        />
        <Button
          variant="default"
          title="Open modal"
          onPress={() => {
            setModalVisible(true);
          }}
        />
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ marginEnd: 10, textAlignVertical: 'center' }}>
          Opens card scanner automatically
        </Text>
        <Switch
          value={opensCardScannerAutomatically}
          onValueChange={setOpensCardScannerAutomatically}
        />
      </View>
      {!modalVisible && (
        <PaymentElementView
          elementConfig={elementConfig}
          intentConfig={intentConfig}
        />
      )}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <SafeAreaView style={{ padding: 20 }}>
          <PaymentElementView
            elementConfig={elementConfig}
            intentConfig={intentConfig}
          />
          <Button
            variant="default"
            title="Close modal"
            onPress={() => {
              setModalVisible(false);
            }}
          />
        </SafeAreaView>
      </Modal>
    </PaymentScreen>
  );
}
