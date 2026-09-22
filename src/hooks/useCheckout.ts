import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCheckout,
  getCheckoutControllerId,
  normalizeCheckoutError,
} from '../checkout/createCheckout';
import { addCheckoutControllerListener } from '../checkout/CheckoutControllerEventEmitter';
import type { Checkout, CheckoutController } from '../types/Checkout';

type State = Pick<
  Checkout.UseResult,
  'status' | 'session' | 'paymentElement' | 'currencySelectorElement' | 'error'
>;
const idle: State = {
  status: 'idle',
  session: null,
  paymentElement: null,
  currencySelectorElement: null,
  error: null,
};

/**
 * Loads Checkout and exposes native session updates. The hook destroys its
 * controller on disable, reload, and unmount. Changing getConfiguration does
 * not reload automatically; reload uses its latest value.
 *
 * @remarks
 * This API is in private preview and can change without notice.
 *
 * @CheckoutSessionPrivatePreview
 */
export function useCheckout(options: Checkout.UseOptions): Checkout.UseResult {
  const enabled = options.enabled ?? true;
  const configuration = useRef(options.getConfiguration);
  configuration.current = options.getConfiguration;
  const active = useRef(false);
  const generation = useRef(0);
  const owned = useRef<
    { controller: CheckoutController; remove: () => void } | undefined
  >(undefined);
  const [state, setState] = useState<State>(idle);
  const destruction = useRef<Promise<void> | undefined>(undefined);

  const release = useCallback(async () => {
    const previous = owned.current;
    owned.current = undefined;
    previous?.remove();
    const pending = previous
      ? previous.controller.destroy()
      : destruction.current;
    destruction.current = pending;
    try {
      await pending;
    } finally {
      if (destruction.current === pending) {
        destruction.current = undefined;
      }
    }
  }, []);

  const reload = useCallback(async () => {
    if (!active.current) {
      return;
    }
    const request = ++generation.current;
    const current = () => active.current && generation.current === request;
    setState({ ...idle, status: 'loading' });
    try {
      await release();
      if (!current()) {
        return;
      }
      const createOptions = await configuration.current();
      if (!current()) {
        return;
      }
      const controller = await createCheckout(createOptions);
      if (!current()) {
        await controller.destroy();
        return;
      }
      const update = () => {
        if (!current()) {
          return;
        }
        setState(
          controller.status === 'destroyed'
            ? {
                ...idle,
                status: 'error',
                error: {
                  code: 'Canceled',
                  message: 'The Checkout controller was destroyed.',
                },
              }
            : {
                status: controller.status,
                session: controller.session,
                paymentElement: controller.paymentElement,
                currencySelectorElement: controller.currencySelectorElement,
                error: null,
              }
        );
      };
      update();
      const subscription = addCheckoutControllerListener(
        getCheckoutControllerId(controller),
        update
      );
      owned.current = { controller, remove: () => subscription.remove() };
    } catch (error) {
      if (current()) {
        setState({
          ...idle,
          status: 'error',
          error: normalizeCheckoutError(error),
        });
      }
      throw error;
    }
  }, [release]);

  useEffect(() => {
    active.current = enabled;
    if (enabled) {
      // The hook exposes initialization failures through its error state.
      reload().catch(() => {});
    } else {
      setState(idle);
    }
    return () => {
      active.current = false;
      generation.current += 1;
      // Cleanup cannot report errors through an unmounted hook.
      release().catch(() => {});
    };
  }, [enabled, reload, release]);

  const methods = useMemo<Omit<Checkout.UseResult, keyof State>>(() => {
    const controller = () => {
      if (!active.current || !owned.current) {
        throw new Error('Checkout has not loaded a controller.');
      }
      return owned.current.controller;
    };
    return {
      reload,
      updateEmail: async (email) => controller().updateEmail(email),
      updateShippingAddress: async (address) =>
        controller().updateShippingAddress(address),
      applyPromotionCode: async (code) => controller().applyPromotionCode(code),
      removePromotionCode: async () => controller().removePromotionCode(),
      clearPaymentOption: async () => controller().clearPaymentOption(),
      runServerUpdate: async (callback) =>
        controller().runServerUpdate(callback),
      confirm: async () => controller().confirm(),
    };
  }, [reload]);

  return { ...(enabled ? state : idle), ...methods };
}
