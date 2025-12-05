import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
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

  const textColor = useMemo(() => {
    return appearance?.variables?.colorText || '#000000';
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

  const containerStyle = useMemo(() => ({ width, height }), [width, height]);

  // iOS: Use native modal with native navigation bar
  if (Platform.OS === 'ios') {
    return (
      <NativeConnectAccountOnboardingView
        visible={visible}
        title={title}
        backgroundColor={backgroundColor}
        textColor={textColor}
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
        <NavigationBar
          title={title}
          onCloseButtonPress={onExitCallback}
          style={styles.navBar}
        />
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
