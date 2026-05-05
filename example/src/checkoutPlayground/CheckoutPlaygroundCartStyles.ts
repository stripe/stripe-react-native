import { StyleSheet } from 'react-native';
import { colors } from '../colors';

export const cartStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  content: {
    padding: 16,
    paddingBottom: 128,
  },
  sectionContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailRowEmphasized: {
    paddingTop: 8,
    borderTopColor: '#E4ECF5',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    color: colors.dark_gray,
    flex: 1,
    marginRight: 12,
  },
  detailLabelStrong: {
    color: colors.slate,
    fontWeight: '700',
  },
  detailValue: {
    color: colors.slate,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueStrong: {
    fontWeight: '700',
    fontSize: 16,
  },
  copyableDetailRow: {
    marginBottom: 12,
  },
  copyableDetailValue: {
    marginTop: 6,
    color: colors.slate,
    fontWeight: '600',
    lineHeight: 20,
  },
  copyableDetailHint: {
    marginTop: 6,
    color: colors.dark_gray,
    fontSize: 12,
  },
  inlineAction: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  inlineActionText: {
    color: colors.blurple_dark,
    fontWeight: '700',
  },
  stackedCards: {
    marginBottom: 24,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0A2540',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E4ECF5',
  },
  itemImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F6F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E4ECF5',
  },
  itemImageEmoji: {
    fontSize: 32,
  },
  itemDetails: {
    flex: 1,
  },
  itemCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    color: colors.slate,
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  itemMeta: {
    color: colors.dark_gray,
    fontSize: 13,
    marginBottom: 12,
  },
  itemTotal: {
    color: colors.slate,
    fontWeight: '700',
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
    alignSelf: 'flex-start',
    borderRadius: 8,
    padding: 2,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A2540',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quantityButtonDisabled: {
    opacity: 0.35,
  },
  quantityButtonText: {
    color: colors.slate,
    fontWeight: '600',
    fontSize: 16,
  },
  quantityValue: {
    minWidth: 32,
    textAlign: 'center',
    color: colors.slate,
    fontWeight: '600',
    fontSize: 14,
  },
  shippingOptionRow: {
    paddingVertical: 14,
    borderBottomColor: '#E4ECF5',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shippingOptionRowSelected: {
    backgroundColor: '#F1F4FF',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  shippingOptionText: {
    marginBottom: 6,
  },
  shippingOptionTitle: {
    color: colors.slate,
    fontWeight: '700',
    marginBottom: 4,
  },
  shippingOptionSubtitle: {
    color: colors.dark_gray,
  },
  shippingOptionIndicator: {
    color: colors.dark_gray,
    fontWeight: '600',
  },
  shippingOptionIndicatorSelected: {
    color: colors.blurple_dark,
  },
  addressCard: {
    padding: 16,
  },
  addressTitle: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  addressLine: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
  addressEmpty: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    borderColor: '#D9E4F2',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.slate,
    fontSize: 16,
  },
  promoButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginLeft: 8,
  },
  primaryPromoButton: {
    backgroundColor: colors.slate,
  },
  primaryPromoButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  appliedDiscountsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4ECF5',
  },
  appliedDiscountRow: {
    marginBottom: 12,
  },
  appliedDiscountRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appliedDiscountLabel: {
    color: colors.dark_gray,
    flex: 1,
    marginRight: 12,
  },
  appliedDiscountValue: {
    color: colors.slate,
    fontWeight: '600',
  },
  removeDiscountButton: {
    alignSelf: 'flex-start',
  },
  removeDiscountText: {
    color: '#E25950',
    fontWeight: '600',
    fontSize: 14,
  },
});
