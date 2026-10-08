import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCheckoutController,
  normalizeCheckoutError,
} from '../checkout/createCheckout';
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

function stateForController(controller: CheckoutController): State {
  if (controller.status === 'destroyed') {
    return {
      ...idle,
      status: 'error',
      error: {
        code: 'Canceled',
        message: 'The Checkout controller was destroyed.',
      },
    };
  }
  return {
    status: controller.status,
    session: controller.session,
    paymentElement: controller.paymentElement,
    currencySelectorElement: controller.currencySelectorElement,
    error: null,
  };
}

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
  const controller = useRef<CheckoutController | undefined>(undefined);
  const destruction = useRef<Promise<void> | undefined>(undefined);
  const [state, setState] = useState<State>(idle);

  const destroy = useCallback(async () => {
    const previous = controller.current;
    controller.current = undefined;
    const pending = previous ? previous.destroy() : destruction.current;
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
    const isCurrent = () => active.current && generation.current === request;
    setState({ ...idle, status: 'loading' });
    try {
      await destroy();
      if (!isCurrent()) {
        return;
      }
      const createOptions = await configuration.current();
      if (!isCurrent()) {
        return;
      }
      const next = await createCheckoutController(createOptions, (updated) => {
        if (isCurrent() && controller.current === updated) {
          setState(stateForController(updated));
        }
      });
      if (!isCurrent()) {
        await next.destroy();
        return;
      }
      controller.current = next;
      setState(stateForController(next));
    } catch (error) {
      if (isCurrent()) {
        setState({
          ...idle,
          status: 'error',
          error: normalizeCheckoutError(error),
        });
      }
      throw error;
    }
  }, [destroy]);

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
      destroy().catch(() => {});
    };
  }, [destroy, enabled, reload]);

  const methods = useMemo<Omit<Checkout.UseResult, keyof State>>(() => {
    const currentController = () => {
      if (!active.current || !controller.current) {
        throw new Error('Checkout has not loaded a controller.');
      }
      return controller.current;
    };
    return {
      reload,
      updateEmail: async (email) => currentController().updateEmail(email),
      updateShippingAddress: async (address) =>
        currentController().updateShippingAddress(address),
      applyPromotionCode: async (code) =>
        currentController().applyPromotionCode(code),
      removePromotionCode: async () =>
        currentController().removePromotionCode(),
      clearPaymentOption: async () => currentController().clearPaymentOption(),
      runServerUpdate: async (callback) =>
        currentController().runServerUpdate(callback),
      confirm: async () => currentController().confirm(),
    };
  }, [reload]);

  return { ...(enabled ? state : idle), ...methods };
}
