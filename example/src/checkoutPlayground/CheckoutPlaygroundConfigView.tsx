import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BottomActionBar,
  Chip,
  GroupedCard,
  PaymentMethodEditorModal,
  PickerRow,
  PlaygroundTitle,
  SectionHeader,
  StatusBanner,
  ToggleRow,
} from './components';
import { colors } from '../colors';
import {
  adaptivePricingCountryOptions,
  availablePaymentMethods,
  currencyOptions,
  customerTypeOptions,
  modeOptions,
  normalizePaymentMethodTypes,
  shouldShowAdaptivePricingCountry,
  shouldShowAutomaticTax,
  supportsAdvancedCollection,
  type CheckoutPlaygroundConfig,
} from './types';

type Props = {
  config: CheckoutPlaygroundConfig;
  errorMessage?: string;
  isCreating: boolean;
  onChange(nextConfig: CheckoutPlaygroundConfig): void;
  onCreate(): void;
};

export function CheckoutPlaygroundConfigView({
  config,
  errorMessage,
  isCreating,
  onChange,
  onCreate,
}: Props) {
  const [isPaymentMethodEditorVisible, setPaymentMethodEditorVisible] =
    useState(false);

  const updateConfig = (patch: Partial<CheckoutPlaygroundConfig>) => {
    onChange({
      ...config,
      ...patch,
    });
  };

  const isCreateDisabled = useMemo(() => {
    return (
      isCreating ||
      normalizePaymentMethodTypes(config.paymentMethodTypes).length === 0
    );
  }, [config, isCreating]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PlaygroundTitle
          title="Checkout Playground"
          subtitle="Configure a Checkout Session against the hosted demo backend, then explore the backend-defined cart and PaymentSheet flow."
        />

        {errorMessage ? (
          <StatusBanner
            tone="error"
            title="Unable to create a session"
            message={errorMessage}
          />
        ) : null}

        <SectionHeader badge="G" title="Configuration" />
        <GroupedCard>
          <PickerRow
            title="Mode"
            description="Payment, subscription, or setup."
            selectedValue={config.mode}
            options={modeOptions}
            onValueChange={(mode) =>
              updateConfig({
                mode: mode as CheckoutPlaygroundConfig['mode'],
              })
            }
          />
          <PickerRow
            title="Currency"
            description="Controls the session currency sent to the backend."
            selectedValue={config.currency}
            options={currencyOptions}
            onValueChange={(currency) =>
              updateConfig({
                currency: currency as CheckoutPlaygroundConfig['currency'],
              })
            }
          />
          <PickerRow
            title="Customer"
            description="Guest, new, or returning customer behavior."
            selectedValue={config.customerType}
            options={customerTypeOptions}
            onValueChange={(customerType) =>
              updateConfig({
                customerType:
                  customerType as CheckoutPlaygroundConfig['customerType'],
              })
            }
          />
        </GroupedCard>

        <SectionHeader badge="F" title="Features" />
        <GroupedCard>
          <ToggleRow
            title="Shipping options"
            description="Adds sample shipping rates to the session."
            value={config.enableShipping}
            onValueChange={(enableShipping) => updateConfig({ enableShipping })}
          />
          <ToggleRow
            title="Collect shipping address"
            description="Lets Checkout collect and update shipping details."
            value={config.shippingAddressCollection}
            onValueChange={(shippingAddressCollection) =>
              updateConfig({ shippingAddressCollection })
            }
          />
          <ToggleRow
            title="Collect billing address"
            description="Requires billing address collection."
            value={config.billingAddressCollection}
            onValueChange={(billingAddressCollection) =>
              updateConfig({ billingAddressCollection })
            }
          />
          {supportsAdvancedCollection(config) ? (
            <>
              <ToggleRow
                title="Collect phone number"
                description="Requests a phone number during checkout."
                value={config.phoneNumberCollection}
                onValueChange={(phoneNumberCollection) =>
                  updateConfig({ phoneNumberCollection })
                }
              />
              <ToggleRow
                title="Allow promo codes"
                description="Shows promo code entry in the checkout cart."
                value={config.allowPromotionCodes}
                onValueChange={(allowPromotionCodes) =>
                  updateConfig({ allowPromotionCodes })
                }
              />
              {shouldShowAutomaticTax(config) ? (
                <ToggleRow
                  title="Automatic tax"
                  description="Enables Stripe Tax when the backend supports it."
                  value={config.automaticTax}
                  onValueChange={(automaticTax) =>
                    updateConfig({ automaticTax })
                  }
                />
              ) : null}
              <ToggleRow
                title="Adaptive pricing"
                description="Requests localized pricing when available."
                value={config.adaptivePricing}
                onValueChange={(adaptivePricing) =>
                  updateConfig({
                    adaptivePricing,
                    adaptivePricingCountry: adaptivePricing
                      ? config.adaptivePricingCountry
                      : 'none',
                  })
                }
              />
              <ToggleRow
                title="Offer save payment method"
                description="Enables saved payment method offers."
                value={config.checkoutSessionPaymentMethodSave}
                onValueChange={(checkoutSessionPaymentMethodSave) =>
                  updateConfig({ checkoutSessionPaymentMethodSave })
                }
              />
              <ToggleRow
                title="Allow payment method removal"
                description="Lets Checkout remove saved payment methods."
                value={config.checkoutSessionPaymentMethodRemove}
                onValueChange={(checkoutSessionPaymentMethodRemove) =>
                  updateConfig({ checkoutSessionPaymentMethodRemove })
                }
              />
              {shouldShowAdaptivePricingCountry(config) ? (
                <PickerRow
                  title="Adaptive pricing country"
                  description="Adds a location-based customer email override."
                  selectedValue={config.adaptivePricingCountry}
                  options={adaptivePricingCountryOptions}
                  onValueChange={(adaptivePricingCountry) =>
                    updateConfig({
                      adaptivePricingCountry:
                        adaptivePricingCountry as CheckoutPlaygroundConfig['adaptivePricingCountry'],
                    })
                  }
                />
              ) : null}
            </>
          ) : (
            <View style={styles.setupHint}>
              <Text style={styles.setupHintText}>
                Setup mode hides promo, phone, automatic tax, and other advanced
                checkout-only toggles.
              </Text>
            </View>
          )}
        </GroupedCard>

        <SectionHeader badge="P" title="Payment methods" />
        <GroupedCard>
          <View style={styles.paymentMethodSection}>
            <View style={styles.paymentMethodHeader}>
              <Text style={styles.rowTitle}>Selected methods</Text>
              <TouchableOpacity
                onPress={() => setPaymentMethodEditorVisible(true)}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {config.paymentMethodTypes.length === 0 ? (
              <Text style={styles.emptyState}>
                No payment methods selected.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {normalizePaymentMethodTypes(config.paymentMethodTypes).map(
                  (method) => (
                    <Chip
                      key={method}
                      label={method.replace(/_/g, ' ')}
                      selected
                    />
                  )
                )}
              </View>
            )}
          </View>
        </GroupedCard>
      </ScrollView>

      <PaymentMethodEditorModal
        visible={isPaymentMethodEditorVisible}
        availableMethods={availablePaymentMethods}
        selectedMethods={config.paymentMethodTypes}
        onClose={() => setPaymentMethodEditorVisible(false)}
        onChangeSelectedMethods={(paymentMethodTypes) =>
          updateConfig({ paymentMethodTypes })
        }
      />

      <BottomActionBar
        primaryLabel="Create checkout session"
        primaryDisabled={isCreateDisabled}
        primaryLoading={isCreating}
        onPrimaryPress={onCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  content: {
    padding: 16,
    paddingBottom: 128,
  },
  setupHint: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  setupHintText: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
  paymentMethodSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowTitle: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  editButtonText: {
    color: colors.blurple_dark,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
});
