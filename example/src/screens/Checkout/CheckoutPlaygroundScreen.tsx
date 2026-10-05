import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { initStripe } from '@stripe/stripe-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../colors';
import {
  createCheckoutCustomer,
  createCheckoutSession,
  fetchCheckoutPublishableKey,
} from './backend';
import {
  backendURLForOption,
  buildSessionParameters,
  checkoutPlaygroundSettingsKey,
  defaultPlaygroundSettings,
  resolvedEmail,
  usTestAddress,
  validateSettings,
} from './playgroundConfig';
import type {
  BackendOption,
  CartScenario,
  Currency,
  DefaultShippingAddressOption,
  EmailSource,
  PaymentElementMode,
  PlaygroundSettings,
} from './playgroundConfig';

type Choice<T extends string> = { label: string; value: T };

const currencies: Choice<Currency>[] = [
  { label: 'USD', value: 'usd' },
  { label: 'EUR', value: 'eur' },
  { label: 'GBP', value: 'gbp' },
  { label: 'CAD', value: 'cad' },
  { label: 'AUD', value: 'aud' },
  { label: 'JPY', value: 'jpy' },
];

const emailSources: Choice<EmailSource>[] = [
  { label: 'None', value: 'none' },
  { label: 'Server - Checkout Session', value: 'checkoutSession' },
  { label: 'Server - Customer', value: 'customer' },
  { label: 'Local', value: 'local' },
];

const currencySymbols: Record<Currency, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  cad: '$',
  aud: '$',
  jpy: '¥',
};

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>{title.toUpperCase()}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function PickerRow<T extends string>({
  label,
  value,
  choices,
  onChange,
  testID,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
  testID?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = choices.find((choice) => choice.value === value);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: selected?.label ?? value }}
      testID={testID}
      onPress={() => setIsOpen(true)}
      style={({ pressed }) => [styles.controlRow, pressed && styles.rowPressed]}
    >
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.selectionValue}>
        <Text style={styles.selectionText}>{selected?.label ?? value}</Text>
        <Text style={styles.selectionChevron}>›</Text>
      </View>
      <ChoiceSheet
        title={label}
        choices={choices}
        value={value}
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        onChange={onChange}
      />
    </Pressable>
  );
}

function ChoiceSheet<T extends string>({
  title,
  choices,
  value,
  visible,
  onClose,
  onChange,
}: {
  title: string;
  choices: Choice<T>[];
  value: T;
  visible: boolean;
  onClose: () => void;
  onChange: (value: T) => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessible={false}
        style={styles.sheetBackdrop}
        onPress={onClose}
      >
        <Pressable accessible={false} style={styles.choiceSheet}>
          <View style={styles.choiceSheetHeader}>
            <Text style={styles.choiceSheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.choiceSheetDone}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.choiceList}>
            {choices.map((choice) => (
              <Pressable
                key={choice.value}
                accessibilityRole="button"
                accessibilityLabel={choice.label}
                onPress={() => {
                  onChange(choice.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.choiceRow,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.choiceText}>{choice.label}</Text>
                {choice.value === value && (
                  <Text style={styles.choiceCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CompactPicker<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = choices.find((choice) => choice.value === value);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setIsOpen(true)}
        style={styles.compactSelector}
      >
        <Text style={styles.compactSelectorText}>{selected?.label}</Text>
        <Text style={styles.compactSelectorChevron}>⌄</Text>
      </Pressable>
      <ChoiceSheet
        title={label}
        choices={choices}
        value={value}
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        onChange={onChange}
      />
    </>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
  testID,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.controlRow, disabled && styles.disabled]}>
      <Text style={styles.controlLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        testID={testID}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.blurple }}
      />
    </View>
  );
}

function formatUnitAmount(amount: number, currency: Currency): string {
  const value = currency === 'jpy' ? amount : amount / 100;
  return `${currencySymbols[currency]}${
    currency === 'jpy' ? value : value.toFixed(2)
  }`;
}

export default function CheckoutPlaygroundScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState(defaultPlaygroundSettings);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(checkoutPlaygroundSettingsKey)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<PlaygroundSettings>;
          setSettings({
            ...defaultPlaygroundSettings,
            ...parsed,
            customShippingAddress: {
              ...usTestAddress,
              ...parsed.customShippingAddress,
            },
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsHydrated(true));
  }, []);

  useEffect(() => {
    if (isHydrated) {
      AsyncStorage.setItem(
        checkoutPlaygroundSettingsKey,
        JSON.stringify(settings)
      ).catch(() => {});
    }
  }, [isHydrated, settings]);

  const validationError = useMemo(() => validateSettings(settings), [settings]);
  const usesLocationEmail =
    settings.adaptivePricingCountry !== 'none' &&
    ['checkoutSession', 'customer'].includes(settings.emailSource);
  const items =
    settings.cartScenario === 'zeroAmount'
      ? [{ name: 'Free T-Shirt', unitAmount: 0, quantity: 1 }]
      : [
          { name: 'Classic T-Shirt', unitAmount: 3500, quantity: 2 },
          { name: 'Zip-Up Hoodie', unitAmount: 5000, quantity: 1 },
        ];

  const set = <K extends keyof PlaygroundSettings>(
    key: K,
    value: PlaygroundSettings[K]
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setSettings(defaultPlaygroundSettings);
    setError(null);
  };

  const createSession = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const publishableKey = await fetchCheckoutPublishableKey(
        settings.backendURL
      );
      await initStripe({
        publishableKey,
        merchantIdentifier: 'merchant.com.stripe.react.native',
        urlScheme: 'com.stripe.react.native',
      });
      const customerID =
        settings.customerType === 'guest'
          ? undefined
          : await createCheckoutCustomer(
              settings.emailSource === 'customer' && resolvedEmail(settings)
                ? { email: resolvedEmail(settings) }
                : {},
              settings.backendURL
            );
      const clientSecret = await createCheckoutSession(
        buildSessionParameters(
          settings,
          customerID,
          Platform.OS === 'android' ? 'android' : 'ios'
        ),
        settings.backendURL
      );
      navigation.navigate('CheckoutCartScreen', { clientSecret, settings });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setIsCreating(false);
    }
  };

  if (!isHydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.blurple} />
        <Text style={styles.secondaryText}>Loading playground settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Unable to create session</Text>
            <Text selectable style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Section
          title="Configuration"
          action={
            <Pressable accessibilityRole="button" onPress={reset}>
              <Text style={styles.sectionAction}>Reset</Text>
            </Pressable>
          }
        >
          <View style={styles.card}>
            <PickerRow<PaymentElementMode>
              label="PaymentElement"
              value={settings.paymentElementMode}
              choices={[
                { label: 'sheet', value: 'sheet' },
                { label: 'view', value: 'view' },
              ]}
              onChange={(value) => set('paymentElementMode', value)}
              testID="checkout-payment-element-picker"
            />
            <PickerRow
              label="Currency"
              value={settings.currency}
              choices={currencies}
              onChange={(value) => set('currency', value)}
            />
            <PickerRow
              label="Customer"
              value={settings.customerType}
              choices={[
                { label: 'Guest', value: 'guest' },
                { label: 'New', value: 'new' },
                { label: 'Returning', value: 'returning' },
              ]}
              onChange={(value) => set('customerType', value)}
            />
            <PickerRow<BackendOption>
              label="Backend Endpoint"
              value={settings.backendOption}
              choices={[
                { label: 'Hosted', value: 'hosted' },
                { label: 'Localhost', value: 'localhost' },
                { label: 'Manual', value: 'manual' },
              ]}
              onChange={(value) => {
                const backendURL = backendURLForOption(value);
                setSettings((current) => ({
                  ...current,
                  backendOption: value,
                  backendURL: backendURL ?? current.backendURL,
                }));
              }}
            />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Backend URL</Text>
              <TextInput
                accessibilityLabel="Backend URL"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
                value={settings.backendURL}
                onChangeText={(value) =>
                  setSettings((current) => ({
                    ...current,
                    backendOption: 'manual',
                    backendURL: value,
                  }))
                }
              />
            </View>
          </View>
        </Section>

        <Section title="Email">
          <View style={styles.card}>
            <PickerRow
              label="Email source"
              value={settings.emailSource}
              choices={emailSources}
              onChange={(value) => set('emailSource', value)}
            />
            {settings.emailSource !== 'none' && (
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  testID="checkout-email-value"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!usesLocationEmail}
                  style={[
                    styles.textInput,
                    usesLocationEmail && styles.readOnlyInput,
                  ]}
                  value={resolvedEmail(settings) ?? ''}
                  onChangeText={(value) => set('email', value)}
                />
              </View>
            )}
          </View>
          <Text style={styles.helperText}>
            {usesLocationEmail
              ? 'Email is controlled by the Adaptive Pricing country override.'
              : settings.emailSource === 'local'
                ? 'Used as the local default. It can be updated in checkout.'
                : settings.emailSource === 'none'
                  ? 'Checkout starts without an email address.'
                  : 'The server email cannot be changed in checkout.'}
          </Text>
          {!!validationError &&
            validationError.toLowerCase().includes('email') && (
              <Text
                testID="checkout-email-configuration-error"
                style={styles.validationText}
              >
                {validationError}
              </Text>
            )}
        </Section>

        <Section
          title="Line Items"
          action={
            <CompactPicker<CartScenario>
              label="Cart Scenario"
              value={settings.cartScenario}
              choices={[
                { label: 'Standard cart', value: 'standard' },
                { label: '$0 cart', value: 'zeroAmount' },
              ]}
              onChange={(value) => set('cartScenario', value)}
            />
          }
        >
          <View style={styles.itemStack}>
            {items.map((item) => (
              <View key={item.name} style={styles.itemCard}>
                <View style={styles.itemArtwork}>
                  <Text style={styles.itemArtworkText}>RN</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    Qty {item.quantity} Price{' '}
                    {formatUnitAmount(item.unitAmount, settings.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Features">
          <View style={styles.card}>
            <ToggleRow
              label="Collect Shipping Address"
              value={settings.collectShippingAddress}
              onChange={(value) => set('collectShippingAddress', value)}
            />
            <PickerRow<DefaultShippingAddressOption>
              label="Default Shipping Address"
              value={settings.defaultShippingAddressOption}
              choices={[
                { label: 'No address', value: 'none' },
                { label: 'US test address', value: 'usTestAddress' },
                { label: 'Custom', value: 'custom' },
              ]}
              onChange={(value) => set('defaultShippingAddressOption', value)}
            />
            {settings.defaultShippingAddressOption === 'usTestAddress' && (
              <View style={styles.addressPreview}>
                <Text style={styles.addressName}>{usTestAddress.name}</Text>
                <Text style={styles.secondaryText}>{usTestAddress.line1}</Text>
                <Text style={styles.secondaryText}>
                  {usTestAddress.city}, {usTestAddress.state}{' '}
                  {usTestAddress.postalCode}
                </Text>
                <Text style={styles.secondaryText}>
                  {usTestAddress.country}
                </Text>
              </View>
            )}
            {settings.defaultShippingAddressOption === 'custom' && (
              <View style={styles.addressEditor}>
                {(
                  [
                    ['name', 'Name'],
                    ['line1', 'Address line 1'],
                    ['line2', 'Address line 2'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['postalCode', 'ZIP / postal code'],
                    ['country', 'Country'],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key} style={styles.addressField}>
                    <Text style={styles.inputLabel}>{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      style={styles.textInput}
                      value={settings.customShippingAddress[key]}
                      onChangeText={(value) =>
                        set('customShippingAddress', {
                          ...settings.customShippingAddress,
                          [key]: value,
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            )}
            <PickerRow
              label="Billing Address"
              value={settings.billingAddressCollection}
              choices={[
                { label: 'Auto', value: 'automatic' },
                { label: 'Required', value: 'required' },
              ]}
              onChange={(value) => set('billingAddressCollection', value)}
            />
            <ToggleRow
              label="Automatic Payment Methods"
              value={settings.automaticPaymentMethods}
              onChange={(value) => set('automaticPaymentMethods', value)}
            />
            <PickerRow
              label="Link Display"
              value={settings.linkMode}
              choices={[
                { label: 'Automatic', value: 'automatic' },
                { label: 'Never', value: 'never' },
              ]}
              onChange={(value) => set('linkMode', value)}
            />
            <ToggleRow
              label="Automatic Tax"
              value={settings.automaticTax}
              onChange={(value) => set('automaticTax', value)}
              disabled={settings.customerType === 'new'}
            />
            <ToggleRow
              label="Payment Method Offer Save"
              value={settings.paymentMethodSave}
              onChange={(value) => set('paymentMethodSave', value)}
            />
            <ToggleRow
              label="Payment Method Remove"
              value={settings.paymentMethodRemove}
              onChange={(value) => set('paymentMethodRemove', value)}
            />
          </View>
        </Section>

        <Section title="Currency Selector">
          <View style={styles.card}>
            <PickerRow
              label="Adaptive Pricing Location"
              value={settings.adaptivePricingCountry}
              choices={[
                { label: 'No Override', value: 'none' },
                { label: 'United States (US)', value: 'US' },
                { label: 'France (FR)', value: 'FR' },
                { label: 'Germany (DE)', value: 'DE' },
                { label: 'Japan (JP)', value: 'JP' },
                { label: 'United Kingdom (GB)', value: 'GB' },
                { label: 'Brazil (BR)', value: 'BR' },
              ]}
              onChange={(value) => set('adaptivePricingCountry', value)}
            />
            <View style={styles.availabilityRow}>
              <Text style={styles.controlLabel}>Currency Selector Element</Text>
              <Text style={styles.unavailableText}>Not bridged in RN</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            The country override still exercises Adaptive Pricing through the
            test email convention.
          </Text>
        </Section>

        {!settings.automaticPaymentMethods && (
          <Section title="Payment Methods">
            <View style={styles.card}>
              {['card', 'link'].map((method) => (
                <ToggleRow
                  key={method}
                  label={method === 'card' ? 'Card' : 'Link'}
                  value={settings.paymentMethodTypes.includes(method)}
                  onChange={(enabled) =>
                    set(
                      'paymentMethodTypes',
                      enabled
                        ? [...settings.paymentMethodTypes, method]
                        : settings.paymentMethodTypes.filter(
                            (candidate) => candidate !== method
                          )
                    )
                  }
                />
              ))}
            </View>
          </Section>
        )}

        <Section title="Express Checkout Element">
          <View style={styles.availabilityCard}>
            <Text style={styles.availabilityTitle}>Not bridged in RN</Text>
            <Text style={styles.helperText}>
              Apple Pay and Link Express Checkout controls will appear here when
              the React Native Checkout API exposes the element.
            </Text>
          </View>
        </Section>
      </ScrollView>

      <View style={styles.createBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create Checkout Session"
          testID="checkout-create-session"
          disabled={isCreating || !!validationError}
          onPress={createSession}
          style={({ pressed }) => [
            styles.createButton,
            (isCreating || !!validationError) && styles.createButtonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {isCreating && <ActivityIndicator color={colors.white} />}
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating Session...' : 'Create Checkout Session'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light_gray },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 116,
    gap: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.light_gray,
  },
  section: { gap: 10 },
  sectionHeadingRow: {
    minHeight: 30,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    color: '#697386',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionAction: { color: colors.blurple, fontSize: 14, fontWeight: '700' },
  card: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  controlRow: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E8EE',
  },
  controlLabel: { color: colors.slate, fontSize: 15, flexShrink: 1 },
  selectionValue: {
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  selectionText: { color: colors.dark_gray, fontSize: 14, textAlign: 'right' },
  selectionChevron: { color: '#8795A1', fontSize: 22, lineHeight: 22 },
  inputRow: { padding: 14, gap: 7 },
  inputLabel: { color: '#697386', fontSize: 12, fontWeight: '600' },
  textInput: {
    minHeight: 42,
    borderRadius: 9,
    backgroundColor: '#F1F4F8',
    color: colors.slate,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 15,
  },
  readOnlyInput: { color: '#697386' },
  helperText: { color: colors.dark_gray, fontSize: 13, lineHeight: 18 },
  validationText: { color: '#B42318', fontSize: 13, lineHeight: 18 },
  compactSelector: {
    minHeight: 38,
    maxWidth: 190,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  compactSelectorText: {
    color: colors.blurple,
    fontSize: 13,
    fontWeight: '700',
  },
  compactSelectorChevron: { color: colors.blurple, fontSize: 16 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 30, 49, 0.32)',
  },
  choiceSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  choiceSheetHeader: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9E2EC',
  },
  choiceSheetTitle: { color: colors.slate, fontSize: 17, fontWeight: '800' },
  choiceSheetDone: { color: colors.blurple, fontSize: 15, fontWeight: '700' },
  choiceList: { flexGrow: 0 },
  choiceRow: {
    minHeight: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E8EE',
  },
  choiceText: { color: colors.slate, fontSize: 16 },
  choiceCheck: { color: colors.blurple, fontSize: 18, fontWeight: '800' },
  rowPressed: { backgroundColor: '#F6F8FA' },
  itemStack: { gap: 10 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  itemArtwork: {
    width: 48,
    height: 48,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  itemArtworkText: { color: colors.blurple, fontSize: 12, fontWeight: '800' },
  itemDetails: { flex: 1, gap: 6 },
  itemName: { color: colors.slate, fontSize: 16, fontWeight: '600' },
  itemMeta: { color: colors.dark_gray, fontSize: 13 },
  addressPreview: {
    padding: 16,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E8EE',
  },
  addressName: { color: colors.slate, fontSize: 14, fontWeight: '700' },
  secondaryText: { color: colors.dark_gray, fontSize: 14, lineHeight: 19 },
  addressEditor: {
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E8EE',
  },
  addressField: { gap: 6 },
  availabilityRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  unavailableText: { color: '#697386', fontSize: 13, fontWeight: '600' },
  availabilityCard: {
    borderRadius: 14,
    padding: 16,
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  availabilityTitle: { color: colors.slate, fontSize: 15, fontWeight: '700' },
  createBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.light_gray,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
  },
  createButton: {
    minHeight: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.blurple,
  },
  createButtonDisabled: { backgroundColor: '#8795A1' },
  createButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  errorBanner: {
    borderRadius: 14,
    padding: 15,
    gap: 4,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F7C5C5',
  },
  errorTitle: { color: '#8B1A1A', fontSize: 15, fontWeight: '800' },
  errorText: { color: '#8B1A1A', fontSize: 13, lineHeight: 18 },
});
