import React from 'react';
import {
  AccessibilityProps,
  requireNativeComponent,
  NativeSyntheticEvent,
} from 'react-native';
import type {
  PaymentSheetError,
  StripeError,
  PaymentSheet,
  Address,
} from '../types';

const AddressSheetNative = requireNativeComponent<any>('AddressSheet');

/**
 *  Props
 */
export interface Props extends AccessibilityProps {
  /** Whether the sheet is visible. Defaults to false. */
  visible: boolean;
  /** Controls how the modal is presented (after animation). iOS only. Defaults to `popover`. */
  presentationStyle?: 'fullscreen' | 'popover';
  /** Controls how the modal animates. iOS only. */
  animationStyle?: 'flip' | 'curl' | 'slide' | 'dissolve';
  /** Configuration for the look and feel of the UI. */
  appearance?: PaymentSheet.AppearanceParams;
  /** The values to prepopulate the sheet's fields with. */
  defaultValues?: DefaultAddressDetails;
  /** Configuration for additional fields besides the physical address */
  additionalFields?: {
    /** Determines whether the phone number is hidden, required, or optional. Defaults to hidden. */
    phoneNumber?: 'hidden' | 'optional' | 'required';
    /** The label of a checkbox displayed below other fields. If null or undefined, the checkbox is not displayed. */
    checkboxLabel?: string;
  };
  /** A list of two-letter country codes representing countries the customers can select. If the list is empty (the default), we display all countries. */
  allowedCountries?: Array<string>;
  /** A list of two-letter country codes representing countries that support address autocomplete. Defaults to a list of countries that Stripe has audited to ensure a good autocomplete experience. */
  autocompleteCountries?: Array<string>;
  /** The title of the primary button displayed at the bottom of the screen. Defaults to "Save Address". */
  primaryButtonTitle?: string;
  /** Title displayed at the top of the sheet. Defaults to "Address". */
  sheetTitle?: string;
  /** Android only. Google Places api key used to provide autocomplete suggestions. When null, autocomplete is disabled on Android. */
  googlePlacesApiKey?: string;
  /** Called when the user submits their information */
  onSubmit: (result: CollectAddressResult) => void;
  /** Called when the user closes the sheet before submitting their information */
  onCancel: () => void;
}

export type DefaultAddressDetails = {
  /** The customer's full name. */
  name?: string;
  /** The customer's address. */
  address?: Address;
  /** The customer's phone number. */
  phone?: string;
  /** Whether or not the checkbox is initally selected. Defaults to false.
   *  Note: The checkbox is displayed below the other fields when additionalFields.checkboxLabel is set.
   *  */
  isCheckboxSelected?: boolean;
};

export type CollectAddressResult =
  | {
      /** The customer's full name. */
      name: string;
      /** The customer's address.  */
      address: Address;
      /** The customer's phone number in E.164 format e.g. "+15551234567". */
      phoneNumber: string;
      /** Whether or not the checkbox was selected. */
      isCheckboxSelected?: Boolean;
      error?: undefined;
    }
  | {
      error: StripeError<PaymentSheetError>;
      name?: undefined;
      address?: undefined;
      phoneNumber?: undefined;
      isCheckboxSelected?: undefined;
    };

/**
 *
 *
 * @example
 * ```ts
 *  <AddressSheet
 *
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export function AddressSheet({ onSubmit, onCancel, ...props }: Props) {
  return (
    <AddressSheetNative
      {...props}
      onSubmitAction={(value: NativeSyntheticEvent<CollectAddressResult>) =>
        onSubmit(value.nativeEvent)
      }
      onCancelAction={() => onCancel()}
    />
  );
}
