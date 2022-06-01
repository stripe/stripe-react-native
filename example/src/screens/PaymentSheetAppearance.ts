import { Platform } from 'react-native';
import type { PaymentSheet } from '@stripe/stripe-react-native';

const appearance: PaymentSheet.AppearanceParams = {
  font: {
    scale: 1.1,
    family: Platform.OS === 'android' ? 'macondoregular' : 'Macondo-Regular',
  },
  colors: {
    light: {
      primary: '#F8F8F2',
      background: '#272822',
      componentBackground: '#E6DB74',
      componentBorder: '#FD971F',
      componentDivider: '#FD971F',
      primaryText: '#F8F8F2',
      secondaryText: '#75715E',
      componentText: '#AE81FF',
      placeholderText: '#E69F66',
      icon: '#F92672',
      error: '#F92672',
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
    borderWidth: 1,
    shadow: {
      opacity: 1,
      color: '#ffffff',
      offset: { x: -5, y: -5 },
      blurRadius: 1,
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
        color: '#80ffffff',
        offset: { x: 5, y: 5 },
        blurRadius: 1,
      },
    },
  },
};

export default appearance;
