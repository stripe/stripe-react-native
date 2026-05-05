import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useEmbeddedPaymentElement,
  type EmbeddedPaymentElementResult,
} from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native/src/types/Checkout';
import { colors } from '../colors';
import SelectedPaymentOption from '../components/SelectedPaymentOption';
import { BottomActionBar, StatusBanner } from './components';
import { formatCurrencyAmount, type CheckoutPlaygroundMode } from './types';

type FeedbackState = {
  tone: 'error' | 'success' | 'info';
  title: string;
  message: string;
};

type Props = {
  checkout: Checkout;
  mode: CheckoutPlaygroundMode;
  currency?: string;
  total?: number;
  onClose(): void;
  onSuccessfulPayment(): void;
};

export function CheckoutPlaygroundEmbeddedView({
  checkout,
  mode,
  currency,
  total,
  onClose,
  onSuccessfulPayment,
}: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Embedded checkout</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close embedded checkout"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      <EmbeddedCheckoutBody
        checkout={checkout}
        mode={mode}
        currency={currency}
        total={total}
        onSuccessfulPayment={onSuccessfulPayment}
      />
    </SafeAreaView>
  );
}

type BodyProps = {
  checkout: Checkout;
  mode: CheckoutPlaygroundMode;
  currency?: string;
  total?: number;
  onSuccessfulPayment(): void;
};

function EmbeddedCheckoutBody({
  checkout,
  mode,
  currency,
  total,
  onSuccessfulPayment,
}: BodyProps) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Refs so the embedded configuration doesn't change identity each render
  // and force a re-create of the underlying element.
  const onSuccessfulPaymentRef = useRef(onSuccessfulPayment);
  onSuccessfulPaymentRef.current = onSuccessfulPayment;

  const handlePaymentResult = useCallback(
    (result: EmbeddedPaymentElementResult) => {
      if (result.status === 'completed') {
        onSuccessfulPaymentRef.current();
        return;
      }
      if (result.status === 'canceled') {
        setFeedback({
          tone: 'info',
          title: 'Payment canceled',
          message: 'The customer dismissed the payment flow before completing.',
        });
        return;
      }
      setFeedback({
        tone: 'error',
        title: 'Payment failed',
        message: result.error.message,
      });
    },
    []
  );

  const embeddedConfiguration = useMemo(
    () => ({
      merchantDisplayName: 'Checkout Playground',
      returnURL: 'com.stripe.react.native://stripe-redirect',
      // Confirm inside the form sheet for card-style methods. The result
      // arrives via this callback rather than the external `confirm()` Promise.
      formSheetAction: {
        type: 'confirm' as const,
        onFormSheetConfirmComplete: handlePaymentResult,
      },
    }),
    [handlePaymentResult]
  );

  const {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    loadingError,
    isLoaded,
  } = useEmbeddedPaymentElement(checkout, embeddedConfiguration);

  // Used by the bottom action bar for payment methods that don't open a
  // form sheet (e.g. Apple Pay, saved cards).
  const handleConfirm = useCallback(async () => {
    setFeedback(null);
    setConfirming(true);
    try {
      handlePaymentResult(await confirm());
    } finally {
      setConfirming(false);
    }
  }, [confirm, handlePaymentResult]);

  const primaryLabel =
    mode === 'setup'
      ? 'Set up payment method'
      : `Pay ${formatCurrencyAmount(total ?? 0, currency)}`;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Drives the same Checkout Session through Stripe's Embedded Payment
          Element.
        </Text>

        {feedback ? (
          <StatusBanner
            tone={feedback.tone}
            title={feedback.title}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        ) : null}

        {loadingError ? (
          <StatusBanner
            tone="error"
            title="Unable to load payment form"
            message={loadingError.message}
          />
        ) : null}

        <View style={styles.elementWrapper}>
          <View style={{ opacity: isLoaded ? 1 : 0 }}>
            {embeddedPaymentElementView}
          </View>
          {!isLoaded && !loadingError ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.blurple} />
              <Text style={styles.loadingText}>Loading payment options...</Text>
            </View>
          ) : null}
        </View>

        <SelectedPaymentOption paymentOption={paymentOption} />
      </ScrollView>

      <BottomActionBar
        primaryLabel={primaryLabel}
        primaryDisabled={!paymentOption || !isLoaded || confirming}
        primaryLoading={confirming}
        onPrimaryPress={handleConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.slate,
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  closeButtonText: {
    color: colors.blurple_dark,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  subtitle: {
    color: colors.dark_gray,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  elementWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  loadingOverlay: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.dark_gray,
    marginTop: 8,
  },
});
