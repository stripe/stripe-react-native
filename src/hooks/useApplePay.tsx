import type { ApplePay } from '../types';
import { useEffect, useState } from 'react';
import { useStripe } from './useStripe';
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.StripeSdk);

export interface Props {
  onDidSetShippingContactCallback?: (
    shippingMethod: ApplePay.ShippingMethod
  ) => void;
  onDidSetShippingMethodCallback?: (
    shippingContact: ApplePay.ShippingContact
  ) => void;
}

/**
 * useApplePay hook
 */
export function useApplePay({
  onDidSetShippingContactCallback = () => {},
  onDidSetShippingMethodCallback = () => {},
}: Props = {}) {
  const {
    isApplePaySupported,
    presentApplePay: presentApplePayNative,
    confirmApplePayPayment: confirmApplePayPaymentNative,
  } = useStripe();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    eventEmitter.addListener('onDidSetShippingMethod', onDidSetShippingMethod);
    eventEmitter.addListener(
      'onDidSetShippingContact',
      onDidSetShippingContact
    );

    return () => {
      eventEmitter.removeListener(
        'onDidSetShippingMethod',
        onDidSetShippingMethod
      );
      eventEmitter.removeListener(
        'onDidSetShippingContact',
        onDidSetShippingMethod
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDidSetShippingMethod = (shippingMethod: any) => {
    onDidSetShippingMethodCallback(shippingMethod);
  };

  const onDidSetShippingContact = (shippingContact: any) => {
    onDidSetShippingContactCallback(shippingContact);
  };

  const presentApplePay = async (data: ApplePay.PresentParams) => {
    setLoading(true);
    const result = await presentApplePayNative(data);
    setLoading(false);
    return result;
  };

  const confirmApplePayPayment = async (clientSecret: string) => {
    setLoading(true);
    const result = await confirmApplePayPaymentNative(clientSecret);
    setLoading(false);
    return result;
  };

  return {
    loading,
    presentApplePay,
    confirmApplePayPayment,
    isApplePaySupported,
  };
}
