import type { ConfirmSetupIntent } from '../types';
/**
 * useConfirmSetupIntent hook
 */
export declare function useConfirmSetupIntent(): {
    confirmSetupIntent: (paymentIntentClientSecret: string, data: ConfirmSetupIntent.Params, options?: ConfirmSetupIntent.Options) => Promise<import("../types").ConfirmSetupIntentResult>;
    loading: boolean;
};
