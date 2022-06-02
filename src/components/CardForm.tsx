import type { CardFormView } from '../types';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  AccessibilityProps,
  NativeSyntheticEvent,
  requireNativeComponent,
  UIManager,
  StyleProp,
  findNodeHandle,
  ViewStyle,
} from 'react-native';
import {
  currentlyFocusedInput,
  focusInput,
  registerInput,
  unregisterInput,
} from '../helpers';

const CardFormNative =
  requireNativeComponent<CardFormView.NativeProps>('CardForm');

/**
 *  Card Form Component Props
 */
export interface Props extends AccessibilityProps {
  style?: StyleProp<ViewStyle>;
  autofocus?: boolean;
  testID?: string;

  /** All styles except backgroundColor are Android only */
  cardStyle?: CardFormView.Styles;
  // isUserInteractionEnabled?: boolean;

  // TODO: will make it public when android-sdk allows for this
  // postalCodeEnabled?: boolean;

  /** Android only */
  placeholders?: CardFormView.Placeholders;
  /** Android only */
  defaultValues?: CardFormView.DefaultValues;
  // onBlur?(): void;
  // onFocus?(focusedField: CardFormView.FieldNames | null): void;
  onFormComplete?(card: CardFormView.Details): void;
  /**
   * WARNING: If set to `true` the full card number will be returned in the `onFormComplete` handler.
   * Only do this if you're certain that you fulfill the necessary PCI compliance requirements.
   * Make sure that you're not mistakenly logging or storing full card details!
   * See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance
   */
  dangerouslyGetFullCardDetails?: boolean;
}

/**
 *  Card Form Component
 *
 * @example
 * ```ts
 * <CardForm
 *    onFormComplete={(cardDetails) => {
 *    console.log('card details', cardDetails);
 *      setCard(cardDetails);
 *    }}
 *    style={{height: 200}}
 *  />
 * ```
 * @param __namedParameters Props
 * @returns JSX.Element
 * @category ReactComponents
 */
export const CardForm = forwardRef<CardFormView.Methods, Props>(
  (
    {
      onFormComplete,
      cardStyle,
      // isUserInteractionEnabled = true,
      // postalCodeEnabled = true,
      // onFocus,
      // onBlur,
      placeholders,
      defaultValues,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);

    const onFormCompleteHandler = useCallback(
      (event: NativeSyntheticEvent<CardFormView.Details>) => {
        const card = event.nativeEvent;

        const data: CardFormView.Details = {
          last4: card.last4,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          complete: card.complete,
          brand: card.brand,
          country: card.country,
          postalCode: card.postalCode,
        };

        if (card.hasOwnProperty('number') || card.hasOwnProperty('cvc')) {
          data.number = card.number || '';
          data.cvc = card.cvc || '';
          if (__DEV__ && onFormComplete && card.complete) {
            console.warn(
              `[stripe-react-native] ⚠️ WARNING: You've enabled \`dangerouslyGetFullCardDetails\`, meaning full card details are being returned. Only do this if you're certain that you fulfill the necessary PCI compliance requirements. Make sure that you're not mistakenly logging or storing full card details! See the docs for details: https://stripe.com/docs/security/guide#validating-pci-compliance`
            );
          }
        }
        onFormComplete?.(data);
      },
      [onFormComplete]
    );

    const focus = () => {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(inputRef.current),
        'focus' as any,
        []
      );
    };

    const blur = () => {
      UIManager.dispatchViewManagerCommand(
        findNodeHandle(inputRef.current),
        'blur' as any,
        []
      );
    };

    useImperativeHandle(ref, () => ({
      focus,
      blur,
    }));

    const onFocusHandler = useCallback((event) => {
      const { focusedField } = event.nativeEvent;
      if (focusedField) {
        focusInput(inputRef.current);
        // onFocus?.(focusedField);
      } else {
        // onBlur?.();
      }
    }, []);

    useLayoutEffect(() => {
      const inputRefValue = inputRef.current;
      if (inputRefValue !== null) {
        registerInput(inputRefValue);
        return () => {
          unregisterInput(inputRefValue);
          if (currentlyFocusedInput() === inputRefValue) {
            inputRefValue.blur();
          }
        };
      }
      return () => {};
    }, [inputRef]);

    return (
      <CardFormNative
        ref={inputRef}
        onFormComplete={onFormCompleteHandler}
        cardStyle={{
          backgroundColor: cardStyle?.backgroundColor,
          borderColor: cardStyle?.borderColor,
          borderWidth: cardStyle?.borderWidth,
          borderRadius: cardStyle?.borderRadius,
          cursorColor: cardStyle?.cursorColor,
          fontSize: cardStyle?.fontSize,
          placeholderColor: cardStyle?.placeholderColor,
          textColor: cardStyle?.textColor,
          textErrorColor: cardStyle?.textErrorColor,
          fontFamily: cardStyle?.fontFamily,
          // disabledBackgroundColor: cardStyle?.disabledBackgroundColor,
          // type: cardStyle?.type,
        }}
        // isUserInteractionEnabledValue={isUserInteractionEnabled}
        placeholders={{
          number: placeholders?.number,
          expiration: placeholders?.expiration,
          cvc: placeholders?.cvc,
          postalCode: placeholders?.postalCode,
        }}
        defaultValues={{
          ...(defaultValues ?? {}),
        }}
        onFocusChange={onFocusHandler}
        // postalCodeEnabled={postalCodeEnabled}
        {...props}
      />
    );
  }
);
