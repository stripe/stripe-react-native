import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  AddressSheet,
  AddressSheetError,
  PaymentSheet,
  PaymentSheetError,
  useStripe,
} from '@stripe/stripe-react-native';
import { CurrencySelectorElement } from '@stripe/stripe-react-native/src/components/CurrencySelectorElement';
import { useCheckout } from '@stripe/stripe-react-native/src/hooks/useCheckout';
import SelectedPaymentOption from '../components/SelectedPaymentOption';
import { BottomActionBar, PlaygroundTitle, StatusBanner } from './components';
import {
  AddressSection,
  ItemsSection,
  OrderSummarySection,
  PromotionSection,
  SessionSection,
  ShippingOptionsSection,
} from './CheckoutPlaygroundCartSections';
import { CheckoutPlaygroundEmbeddedView } from './CheckoutPlaygroundEmbeddedView';
import { cartStyles as styles } from './CheckoutPlaygroundCartStyles';
import {
  buildOrderSummaryRows,
  deriveSelectedShippingOptionId,
  getAddressLines,
  toAddressSheetDefaultValues,
  toCheckoutAddress,
} from './CheckoutPlaygroundCartUtils';
import {
  supportsAdvancedCollection,
  type CheckoutPlaygroundConfig,
} from './types';

type FeedbackState = {
  tone: 'error' | 'success' | 'info';
  title: string;
  message: string;
};

type FlowControllerStatus = 'idle' | 'initializing' | 'ready' | 'failed';

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

const getPaymentSheetFeedback = ({
  error,
  fallbackTitle,
  fallbackMessage,
  canceledTitle,
  canceledMessage,
}: {
  error: unknown;
  fallbackTitle: string;
  fallbackMessage: string;
  canceledTitle?: string;
  canceledMessage?: string;
}): FeedbackState => {
  const errorCode = getErrorCode(error);

  if (errorCode === PaymentSheetError.Canceled) {
    return {
      tone: 'info',
      title: canceledTitle ?? fallbackTitle,
      message:
        canceledMessage ??
        'The customer canceled the payment flow before it completed.',
    };
  }

  if (errorCode === PaymentSheetError.Timeout) {
    return {
      tone: 'error',
      title: fallbackTitle,
      message: 'PaymentSheet timed out before the customer completed the flow.',
    };
  }

  return {
    tone: 'error',
    title: fallbackTitle,
    message: getErrorMessage(error, fallbackMessage),
  };
};

export function CheckoutPlaygroundCartView({
  clientSecret,
  config,
  onSuccessfulPayment,
}: Props) {
  const { confirmPaymentSheetPayment, initPaymentSheet, presentPaymentSheet } =
    useStripe();
  const [promotionCode, setPromotionCode] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [presentingPaymentSheet, setPresentingPaymentSheet] = useState(false);
  const [flowControllerStatus, setFlowControllerStatus] =
    useState<FlowControllerStatus>('idle');
  const [presentingFlowController, setPresentingFlowController] =
    useState(false);
  const [confirmingFlowController, setConfirmingFlowController] =
    useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    useState<PaymentSheet.PaymentOption | null>(null);
  const [embeddedModalVisible, setEmbeddedModalVisible] = useState(false);
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

  const isEmbeddedIntegration = config.integrationType === 'embedded';
  const isFlowControllerIntegration =
    config.integrationType === 'paymentSheetFlowController';
  const session = state?.session;
  const isUpdating = state?.status === 'loading';
  const isFlowControllerInitializing = flowControllerStatus === 'initializing';
  const isFlowControllerReady = flowControllerStatus === 'ready';
  const isProcessingPaymentUi =
    presentingPaymentSheet ||
    isFlowControllerInitializing ||
    presentingFlowController ||
    confirmingFlowController;
  const disableActions = isUpdating || isProcessingPaymentUi;
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
    () => buildOrderSummaryRows(session?.total),
    [session?.total]
  );
  const flowControllerActionLabel = selectedPaymentOption
    ? 'Change payment method'
    : 'Choose payment method';
  const paymentSheetSetupParams = useMemo(
    () => ({
      checkout,
      merchantDisplayName: 'Checkout Playground',
      returnURL: 'com.stripe.react.native://stripe-redirect',
      allowsDelayedPaymentMethods: true,
      billingDetailsCollectionConfiguration: {
        // TODO: Remove this once Android updates to set the customer email on the payment method.
        attachDefaultsToPaymentMethod: true,
      },
    }),
    [checkout]
  );

  const initialiseFlowController = useCallback(
    async (options?: { reportError?: boolean }) => {
      if (state?.status !== 'loaded') {
        return false;
      }

      const reportError = options?.reportError ?? true;

      setFlowControllerStatus('initializing');
      setSelectedPaymentOption(null);

      try {
        const initResult = await initPaymentSheet({
          ...paymentSheetSetupParams,
          customFlow: true,
        });

        if (initResult.error) {
          throw initResult.error;
        }

        setSelectedPaymentOption(initResult.paymentOption ?? null);
        setFlowControllerStatus('ready');
        return true;
      } catch (paymentSheetError: unknown) {
        setFlowControllerStatus('failed');
        setSelectedPaymentOption(null);

        if (reportError) {
          setFeedback(
            getPaymentSheetFeedback({
              error: paymentSheetError,
              fallbackTitle: 'PaymentSheet.FlowController failed',
              fallbackMessage:
                'Unable to prepare the custom PaymentSheet flow.',
            })
          );
        }

        return false;
      }
    },
    [initPaymentSheet, paymentSheetSetupParams, state?.status]
  );

  useEffect(() => {
    if (!isFlowControllerIntegration) {
      setFlowControllerStatus('idle');
      setSelectedPaymentOption(null);
      return;
    }

    if (state?.status !== 'loaded' || flowControllerStatus !== 'idle') {
      return;
    }

    initialiseFlowController().catch(() => {});
  }, [
    flowControllerStatus,
    initialiseFlowController,
    isFlowControllerIntegration,
    state?.status,
  ]);

  const runCheckoutAction = useCallback(
    async (title: string, action: () => Promise<void>) => {
      setFeedback(null);

      try {
        await action();

        if (isFlowControllerIntegration) {
          await initialiseFlowController();
        }
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
    [initialiseFlowController, isFlowControllerIntegration]
  );

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

  const handleRunServerUpdate = useCallback(async () => {
    await runCheckoutAction('Server update', async () => {
      await checkout.runServerUpdate(async () => {
        // Simulate a server call with a short delay
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      });
      setFeedback({
        tone: 'success',
        title: 'Server update complete',
        message: 'The session was refreshed after the simulated server call.',
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
      const initResult = await initPaymentSheet(paymentSheetSetupParams);

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
      setFeedback(
        getPaymentSheetFeedback({
          error: paymentSheetError,
          fallbackTitle: 'PaymentSheet failed',
          fallbackMessage: 'PaymentSheet failed.',
          canceledTitle: 'PaymentSheet canceled',
          canceledMessage: 'The customer canceled PaymentSheet.',
        })
      );
    } finally {
      setPresentingPaymentSheet(false);
    }

    if (shouldNavigateBack) {
      onSuccessfulPayment();
    }
  }, [
    initPaymentSheet,
    onSuccessfulPayment,
    paymentSheetSetupParams,
    presentPaymentSheet,
    state?.status,
  ]);

  const handleChoosePaymentMethod = useCallback(async () => {
    if (state?.status !== 'loaded') {
      return;
    }

    setFeedback(null);

    let isReady = isFlowControllerReady;
    if (!isReady) {
      isReady = await initialiseFlowController();
    }

    if (!isReady) {
      return;
    }

    setPresentingFlowController(true);

    try {
      const presentResult = await presentPaymentSheet();

      if (presentResult.error) {
        throw presentResult.error;
      }

      if (presentResult.paymentOption) {
        setSelectedPaymentOption(presentResult.paymentOption);
      } else if (!presentResult.didCancel) {
        setSelectedPaymentOption(null);
      }

      if (presentResult.didCancel) {
        setFeedback({
          tone: 'info',
          title: 'Payment method selection canceled',
          message: 'The customer dismissed payment method selection.',
        });
      }
    } catch (paymentSheetError: unknown) {
      setFeedback(
        getPaymentSheetFeedback({
          error: paymentSheetError,
          fallbackTitle: 'PaymentSheet.FlowController failed',
          fallbackMessage: 'Unable to load payment methods.',
          canceledTitle: 'Payment method selection canceled',
          canceledMessage: 'The customer dismissed payment method selection.',
        })
      );
    } finally {
      setPresentingFlowController(false);
    }
  }, [
    initialiseFlowController,
    isFlowControllerReady,
    presentPaymentSheet,
    state?.status,
  ]);

  const handleConfirmFlowControllerPayment = useCallback(async () => {
    if (!selectedPaymentOption) {
      return;
    }

    setFeedback(null);
    setConfirmingFlowController(true);
    let shouldNavigateBack = false;

    try {
      const confirmResult = await confirmPaymentSheetPayment();
      if (confirmResult.error) {
        throw confirmResult.error;
      }

      shouldNavigateBack = true;
    } catch (paymentSheetError: unknown) {
      setFeedback(
        getPaymentSheetFeedback({
          error: paymentSheetError,
          fallbackTitle: 'PaymentSheet.FlowController failed',
          fallbackMessage: 'Unable to confirm the Checkout Session.',
          canceledTitle: 'Confirmation canceled',
          canceledMessage:
            'The customer canceled before the Checkout Session was confirmed.',
        })
      );
    } finally {
      setConfirmingFlowController(false);
    }

    if (shouldNavigateBack) {
      onSuccessfulPayment();
    }
  }, [confirmPaymentSheetPayment, onSuccessfulPayment, selectedPaymentOption]);

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
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isFlowControllerIntegration ? 216 : 128 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PlaygroundTitle
          title="Your Cart"
          subtitle={
            isFlowControllerIntegration
              ? 'Review your items, choose a payment method, then confirm the Checkout Session.'
              : 'Review your items and complete checkout.'
          }
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

        {isFlowControllerIntegration && isFlowControllerInitializing ? (
          <StatusBanner
            tone="info"
            title="Preparing PaymentSheet.FlowController"
            message="Refreshing payment options for the latest checkout session."
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

        <SessionSection config={config} session={session} />

        <TouchableOpacity
          disabled={disableActions}
          onPress={handleRunServerUpdate}
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: disableActions ? '#E5E7EB' : '#EEF2FF',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: disableActions ? '#9CA3AF' : '#4338CA',
              fontWeight: '600',
            }}
          >
            Test runServerUpdate (2s simulated server call)
          </Text>
        </TouchableOpacity>

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
            disableActions={disableActions}
            discountAmounts={session.discountAmounts}
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

        {config.adaptivePricing ? (
          <View style={{ marginBottom: 16 }} testID="currency_selector_element">
            <CurrencySelectorElement
              checkout={checkout}
              disabled={isUpdating}
            />
          </View>
        ) : null}

        {orderSummaryRows.length > 0 ? (
          <OrderSummarySection rows={orderSummaryRows} />
        ) : null}

        {isFlowControllerIntegration ? (
          <SelectedPaymentOption paymentOption={selectedPaymentOption} />
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
            : `Pay ${session.total?.total.amount ?? '--'}`
        }
        primaryDisabled={
          state?.status !== 'loaded' ||
          disableActions ||
          (isFlowControllerIntegration && !selectedPaymentOption)
        }
        primaryLoading={presentingPaymentSheet || confirmingFlowController}
        secondaryLabel={
          isFlowControllerIntegration ? flowControllerActionLabel : undefined
        }
        secondaryDisabled={state?.status !== 'loaded' || disableActions}
        onSecondaryPress={
          isFlowControllerIntegration ? handleChoosePaymentMethod : undefined
        }
        onPrimaryPress={() => {
          if (isEmbeddedIntegration) {
            setFeedback(null);
            setEmbeddedModalVisible(true);
          } else if (isFlowControllerIntegration) {
            handleConfirmFlowControllerPayment();
          } else {
            handlePresentPaymentSheet();
          }
        }}
      />

      <Modal
        visible={embeddedModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEmbeddedModalVisible(false)}
      >
        {state?.status === 'loaded' ? (
          <CheckoutPlaygroundEmbeddedView
            checkout={checkout}
            mode={config.mode}
            totalLabel={session.total?.total.amount}
            onClose={() => setEmbeddedModalVisible(false)}
            onSuccessfulPayment={() => {
              setEmbeddedModalVisible(false);
              onSuccessfulPayment();
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}
