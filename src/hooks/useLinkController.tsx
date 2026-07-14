import { useState, useCallback } from 'react';
import { initLinkController, presentLinkController } from '../functions';
import type { LinkController } from '../types';

/**
 * `useLinkController` hook.
 *
 * Provides `initLinkController` and `presentLinkController` methods with a shared
 * `loading` state. Call `initLinkController` once when your checkout screen loads,
 * then `presentLinkController` when the customer taps your Link button.
 *
 * @PrivatePreview This API is in private preview and may change without notice.
 */
export function useLinkController() {
  const [loading, setLoading] = useState(false);

  const init = useCallback(
    async (
      params: LinkController.Configuration
    ): Promise<LinkController.InitResult> => {
      setLoading(true);
      const result = await initLinkController(params);
      setLoading(false);
      return result;
    },
    []
  );

  const present =
    useCallback(async (): Promise<LinkController.PresentResult> => {
      setLoading(true);
      const result = await presentLinkController();
      setLoading(false);
      return result;
    }, []);

  return {
    /** Whether an operation is currently in progress. */
    loading,
    /**
     * Initializes the LinkController with the provided configuration.
     * Must be called before `presentLinkController`.
     *
     * @PrivatePreview
     */
    initLinkController: init,
    /**
     * Presents the Link flow. Must be called after `initLinkController`.
     *
     * @PrivatePreview
     */
    presentLinkController: present,
  };
}
