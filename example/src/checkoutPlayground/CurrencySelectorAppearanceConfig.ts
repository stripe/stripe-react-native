import {
  CurrencySelectorLabelContent,
  type CurrencySelectorAppearance,
} from '@stripe/stripe-react-native/src/components/CurrencySelectorElement';
import type { SelectionOption } from './types';

export type CurrencySelectorTheme = 'default' | 'dark' | 'warm';
export type CurrencySelectorShape = 'capsule' | 'soft' | 'outlined';

export const currencySelectorThemeOptions: SelectionOption<CurrencySelectorTheme>[] =
  [
    { label: 'Default', value: 'default' },
    { label: 'Dark', value: 'dark' },
    { label: 'Warm', value: 'warm' },
  ];

export const currencySelectorLabelOptions: SelectionOption<CurrencySelectorLabelContent>[] =
  [
    { label: 'Automatic', value: CurrencySelectorLabelContent.Automatic },
    {
      label: 'Currency code',
      value: CurrencySelectorLabelContent.CurrencyCode,
    },
    { label: 'Amount', value: CurrencySelectorLabelContent.Amount },
  ];

export const currencySelectorShapeOptions: SelectionOption<CurrencySelectorShape>[] =
  [
    { label: 'Capsule', value: 'capsule' },
    { label: 'Soft', value: 'soft' },
    { label: 'Outlined', value: 'outlined' },
  ];

export function buildCurrencySelectorAppearance({
  labelContent,
  shape,
  theme,
}: {
  labelContent: CurrencySelectorLabelContent;
  shape: CurrencySelectorShape;
  theme: CurrencySelectorTheme;
}): CurrencySelectorAppearance {
  const themeAppearance: CurrencySelectorAppearance =
    theme === 'dark'
      ? {
          background: { light: '#0F172A', dark: '#020617' },
          selectedBackground: { light: '#67E8F9', dark: '#22D3EE' },
          borderColor: { light: '#334155', dark: '#475569' },
          textColor: { light: '#E2E8F0', dark: '#E2E8F0' },
          selectedTextColor: { light: '#0F172A', dark: '#082F49' },
          textSecondaryColor: { light: '#CBD5E1', dark: '#CBD5E1' },
          dangerColor: '#FB7185',
        }
      : theme === 'warm'
        ? {
            background: { light: '#FFF7ED', dark: '#431407' },
            selectedBackground: { light: '#F97316', dark: '#FDBA74' },
            borderColor: { light: '#FED7AA', dark: '#9A3412' },
            textColor: { light: '#7C2D12', dark: '#FFEDD5' },
            selectedTextColor: { light: '#FFFFFF', dark: '#431407' },
            textSecondaryColor: { light: '#9A3412', dark: '#FED7AA' },
            dangerColor: '#DC2626',
          }
        : {
            background: { light: '#EEF2FF', dark: '#1E2248' },
            selectedBackground: { light: '#FFFFFF', dark: '#635BFF' },
            borderColor: { light: '#C7D2FE', dark: '#5951D9' },
            textColor: { light: '#0A2540', dark: '#F6F9FC' },
            selectedTextColor: { light: '#635BFF', dark: '#FFFFFF' },
            textSecondaryColor: { light: '#425466', dark: '#C7D2FE' },
            dangerColor: '#E25950',
          };

  const shapeAppearance: CurrencySelectorAppearance =
    shape === 'outlined'
      ? { borderWidth: 2, contentVerticalPadding: 6, cornerRadius: 10 }
      : shape === 'soft'
        ? { borderWidth: 1, contentVerticalPadding: 6, cornerRadius: 18 }
        : { borderWidth: 1, contentVerticalPadding: 4, cornerRadius: 999 };

  return {
    ...themeAppearance,
    ...shapeAppearance,
    labelContent,
    font: {
      scale: 1,
    },
  };
}
