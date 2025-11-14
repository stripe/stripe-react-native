import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  CollectionOptions,
  LoaderStart,
  PaymentsListDefaultFilters,
  StepChange,
} from './connectTypes';
import { CommonComponentProps, EmbeddedComponent } from './EmbeddedComponent';
import ModalCloseButton from './ModalCloseButton';

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
    onExit();
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

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.flex1}>
        <View style={styles.navBar}>
          <View style={styles.navBarPlaceholder} />
          <Text>{title}</Text>
          <ModalCloseButton onPress={onExitCallback} />
        </View>
        <View style={styles.onboardingWrapper}>
          {loading ? (
            <ActivityIndicator size="large" style={styles.activityIndicator} />
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
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBarPlaceholder: {
    width: 36,
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
  onboardingWrapper: {
    position: 'relative',
    flex: 1,
  },
});
