import { Platform } from 'react-native';
import type { PaymentSheet } from '@stripe/stripe-react-native';

const appearance: PaymentSheet.AppearanceParams = {
  font: {
    scale: 1.1,
    family: Platform.OS === 'android' ? 'macondoregular' : 'Macondo-Regular',
  },
  colors: {
    light: {
      primary: '#ff000099',
      background: '#00ff00',
      componentBackground: '#8000ff',
      componentBorder: '#d6de00',
      componentDivider: '#62ff08',
      primaryText: '#ff7b00',
      secondaryText: '#5181fc',
      componentText: '#f7a900',
      placeholderText: '#f7a900',
      icon: '#f700b9',
      error: '#f700b9',
    },
    dark: {
      primary: '#00ff0099',
      background: '#ff0000',
      componentBackground: '#ff0080',
      componentBorder: '#62ff08',
      componentDivider: '#d6de00',
      primaryText: '#5181fc',
      secondaryText: '#ff7b00',
      componentText: '#00ffff',
      placeholderText: '#00ffff',
      icon: '#f0f0f0',
      error: '#0f0f0f',
    },
  },
  shapes: {
    borderRadius: 10,
    borderWidth: 5,
    shadow: {
      opacity: 1,
      color: '#000000',
      offset: { x: -10, y: 5 },
      borderRadius: 1,
    },
  },
  primaryButton: {
    colors: {
      background: '#000000',
      text: '#ffffff',
      border: '#ff00ff',
    },
    shapes: {
      borderRadius: 10,
      borderWidth: 2,
      shadow: {
        opacity: 1,
        color: '#000000',
        offset: { x: 10, y: -5 },
        borderRadius: 1,
      },
    },
  },
};

export default appearance;
