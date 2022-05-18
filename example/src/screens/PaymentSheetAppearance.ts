import { Platform } from 'react-native';
import type { PaymentSheet } from '@stripe/stripe-react-native';

const appearance: PaymentSheet.AppearanceParams = {
  font: {
    scale: 2,
    family: Platform.OS === 'android' ? 'macondoregular' : 'Macondo-Regular',
  },
  colors: {
    light: {
      primary: '#ff0000',
      background: '#00ff00',
      componentBackground: '#8000ff',
      componentBorder: '#d6de00',
      componentDivider: '#62ff08',
      headerText: '#ff7b00',
      labelText: '#5181fc',
      inputText: '#f7a900',
      placeholderText: '#f7a900',
      icon: '#f700b9',
      error: '#f700b9',
    },
    dark: {
      primary: '#00ff00',
      background: '#ff0000',
      componentBackground: '#ff0080',
      componentBorder: '#62ff08',
      componentDivider: '#d6de00',
      headerText: '#5181fc',
      labelText: '#ff7b00',
      inputText: '#00ffff',
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
      radius: 1,
    },
  },
  primaryButton: {
    font: { family: 'someotherfont' },
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
        radius: 1,
      },
    },
  },
};

export default appearance;
