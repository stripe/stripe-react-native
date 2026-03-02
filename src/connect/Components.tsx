import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type {
  CollectionOptions,
  LoaderStart,
  PaymentsListDefaultFilters,
  StepChange,
} from './connectTypes';
import { CommonComponentProps, EmbeddedComponent } from './EmbeddedComponent';
import { NavigationBar } from './NavigationBar';
import NativeConnectAccountOnboardingView from '../specs/NativeConnectAccountOnboardingView';
import { useConnectComponents } from './ConnectComponentsProvider';

// Export NavigationBar for external use
export { NavigationBar } from './NavigationBar';
export type { NavigationBarProps } from './NavigationBar';

/**
 * A full-screen modal component for Connect account onboarding.
 * Guides connected accounts through the process of providing required information.
 *
 * **Platform differences:**
 * - iOS: Uses native modal with UIKit navigation bar
 * - Android: Uses React Native Modal with custom navigation bar
 *
 * @param props.title - Optional title displayed in navigation bar
 * @param props.onExit - Required callback when user closes the onboarding flow
 * @param props.onStepChange - Optional callback fired when onboarding step changes
 * @param props.recipientTermsOfServiceUrl - URL for recipient terms of service
 * @param props.fullTermsOfServiceUrl - URL for full terms of service
 * @param props.privacyPolicyUrl - URL for privacy policy
 * @param props.collectionOptions - Configuration for which account fields to collect
 * @param props.onLoaderStart - Callback when component begins loading
 * @param props.onLoadError - Callback when component fails to load
 * @param props.onPageDidLoad - Callback when component finishes loading
 *
 * @example
 * ```tsx
 * <ConnectAccountOnboarding
 *   title="Complete your account setup"
 *   onExit={() => navigation.goBack()}
 *   onStepChange={({ step }) => console.log('Current step:', step)}
 *   collectionOptions={{
 *     fields: 'currently_due',
 *     futureRequirements: 'include'
 *   }}
 * />
 * ```
 * @category Connect
 */
export function ConnectAccountOnboarding({
  title,
  onExit,
  onStepChange,
  recipientTermsOfServiceUrl,
  fullTermsOfServiceUrl,
  privacyPolicyUrl,
  collectionOptions,
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
}: {
  title?: string;
  onExit: () => void;
  onStepChange?: (stepChange: StepChange) => void;
  recipientTermsOfServiceUrl?: string;
  fullTermsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  collectionOptions?: CollectionOptions;
} & Omit<CommonComponentProps, 'style'>) {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const { appearance } = useConnectComponents();

  // Extract colors from appearance
  const backgroundColor = useMemo(() => {
    return appearance?.variables?.colorBackground || '#FFFFFF';
  }, [appearance]);

  const loadingIndicatorColor = useMemo(() => {
    return appearance?.variables?.colorSecondaryText || '#888888';
  }, [appearance]);

  const componentProps = useMemo(() => {
    return {
      setFullTermsOfServiceUrl: fullTermsOfServiceUrl,
      setRecipientTermsOfServiceUrl: recipientTermsOfServiceUrl,
      setPrivacyPolicyUrl: privacyPolicyUrl,
      setCollectionOptions: collectionOptions,
    };
  }, [
    fullTermsOfServiceUrl,
    recipientTermsOfServiceUrl,
    privacyPolicyUrl,
    collectionOptions,
  ]);

  const onExitCallback = useCallback(() => {
    setVisible(false);
    // We don't call onExit immediately because onExit will unmount this component
    // and first we need to the component to re-render to hide the modal,
    // otherwise the modal will remain visible on screen.
    setTimeout(onExit);
  }, [onExit]);

  const callbacks = useMemo(() => {
    return {
      onExit: onExitCallback,
      onStepChange,
      onCloseWebView: onExitCallback,
    };
  }, [onExitCallback, onStepChange]);

  const onLoaderStartCallback = useCallback(
    (event: LoaderStart) => {
      setLoading(false);
      if (onLoaderStart) {
        onLoaderStart(event);
      }
    },
    [onLoaderStart]
  );

  const { width, height } = useWindowDimensions();

  const containerStyle = useMemo(
    () => ({ width, height, position: 'absolute' as const }),
    [width, height]
  );

  // iOS: Use native modal with native navigation bar
  if (Platform.OS === 'ios') {
    return (
      <NativeConnectAccountOnboardingView
        visible={visible}
        title={title}
        backgroundColor={backgroundColor}
        onExitAction={onExitCallback}
        style={containerStyle}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={loadingIndicatorColor}
            style={styles.iosActivityIndicator}
          />
        ) : null}
        <EmbeddedComponent
          component="account-onboarding"
          componentProps={componentProps}
          onLoaderStart={onLoaderStartCallback}
          onLoadError={onLoadError}
          onPageDidLoad={onPageDidLoad}
          callbacks={callbacks}
          style={styles.flex1}
        />
      </NativeConnectAccountOnboardingView>
    );
  }

  // Android: Use React Native Modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.flex1}>
        <View
          style={[
            Platform.OS === 'android' && {
              paddingTop: StatusBar.currentHeight || 0,
            },
          ]}
        >
          <NavigationBar
            title={title}
            onCloseButtonPress={onExitCallback}
            style={styles.navBar}
          />
        </View>
        <View style={styles.onboardingWrapper}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={loadingIndicatorColor}
              style={styles.activityIndicator}
            />
          ) : null}
          <EmbeddedComponent
            component="account-onboarding"
            componentProps={componentProps}
            onLoaderStart={onLoaderStartCallback}
            onLoadError={onLoadError}
            onPageDidLoad={onPageDidLoad}
            callbacks={callbacks}
            style={[styles.flex1, { backgroundColor }]}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Displays a list of payments for the connected account with optional filtering.
 * Embed this component to show payment history and details.
 *
 * @param props.defaultFilters - Optional filters to apply to the payments list
 * @param props.onLoaderStart - Callback when component begins loading
 * @param props.onLoadError - Callback when component fails to load
 * @param props.onPageDidLoad - Callback when component finishes loading
 * @param props.style - Optional styling for the component container
 *
 * @example
 * ```tsx
 * <ConnectPayments
 *   defaultFilters={{
 *     status: ['successful', 'pending'],
 *     date: { after: new Date('2024-01-01') }
 *   }}
 *   style={{ flex: 1 }}
 * />
 * ```
 * @category Connect
 */
export function ConnectPayments({
  defaultFilters,
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
  style,
}: {
  defaultFilters?: PaymentsListDefaultFilters;
} & CommonComponentProps) {
  const componentProps = useMemo(() => {
    return {
      setDefaultFilters: defaultFilters,
    };
  }, [defaultFilters]);

  return (
    <EmbeddedComponent
      component="payments"
      onLoaderStart={onLoaderStart}
      onLoadError={onLoadError}
      onPageDidLoad={onPageDidLoad}
      componentProps={componentProps}
      style={style}
    />
  );
}

/**
 * Displays payout information for the connected account.
 * Shows payout history, schedules, and details.
 *
 * @param props.onLoaderStart - Callback when component begins loading
 * @param props.onLoadError - Callback when component fails to load
 * @param props.onPageDidLoad - Callback when component finishes loading
 * @param props.style - Optional styling for the component container
 *
 * @example
 * ```tsx
 * <ConnectPayouts style={{ flex: 1 }} />
 * ```
 * @category Connect
 */
export function ConnectPayouts({
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
  style,
}: CommonComponentProps) {
  return (
    <EmbeddedComponent
      component="payouts"
      onLoaderStart={onLoaderStart}
      onLoadError={onLoadError}
      onPageDidLoad={onPageDidLoad}
      style={style}
    />
  );
}

/**
 * Displays detailed information for a specific payment.
 * Typically used in a modal or detail view after selecting a payment from ConnectPayments.
 *
 * @param props.payment - The payment ID to display details for
 * @param props.onClose - Required callback when user closes the detail view
 * @param props.onLoaderStart - Callback when component begins loading
 * @param props.onLoadError - Callback when component fails to load
 * @param props.onPageDidLoad - Callback when component finishes loading
 * @param props.style - Optional styling for the component container
 *
 * @example
 * ```tsx
 * <ConnectPaymentDetails
 *   payment="py_1234567890"
 *   onClose={() => setShowDetails(false)}
 *   style={{ flex: 1 }}
 * />
 * ```
 * @category Connect
 */
export function ConnectPaymentDetails({
  payment,
  onClose,
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
  style,
}: {
  payment: string;
  onClose: () => void;
} & CommonComponentProps) {
  const componentProps = useMemo(() => {
    return {
      setPayment: payment,
    };
  }, [payment]);

  const callbacks = useMemo(() => {
    return {
      onClose,
    };
  }, [onClose]);

  return (
    <EmbeddedComponent
      component="payment-details"
      componentProps={componentProps}
      callbacks={callbacks}
      onLoaderStart={onLoaderStart}
      onLoadError={onLoadError}
      onPageDidLoad={onPageDidLoad}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 56,
  },
  flex1: {
    flex: 1,
  },
  activityIndicator: {
    zIndex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 48,
  },
  iosActivityIndicator: {
    zIndex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 160,
  },
  onboardingWrapper: {
    position: 'relative',
    flex: 1,
  },
});
