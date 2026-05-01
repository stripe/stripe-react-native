import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Checkout } from '@stripe/stripe-react-native/src/types/Checkout';
import { colors } from '../colors';
import { GroupedCard, SectionHeader } from './components';
import { cartStyles as styles } from './CheckoutPlaygroundCartStyles';
import {
  getEmojiForProduct,
  type OrderSummaryRow,
} from './CheckoutPlaygroundCartUtils';
import {
  formatCurrencyAmount,
  shouldShowAutomaticTax,
  type CheckoutPlaygroundConfig,
} from './types';

function DetailRow({
  label,
  value,
  isEmphasized,
}: {
  label: string;
  value: string;
  isEmphasized?: boolean;
}) {
  return (
    <View
      style={[styles.detailRow, isEmphasized && styles.detailRowEmphasized]}
    >
      <Text
        style={[styles.detailLabel, isEmphasized && styles.detailLabelStrong]}
      >
        {label}
      </Text>
      <Text
        style={[styles.detailValue, isEmphasized && styles.detailValueStrong]}
      >
        {value}
      </Text>
    </View>
  );
}

function CopyableDetailRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.copyableDetailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.copyableDetailValue}>
        {value}
      </Text>
      {hint ? <Text style={styles.copyableDetailHint}>{hint}</Text> : null}
    </View>
  );
}

export function SessionSection({
  session,
  config,
  onRefresh,
}: {
  session: Checkout.Session;
  config: CheckoutPlaygroundConfig;
  onRefresh(): void;
}) {
  return (
    <>
      <SectionHeader badge="S" title="Session" />
      <GroupedCard>
        <View style={styles.sectionContent}>
          <CopyableDetailRow
            label="Session ID"
            value={session.id}
            hint="Long press to copy"
          />
          <DetailRow label="Mode" value={config.mode} />
          <DetailRow label="Status" value={session.status ?? 'unknown'} />
          <DetailRow label="Payment status" value={session.paymentStatus} />
          <DetailRow
            label="Environment"
            value={session.livemode ? 'live' : 'test'}
          />
          <DetailRow label="Customer" value={config.customerType} />
          <DetailRow
            label="Automatic tax"
            value={
              shouldShowAutomaticTax(config) && config.automaticTax
                ? 'enabled'
                : 'disabled'
            }
          />
          {session.customerEmail ? (
            <DetailRow label="Customer email" value={session.customerEmail} />
          ) : null}
          <TouchableOpacity onPress={onRefresh} style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Refresh session</Text>
          </TouchableOpacity>
        </View>
      </GroupedCard>
    </>
  );
}

export function ItemsSection({
  items,
  disableActions,
  onUpdateQuantity,
}: {
  items: Checkout.LineItem[];
  disableActions: boolean;
  onUpdateQuantity(lineItemId: string, quantity: number): void;
}) {
  return (
    <>
      <SectionHeader badge="I" title="Items" />
      <View style={styles.stackedCards}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemImageContainer}>
              <Text style={styles.itemImageEmoji}>
                {getEmojiForProduct(item.name)}
              </Text>
            </View>
            <View style={styles.itemDetails}>
              <View style={styles.itemCardTopRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemTotal}>
                  {formatCurrencyAmount(
                    item.unitAmount * item.quantity,
                    item.currency
                  )}
                </Text>
              </View>
              <Text style={styles.itemMeta}>
                {formatCurrencyAmount(item.unitAmount, item.currency)} each
              </Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  disabled={disableActions || item.quantity <= 1}
                  onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  style={[
                    styles.quantityButton,
                    (disableActions || item.quantity <= 1) &&
                      styles.quantityButtonDisabled,
                  ]}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{item.quantity}</Text>
                <TouchableOpacity
                  disabled={disableActions}
                  onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  style={[
                    styles.quantityButton,
                    disableActions && styles.quantityButtonDisabled,
                  ]}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

export function ShippingOptionsSection({
  shippingOptions,
  selectedShippingOptionId,
  disableActions,
  onSelectShippingOption,
}: {
  shippingOptions: Checkout.ShippingOption[];
  selectedShippingOptionId: string | null;
  disableActions: boolean;
  onSelectShippingOption(id: string): void;
}) {
  return (
    <>
      <SectionHeader badge="H" title="Shipping options" />
      <GroupedCard>
        <View style={styles.sectionContent}>
          {shippingOptions.map((option) => {
            const isSelected = selectedShippingOptionId === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                disabled={disableActions}
                onPress={() => onSelectShippingOption(option.id)}
                style={[
                  styles.shippingOptionRow,
                  isSelected && styles.shippingOptionRowSelected,
                ]}
              >
                <View style={styles.shippingOptionText}>
                  <Text style={styles.shippingOptionTitle}>
                    {option.displayName}
                  </Text>
                  <Text style={styles.shippingOptionSubtitle}>
                    {formatCurrencyAmount(option.amount, option.currency)}
                    {option.deliveryEstimate
                      ? ` · ${option.deliveryEstimate}`
                      : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.shippingOptionIndicator,
                    isSelected && styles.shippingOptionIndicatorSelected,
                  ]}
                >
                  {isSelected ? 'Selected' : 'Choose'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GroupedCard>
    </>
  );
}

export function AddressSection({
  badge,
  title,
  actionLabel,
  lines,
  emptyMessage,
  disabled,
  onPress,
}: {
  badge: string;
  title: string;
  actionLabel: string;
  lines: string[];
  emptyMessage: string;
  disabled: boolean;
  onPress(): void;
}) {
  return (
    <>
      <SectionHeader badge={badge} title={title} />
      <GroupedCard>
        <TouchableOpacity
          disabled={disabled}
          onPress={onPress}
          style={styles.addressCard}
        >
          <Text style={styles.addressTitle}>{actionLabel}</Text>
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.addressLine}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={styles.addressEmpty}>{emptyMessage}</Text>
          )}
        </TouchableOpacity>
      </GroupedCard>
    </>
  );
}

export function PromotionSection({
  promotionCode,
  onChangePromotionCode,
  onApplyPromotionCode,
  onRemovePromotionCode,
  disableActions,
  discounts,
  currency,
}: {
  promotionCode: string;
  onChangePromotionCode(value: string): void;
  onApplyPromotionCode(): void;
  onRemovePromotionCode(): void;
  disableActions: boolean;
  discounts: Checkout.Discount[];
  currency?: string;
}) {
  return (
    <>
      <SectionHeader badge="P" title="Promotion code" />
      <GroupedCard>
        <View style={styles.sectionContent}>
          <View style={styles.promoInputRow}>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!disableActions}
              onChangeText={onChangePromotionCode}
              placeholder="Enter a promotion code"
              placeholderTextColor={colors.dark_gray}
              style={styles.promoInput}
              value={promotionCode}
            />
            <TouchableOpacity
              disabled={disableActions || !promotionCode.trim()}
              onPress={onApplyPromotionCode}
              style={[
                styles.promoButton,
                styles.primaryPromoButton,
                (disableActions || !promotionCode.trim()) &&
                  styles.quantityButtonDisabled,
              ]}
            >
              <Text style={styles.primaryPromoButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {discounts.length > 0 ? (
            <View style={styles.appliedDiscountsContainer}>
              {discounts.map((discount) => (
                <View
                  key={discount.coupon.id}
                  style={styles.appliedDiscountRow}
                >
                  <View style={styles.appliedDiscountRowTop}>
                    <Text style={styles.appliedDiscountLabel}>
                      {discount.promotionCode ||
                        discount.coupon.name ||
                        discount.coupon.id}
                    </Text>
                    <Text style={styles.appliedDiscountValue}>
                      {formatCurrencyAmount(discount.amount, currency)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={disableActions}
                    onPress={onRemovePromotionCode}
                    style={styles.removeDiscountButton}
                  >
                    <Text style={styles.removeDiscountText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </GroupedCard>
    </>
  );
}

export function OrderSummarySection({
  rows,
  currency,
}: {
  rows: OrderSummaryRow[];
  currency?: string;
}) {
  return (
    <>
      <SectionHeader badge="O" title="Order summary" />
      <GroupedCard>
        <View style={styles.sectionContent}>
          {rows.map((row) => (
            <DetailRow
              key={row.label}
              label={row.label}
              value={formatCurrencyAmount(row.value, currency)}
              isEmphasized={row.emphasized}
            />
          ))}
        </View>
      </GroupedCard>
    </>
  );
}
