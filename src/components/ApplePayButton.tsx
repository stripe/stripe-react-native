import React, { useMemo } from 'react';
import {
  AccessibilityProps,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { ApplePayButtonComponent } from '@stripe/stripe-react-native';

const ApplePayButtonNative = requireNativeComponent<
  ApplePayButtonComponent.Props
>('ApplePayButton');

type Props = AccessibilityProps & {
  style?: StyleProp<ViewStyle>;
  type?: ApplePayButtonComponent.Types;
  buttonStyle?: ApplePayButtonComponent.Styles;
  onPress(): void;
};

export const ApplePayButton: React.FC<Props> = ({
  onPress,
  buttonStyle = 'black',
  type = 'plain',
  ...props
}) => {
  const buttonType = useMemo(() => mapButtonType(type), [type]);
  const style = useMemo(() => mapButtonStyle(buttonStyle), [buttonStyle]);

  return (
    <ApplePayButtonNative
      type={buttonType}
      buttonStyle={style}
      onPressAction={onPress}
      {...props}
    />
  );
};

function mapButtonType(type: ApplePayButtonComponent.Types) {
  switch (type) {
    case 'plain':
      return 0;
    case 'buy':
      return 1;
    case 'setUp':
      return 2;
    case 'inStore':
      return 3;
    case 'donate':
      return 4;
    case 'checkout':
      return 5;
    case 'book':
      return 6;
    case 'subscribe':
      return 7;
    case 'reload':
      return 8;
    case 'addMoney':
      return 9;
    case 'topUp':
      return 10;
    case 'order':
      return 11;
    case 'rent':
      return 12;
    case 'support':
      return 13;
    case 'contribute':
      return 14;
    case 'tip':
      return 15;
    default:
      return 0;
  }
}

function mapButtonStyle(type: ApplePayButtonComponent.Styles) {
  switch (type) {
    case 'white':
      return 0;
    case 'whiteOutline':
      return 1;
    case 'black':
      return 2;
    case 'automatic':
      return 3;
    default:
      return 2;
  }
}
