import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  AddressSheet,
  AddressSheetError,
  PaymentSheetError,
  useStripe,
} from '@stripe/stripe-react-native';
import { useCheckout } from '@stripe/stripe-react-native/src/hooks/useCheckout';
import { BottomActionBar, PlaygroundTitle, StatusBanner } from './components';
import {
  AddressSection,
  ItemsSection,
  OrderSummarySection,
  PromotionSection,
  SessionSection,
  ShippingOptionsSection,
} from './CheckoutPlaygroundCartSections';
import { cartStyles as styles } from './CheckoutPlaygroundCartStyles';
import {
  buildOrderSummaryRows,
  deriveSelectedShippingOptionId,
  getAddressLines,
  toAddressSheetDefaultValues,
  toCheckoutAddress,
} from './CheckoutPlaygroundCartUtils';
import {
  formatCurrencyAmount,
  supportsAdvancedCollection,
  type CheckoutPlaygroundConfig,
} from './types';

type FeedbackState = {
  tone: 'error' | 'success' | 'info';
  title: string;
  message: string;
};

type Props = {
  clientSecret: string;
  config: CheckoutPlaygroundConfig;
  onSuccessfulPayment(): void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isRecord(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }

  return fallback;
};

const getErrorCode = (error: unknown): string | undefined => {
  if (isRecord(error) && typeof error.code === 'string') {
    return error.code;
  }

  return undefined;
};

export function CheckoutPlaygroundCartView({
  clientSecret,
  config,
  onSuccessfulPayment,
}: Props) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [promotionCode, setPromotionCode] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [presentingPaymentSheet, setPresentingPaymentSheet] = useState(false);
  const [showShippingAddressSheet, setShowShippingAddressSheet] =
    useState(false);
  const [showBillingAddressSheet, setShowBillingAddressSheet] = useState(false);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<
    string | null
  >(null);

  const checkoutConfiguration = useMemo(
    () => ({
      adaptivePricing: {
        allowed: config.adaptivePricing,
      },
    }),
    [config.adaptivePricing]
  );

  const { state, checkout, error } = useCheckout(
    clientSecret,
    checkoutConfiguration
  );

  const session = state?.session;
  const isUpdating = state?.status === 'loading';
  const disableActions = isUpdating || presentingPaymentSheet;
  const shouldShowPromotionSection = supportsAdvancedCollection(config);
  const shouldShowLineItemSection = Boolean(session?.lineItems.length);
  const shouldShowShippingSection = Boolean(session?.shippingOptions.length);
  const shouldShowShippingAddressSection = Boolean(
    session && (config.shippingAddressCollection || session.shippingAddress)
  );
  const shouldShowBillingAddressSection = Boolean(
    session && (config.billingAddressCollection || session.billingAddress)
  );

  const displayedSelectedShippingOptionId = useMemo(() => {
    if (
      session?.shippingOptions.some(
        (shippingOption) => shippingOption.id === selectedShippingOptionId
      )
    ) {
      return selectedShippingOptionId;
    }

    return deriveSelectedShippingOptionId(session);
  }, [selectedShippingOptionId, session]);

  const shippingAddressLines = useMemo(
    () => getAddressLines(session?.shippingAddress),
    [session?.shippingAddress]
  );
  const billingAddressLines = useMemo(
    () => getAddressLines(session?.billingAddress),
    [session?.billingAddress]
  );
  const orderSummaryRows = useMemo(
    () => buildOrderSummaryRows(session?.totals),
    [session?.totals]
  );

  const runCheckoutAction = useCallback(
    async (title: string, action: () => Promise<void>) => {
      setFeedback(null);

      try {
        await action();
      } catch (actionError: unknown) {
        setFeedback({
          tone: 'error',
          title: `${title} failed`,
          message: getErrorMessage(
            actionError,
            'Unable to update the checkout session.'
          ),
        });
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    runCheckoutAction('Refresh', async () => {
      await checkout.refresh();
      setFeedback({
        tone: 'info',
        title: 'Checkout refreshed',
        message: 'Fetched the latest checkout session from Stripe.',
      });
    });
  }, [checkout, runCheckoutAction]);

  const handleUpdateQuantity = useCallback(
    (lineItemId: string, quantity: number) => {
      runCheckoutAction('Quantity update', () =>
        checkout.updateLineItemQuantity(lineItemId, quantity)
      );
    },
    [checkout, runCheckoutAction]
  );

  const handleSelectShippingOption = useCallback(
    (shippingOptionId: string) => {
      runCheckoutAction('Shipping option', async () => {
        await checkout.selectShippingOption(shippingOptionId);
        setSelectedShippingOptionId(shippingOptionId);
      });
    },
    [checkout, runCheckoutAction]
  );

  const handleApplyPromotionCode = useCallback(async () => {
    const trimmedCode = promotionCode.trim();
    if (!trimmedCode) {
      setFeedback({
        tone: 'error',
        title: 'Promotion code required',
        message: 'Enter a promotion code before applying it.',
      });
      return;
    }

    await runCheckoutAction('Promotion code', async () => {
      await checkout.applyPromotionCode(trimmedCode);
      setPromotionCode('');
      setFeedback({
        tone: 'success',
        title: 'Promotion code applied',
        message: 'The checkout session has been refreshed with the new code.',
      });
    });
  }, [checkout, promotionCode, runCheckoutAction]);

  const handleRemovePromotionCode = useCallback(async () => {
    await runCheckoutAction('Promotion code removal', async () => {
      await checkout.removePromotionCode();
      setFeedback({
        tone: 'info',
        title: 'Promotion code removed',
        message: 'The checkout session no longer has an applied discount.',
      });
    });
  }, [checkout, runCheckoutAction]);

  const handlePresentPaymentSheet = useCallback(async () => {
    if (state?.status !== 'loaded') {
      return;
    }

    setFeedback(null);
    setPresentingPaymentSheet(true);
    let shouldNavigateBack = false;

    try {
      const initResult = await initPaymentSheet({
        checkout,
        merchantDisplayName: 'Checkout Playground',
        returnURL: 'com.stripe.react.native://stripe-redirect',
        allowsDelayedPaymentMethods: true,
        billingDetailsCollectionConfiguration: {
          // TODO: Remove this once Android updates to set the customer email on the payment method.
          attachDefaultsToPaymentMethod: true,
        },
      });

      if (initResult.error) {
        throw initResult.error;
      }

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        throw presentResult.error;
      }

      if (presentResult.didCancel) {
        setFeedback({
          tone: 'info',
          title: 'PaymentSheet canceled',
          message: 'The customer dismissed the sheet before paying.',
        });
      } else {
        shouldNavigateBack = true;
      }
    } catch (paymentSheetError: unknown) {
      const errorCode = getErrorCode(paymentSheetError);
      let message = getErrorMessage(paymentSheetError, 'PaymentSheet failed.');

      if (errorCode === PaymentSheetError.Canceled) {
        message = 'The customer canceled PaymentSheet.';
      } else if (errorCode === PaymentSheetError.Timeout) {
        message =
          'PaymentSheet timed out before the customer completed the flow.';
      }

      setFeedback({
        tone: 'error',
        title: 'PaymentSheet failed',
        message,
      });
    } finally {
      setPresentingPaymentSheet(false);
    }

    if (shouldNavigateBack) {
      onSuccessfulPayment();
    }
  }, [
    checkout,
    initPaymentSheet,
    onSuccessfulPayment,
    presentPaymentSheet,
    state?.status,
  ]);

  if (error) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <PlaygroundTitle
            title="Checkout Playground"
            subtitle="The checkout session could not be loaded."
          />
          <StatusBanner
            tone="error"
            title="Unable to load checkout"
            message={error.message}
          />
        </ScrollView>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <PlaygroundTitle
            title="Checkout Playground"
            subtitle="Loading the live cart from the checkout session."
          />
          <StatusBanner
            tone="info"
            title="Loading checkout"
            message="The Checkout SDK is fetching the latest session snapshot."
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PlaygroundTitle
          title="Your Cart"
          subtitle="Review your items and complete checkout."
        />

        {feedback ? (
          <StatusBanner
            tone={feedback.tone}
            title={feedback.title}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        ) : null}

        {isUpdating ? (
          <StatusBanner
            tone="info"
            title="Updating checkout"
            message="A checkout mutation is in flight. The totals shown below may still be refreshing."
          />
        ) : null}

        {config.adaptivePricing ? (
          <StatusBanner
            tone="info"
            title="Adaptive pricing enabled"
            message={
              config.adaptivePricingCountry === 'none'
                ? 'The session allows localized pricing when supported.'
                : `The playground requested adaptive pricing for ${config.adaptivePricingCountry.toUpperCase()}.`
            }
          />
        ) : null}

        <SessionSection
          config={config}
          onRefresh={handleRefresh}
          session={session}
        />

        {shouldShowLineItemSection ? (
          <ItemsSection
            disableActions={disableActions}
            items={session.lineItems}
            onUpdateQuantity={handleUpdateQuantity}
          />
        ) : null}

        {shouldShowShippingSection ? (
          <ShippingOptionsSection
            disableActions={disableActions}
            onSelectShippingOption={handleSelectShippingOption}
            selectedShippingOptionId={displayedSelectedShippingOptionId}
            shippingOptions={session.shippingOptions}
          />
        ) : null}

        {shouldShowShippingAddressSection ? (
          <AddressSection
            actionLabel={
              session.shippingAddress
                ? 'Edit shipping address'
                : 'Add shipping address'
            }
            badge="A"
            disabled={disableActions}
            emptyMessage="No shipping address has been collected yet."
            lines={shippingAddressLines}
            onPress={() => setShowShippingAddressSheet(true)}
            title="Shipping address"
          />
        ) : null}

        {shouldShowBillingAddressSection ? (
          <AddressSection
            actionLabel={
              session.billingAddress
                ? 'Edit billing address'
                : 'Add billing address'
            }
            badge="B"
            disabled={disableActions}
            emptyMessage="No billing address has been collected yet."
            lines={billingAddressLines}
            onPress={() => setShowBillingAddressSheet(true)}
            title="Billing address"
          />
        ) : null}

        {shouldShowPromotionSection ? (
          <PromotionSection
            currency={session.currency}
            disableActions={disableActions}
            discounts={session.discounts}
            onApplyPromotionCode={() => {
              handleApplyPromotionCode();
            }}
            onChangePromotionCode={setPromotionCode}
            onRemovePromotionCode={() => {
              handleRemovePromotionCode();
            }}
            promotionCode={promotionCode}
          />
        ) : null}

        {orderSummaryRows.length > 0 ? (
          <OrderSummarySection
            currency={session.currency}
            rows={orderSummaryRows}
          />
        ) : null}
      </ScrollView>

      <AddressSheet
        visible={showShippingAddressSheet}
        sheetTitle="Shipping address"
        primaryButtonTitle="Use shipping address"
        allowedCountries={['US', 'CA', 'IE', 'GB']}
        additionalFields={{ phoneNumber: 'optional' }}
        defaultValues={toAddressSheetDefaultValues(session.shippingAddress)}
        onSubmit={async (result) => {
          setShowShippingAddressSheet(false);
          await runCheckoutAction('Shipping address', async () => {
            await checkout.updateShippingAddress(
              toCheckoutAddress(result.address),
              result.name,
              result.phone
            );
          });
        }}
        onError={(addressError) => {
          setShowShippingAddressSheet(false);
          if (addressError.code === AddressSheetError.Failed) {
            setFeedback({
              tone: 'error',
              title: 'Address collection failed',
              message:
                addressError.localizedMessage ||
                'Unable to collect the shipping address.',
            });
          }
        }}
      />

      <AddressSheet
        visible={showBillingAddressSheet}
        sheetTitle="Billing address"
        primaryButtonTitle="Use billing address"
        additionalFields={{ phoneNumber: 'optional' }}
        defaultValues={toAddressSheetDefaultValues(session.billingAddress)}
        onSubmit={async (result) => {
          setShowBillingAddressSheet(false);
          await runCheckoutAction('Billing address', async () => {
            await checkout.updateBillingAddress(
              toCheckoutAddress(result.address),
              result.name,
              result.phone
            );
          });
        }}
        onError={(addressError) => {
          setShowBillingAddressSheet(false);
          if (addressError.code === AddressSheetError.Failed) {
            setFeedback({
              tone: 'error',
              title: 'Address collection failed',
              message:
                addressError.localizedMessage ||
                'Unable to collect the billing address.',
            });
          }
        }}
      />

      <BottomActionBar
        primaryLabel={
          config.mode === 'setup'
            ? 'Set up payment method'
            : `Pay ${formatCurrencyAmount(
                session.totals?.total ?? 0,
                session.currency
              )}`
        }
        primaryDisabled={state?.status !== 'loaded' || presentingPaymentSheet}
        primaryLoading={presentingPaymentSheet}
        onPrimaryPress={() => {
          handlePresentPaymentSheet();
        }}
      />
    </View>
  );
}
