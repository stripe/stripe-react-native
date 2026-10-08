import {
  CheckoutCurrencySelectorElementView,
  CheckoutPaymentElementView,
  useCheckout,
} from '@stripe/stripe-react-native';
import type { Checkout } from '@stripe/stripe-react-native';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { colors } from '../../colors';
import { checkoutConfiguration } from './playgroundConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckoutCartScreen'>;

function CartSection({
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
        <Text style={styles.sectionHeading}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function TextButton({
  title,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
    >
      <Text style={[styles.textButton, disabled && styles.disabled]}>
        {title}
      </Text>
    </Pressable>
  );
}

function CloseCartButton() {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close cart"
      onPress={() => navigation.goBack()}
      hitSlop={10}
    >
      <Text style={styles.headerClose}>×</Text>
    </Pressable>
  );
}

function EditorModal({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <TextButton title="Cancel" onPress={onClose} />
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

function formatAddress(shippingAddress: Checkout.ShippingAddress): string {
  const { address, name } = shippingAddress;
  const locality = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
  return [name, address.line1, address.line2, locality, address.country]
    .filter(Boolean)
    .join('\n');
}

export default function CheckoutCartScreen({ route, navigation }: Props) {
  const { settings } = route.params;
  const getConfiguration = useCallback(
    async () => checkoutConfiguration(route.params),
    [route.params]
  );
  const checkout = useCheckout({ getConfiguration });
  const [paymentElementVisible, setPaymentElementVisible] = useState(false);
  const [emailEditorVisible, setEmailEditorVisible] = useState(false);
  const [shippingEditorVisible, setShippingEditorVisible] = useState(false);
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [shippingDraft, setShippingDraft] = useState(
    settings.defaultShippingAddressOption === 'custom'
      ? settings.customShippingAddress
      : {
          name: 'Jenny Rosen',
          line1: '510 Townsend St',
          line2: '',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          country: 'US',
        }
  );
  const [actionError, setActionError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: CloseCartButton,
    });
  }, [navigation]);

  const session = checkout.session;
  const isBusy = ['loading', 'updating', 'confirming'].includes(
    checkout.status
  );
  const lineItems = useMemo(
    () =>
      session?.orderSummaryItems.flatMap((summaryItem) => summaryItem.items) ??
      [],
    [session]
  );

  const run = async (operation: () => Promise<unknown>) => {
    setActionError(null);
    try {
      return await operation();
    } catch (failure) {
      setActionError(
        failure instanceof Error ? failure.message : String(failure)
      );
      return undefined;
    }
  };

  const presentPaymentElement = () => {
    if (!checkout.paymentElement) {
      return;
    }
    if (settings.paymentElementMode === 'sheet') {
      run(checkout.paymentElement.present);
    } else {
      setPaymentElementVisible(true);
    }
  };

  const confirm = async () => {
    const result = await run(checkout.confirm);
    if (!result) {
      return;
    }
    switch ((result as Checkout.Result).status) {
      case 'completed':
        Alert.alert(
          'Success',
          `Payment status: ${(result as Extract<Checkout.Result, { status: 'completed' }>).paymentStatus}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        break;
      case 'canceled':
        Alert.alert('Canceled', 'The payment was canceled.');
        break;
      case 'failed':
        Alert.alert(
          'Unable to complete checkout',
          (result as Extract<Checkout.Result, { status: 'failed' }>).error
            .message
        );
        break;
    }
  };

  const saveEmail = async (email: string | null) => {
    const trimmed = email?.trim();
    await run(() => checkout.updateEmail(trimmed ? trimmed : null));
    setEmailEditorVisible(false);
  };

  const saveShipping = async () => {
    await run(() =>
      checkout.updateShippingAddress({
        name: shippingDraft.name,
        address: {
          country: shippingDraft.country,
          line1: shippingDraft.line1,
          line2: shippingDraft.line2 || undefined,
          city: shippingDraft.city,
          state: shippingDraft.state,
          postalCode: shippingDraft.postalCode,
        },
      })
    );
    setShippingEditorVisible(false);
  };

  if (checkout.status === 'loading' && !session) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.blurple} />
        <Text style={styles.secondaryText}>Loading Cart...</Text>
      </View>
    );
  }

  if (checkout.status === 'error' && !session) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.failureTitle}>Failed to load cart.</Text>
        <Text style={styles.errorText}>{checkout.error?.message}</Text>
        <Pressable style={styles.secondaryButton} onPress={checkout.reload}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!!(actionError || checkout.error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text selectable style={styles.errorText}>
              {actionError ?? checkout.error?.message}
            </Text>
          </View>
        )}

        <View style={styles.diagnosticsRow}>
          <Text testID="checkout-status" style={styles.statusText}>
            Status: {checkout.status}
          </Text>
          <TextButton
            title="Session diagnostics"
            onPress={() => setDiagnosticsVisible(true)}
          />
        </View>

        {checkout.currencySelectorElement && (
          <View
            testID="checkout-currency-selector"
            style={styles.currencySelector}
          >
            <CheckoutCurrencySelectorElementView
              element={checkout.currencySelectorElement}
            />
          </View>
        )}

        <CartSection title="Items">
          <View style={styles.card}>
            {lineItems.length === 0 ? (
              <Text style={styles.emptyText}>No items</Text>
            ) : (
              lineItems.map((item, index) => (
                <View
                  key={item.key}
                  style={[styles.itemRow, index > 0 && styles.dividedRow]}
                >
                  {item.images[0] ? (
                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Text style={styles.itemImageText}>RN</Text>
                    </View>
                  )}
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.displayName}</Text>
                    <Text
                      testID="checkout-line-item-amount"
                      style={styles.secondaryText}
                    >
                      {item.unitAmountDecimal?.amount ?? item.unitAmount.amount}{' '}
                      × {item.quantity}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </CartSection>

        <CartSection
          title="Email"
          action={
            <TextButton
              title="Edit email"
              disabled={settings.emailSource !== 'local' || isBusy}
              onPress={() => {
                setEmailDraft(session.email ?? '');
                setEmailEditorVisible(true);
              }}
            />
          }
        >
          <View style={styles.plainSection}>
            <Text testID="checkout-session-email" style={styles.bodyText}>
              {session.email ?? 'No email'}
            </Text>
            <Text style={styles.secondaryText}>
              {settings.emailSource === 'local'
                ? 'Local email'
                : settings.emailSource === 'none'
                  ? 'No email source selected.'
                  : 'Server email cannot be changed in checkout.'}
            </Text>
          </View>
        </CartSection>

        {settings.collectShippingAddress && (
          <CartSection title="Shipping Address">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                session.shippingAddress
                  ? `Edit shipping address, ${formatAddress(session.shippingAddress)}`
                  : 'Add shipping address'
              }
              disabled={isBusy}
              onPress={() => setShippingEditorVisible(true)}
              style={({ pressed }) => [
                styles.card,
                styles.addressCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.addressIcon}>
                <Text style={styles.addressIconText}>
                  {session.shippingAddress ? 'A' : '+'}
                </Text>
              </View>
              <Text style={styles.addressText}>
                {session.shippingAddress
                  ? formatAddress(session.shippingAddress)
                  : 'Add shipping address'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </CartSection>
        )}

        <CartSection
          title="Payment Method"
          action={
            settings.paymentElementMode === 'view' && session.paymentOption ? (
              <TextButton
                title="Clear payment option"
                disabled={isBusy}
                onPress={() => run(checkout.clearPaymentOption)}
              />
            ) : null
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              session.paymentOption
                ? `Select payment method, ${session.paymentOption.label}`
                : 'Select payment method'
            }
            testID="checkout-select-payment-method"
            disabled={isBusy}
            onPress={presentPaymentElement}
            style={({ pressed }) => [
              styles.card,
              styles.paymentRow,
              pressed && styles.pressed,
            ]}
          >
            {session.paymentOption?.image ? (
              <Image
                source={{
                  uri: `data:image/png;base64,${session.paymentOption.image}`,
                }}
                style={styles.paymentImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.addressIcon}>
                <Text style={styles.addressIconText}>+</Text>
              </View>
            )}
            <Text style={styles.paymentLabel}>
              {session.paymentOption?.label ?? 'Select payment method'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </CartSection>

        <CartSection title="Order Summary">
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text
                testID="checkout-subtotal-amount"
                style={styles.summaryValue}
              >
                {session.totals.subtotal.amount}
              </Text>
            </View>
            {session.totals.discount.minorUnitsAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountText}>Discount</Text>
                <Text
                  testID="checkout-discount-amount"
                  style={styles.discountText}
                >
                  -{session.totals.discount.amount}
                </Text>
              </View>
            )}
            {session.tax?.status === 'requiresShippingAddress' && (
              <Text testID="checkout-tax-prompt" style={styles.taxPrompt}>
                Tax{`\n`}Enter shipping address to calculate
              </Text>
            )}
            {session.tax?.status === 'requiresBillingAddress' && (
              <Text testID="checkout-tax-prompt" style={styles.taxPrompt}>
                Tax{`\n`}Enter billing address to calculate
              </Text>
            )}
            {session.tax?.status === 'ready' &&
              session.totals.taxExclusive.minorUnitsAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax</Text>
                  <Text
                    testID="checkout-tax-amount"
                    style={styles.summaryValue}
                  >
                    {session.totals.taxExclusive.amount}
                  </Text>
                </View>
              )}
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text testID="checkout-total-amount" style={styles.totalText}>
                {session.totals.total.amount}
              </Text>
            </View>
            {session.totals.taxInclusive.minorUnitsAmount > 0 && (
              <Text style={styles.inclusiveTaxText}>
                Includes {session.totals.taxInclusive.amount} in tax
              </Text>
            )}
          </View>
        </CartSection>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buy ${session.totals.total.amount}`}
          testID="checkout-buy-button"
          disabled={isBusy}
          onPress={confirm}
          style={({ pressed }) => [
            styles.buyButton,
            isBusy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {checkout.status === 'confirming' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buyButtonText}>
              Buy · {session.totals.total.amount}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {checkout.status === 'updating' && (
        <View pointerEvents="none" style={styles.updatingOverlay}>
          <ActivityIndicator color={colors.blurple} />
        </View>
      )}

      <EditorModal
        title="Edit email"
        visible={emailEditorVisible}
        onClose={() => setEmailEditorVisible(false)}
      >
        <View style={styles.editorContent}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.textInput}
            value={emailDraft}
            onChangeText={setEmailDraft}
          />
          <Pressable
            style={styles.primaryButton}
            onPress={() => saveEmail(emailDraft)}
          >
            <Text style={styles.primaryButtonText}>Save email</Text>
          </Pressable>
          <Pressable
            style={styles.dangerButton}
            onPress={() => saveEmail(null)}
          >
            <Text style={styles.dangerButtonText}>Clear email</Text>
          </Pressable>
        </View>
      </EditorModal>

      <EditorModal
        title="Shipping Address"
        visible={shippingEditorVisible}
        onClose={() => setShippingEditorVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.editorContent}>
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
            <View key={key} style={styles.editorField}>
              <Text style={styles.inputLabel}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                style={styles.textInput}
                value={shippingDraft[key]}
                onChangeText={(value) =>
                  setShippingDraft((current) => ({ ...current, [key]: value }))
                }
              />
            </View>
          ))}
          <Pressable style={styles.primaryButton} onPress={saveShipping}>
            <Text style={styles.primaryButtonText}>Save Address</Text>
          </Pressable>
          <Pressable
            style={styles.dangerButton}
            onPress={async () => {
              await run(() =>
                checkout.updateShippingAddress({ address: null })
              );
              setShippingEditorVisible(false);
            }}
          >
            <Text style={styles.dangerButtonText}>Clear address</Text>
          </Pressable>
        </ScrollView>
      </EditorModal>

      <EditorModal
        title="Payment Method"
        visible={paymentElementVisible}
        onClose={() => setPaymentElementVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.paymentElementContent}>
          {!!checkout.paymentElement && (
            <CheckoutPaymentElementView element={checkout.paymentElement} />
          )}
          <Pressable
            style={styles.primaryButton}
            onPress={() => setPaymentElementVisible(false)}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </ScrollView>
      </EditorModal>

      <EditorModal
        title="Session diagnostics"
        visible={diagnosticsVisible}
        onClose={() => setDiagnosticsVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.editorContent}>
          <Text style={styles.diagnosticsLabel}>CHECKOUT SESSION</Text>
          <View style={styles.diagnosticsCard}>
            <Text style={styles.diagnosticsTitle}>Checkout Session</Text>
            <Text selectable numberOfLines={1} style={styles.monospaceText}>
              {session.id}
            </Text>
            <Text
              testID="checkout-snapshot-currency"
              style={styles.diagnosticsMetadata}
            >
              Currency: {session.currency.toUpperCase()}
            </Text>
          </View>
          <Text
            selectable
            testID="checkout-snapshot"
            style={styles.snapshotText}
          >
            {JSON.stringify(
              session,
              (key, value) => (key === 'image' ? '[Base64 image]' : value),
              2
            )}
          </Text>
        </ScrollView>
      </EditorModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light_gray },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.light_gray,
  },
  section: { gap: 12 },
  sectionHeadingRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeading: { color: colors.slate, fontSize: 21, fontWeight: '800' },
  card: {
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
    overflow: 'hidden',
  },
  plainSection: { gap: 5 },
  bodyText: { color: colors.slate, fontSize: 16 },
  secondaryText: { color: colors.dark_gray, fontSize: 14, lineHeight: 19 },
  diagnosticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusText: { color: '#697386', fontSize: 12, fontWeight: '700' },
  currencySelector: { marginHorizontal: 1 },
  textButton: { color: colors.blurple, fontSize: 14, fontWeight: '700' },
  headerClose: { color: colors.white, fontSize: 30, lineHeight: 30 },
  disabled: { opacity: 0.4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 15,
  },
  dividedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E3E8EE',
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F1F4F8',
  },
  itemImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  itemImageText: { color: colors.blurple, fontWeight: '800' },
  itemCopy: { flex: 1, gap: 6 },
  itemName: { color: colors.slate, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.dark_gray, padding: 16 },
  addressCard: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  addressIconText: { color: colors.blurple, fontSize: 17, fontWeight: '800' },
  addressText: { flex: 1, color: colors.slate, fontSize: 15, lineHeight: 20 },
  chevron: { color: '#8795A1', fontSize: 28, lineHeight: 28 },
  paymentRow: {
    minHeight: 62,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  paymentImage: { width: 28, height: 20 },
  paymentLabel: { flex: 1, color: colors.slate, fontSize: 16 },
  summaryCard: { padding: 16, gap: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: { color: colors.dark_gray, fontSize: 15 },
  summaryValue: { color: colors.slate, fontSize: 15, fontWeight: '600' },
  discountText: { color: '#0E8A5F', fontSize: 15, fontWeight: '600' },
  taxPrompt: { color: colors.dark_gray, fontSize: 14, lineHeight: 19 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EC',
    paddingTop: 14,
  },
  totalText: { color: colors.slate, fontSize: 18, fontWeight: '800' },
  inclusiveTaxText: { color: colors.dark_gray, fontSize: 13 },
  buyButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blurple,
  },
  buyButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  errorBanner: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F7C5C5',
  },
  errorTitle: { color: '#8B1A1A', fontSize: 15, fontWeight: '800' },
  errorText: {
    color: '#8B1A1A',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  failureTitle: { color: colors.slate, fontSize: 18, fontWeight: '800' },
  secondaryButton: {
    minHeight: 46,
    minWidth: 120,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  secondaryButtonText: {
    color: colors.blurple,
    fontSize: 15,
    fontWeight: '700',
  },
  modalScreen: { flex: 1, backgroundColor: colors.light_gray },
  modalHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9E2EC',
    backgroundColor: colors.white,
  },
  modalTitle: { color: colors.slate, fontSize: 16, fontWeight: '800' },
  modalHeaderSpacer: { width: 48 },
  editorContent: { padding: 20, gap: 14 },
  editorField: { gap: 6 },
  inputLabel: { color: '#697386', fontSize: 12, fontWeight: '700' },
  textInput: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.slate,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#C7D0D9',
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blurple,
    marginTop: 4,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  dangerButton: {
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
  },
  dangerButtonText: { color: '#B42318', fontSize: 15, fontWeight: '700' },
  paymentElementContent: { padding: 16, gap: 20 },
  diagnosticsLabel: {
    color: '#697386',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diagnosticsCard: {
    borderRadius: 14,
    padding: 15,
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E2EC',
  },
  diagnosticsTitle: { color: colors.slate, fontSize: 15, fontWeight: '700' },
  diagnosticsMetadata: {
    color: colors.dark_gray,
    fontSize: 13,
    fontWeight: '600',
  },
  monospaceText: {
    color: colors.dark_gray,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  snapshotText: {
    color: colors.slate,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
});
