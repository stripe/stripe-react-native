import type {
  CollectionOptions,
  PaymentsListDefaultFilters,
  StepChange,
} from './connectTypes';
import React, { useMemo } from 'react';
import { CommonComponentProps, EmbeddedComponent } from './EmbeddedComponent';

export function ConnectAccountOnboarding({
  onExit,
  onStepChange,
  recipientTermsOfServiceUrl,
  fullTermsOfServiceUrl,
  privacyPolicyUrl,
  collectionOptions,
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
  style,
}: {
  onExit: () => void;
  onStepChange?: (stepChange: StepChange) => void;
  recipientTermsOfServiceUrl?: string;
  fullTermsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  collectionOptions?: CollectionOptions;
} & CommonComponentProps) {
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

  const callbacks = useMemo(() => {
    return {
      onExit,
      onStepChange,
    };
  }, [onExit, onStepChange]);

  return (
    <EmbeddedComponent
      component="account-onboarding"
      componentProps={componentProps}
      onLoaderStart={onLoaderStart}
      onLoadError={onLoadError}
      onPageDidLoad={onPageDidLoad}
      callbacks={callbacks}
      style={style}
    />
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
