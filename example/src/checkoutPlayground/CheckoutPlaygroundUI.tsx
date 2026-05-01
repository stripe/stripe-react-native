import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../colors';

export function PlaygroundTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function SectionHeader({
  badge,
  title,
}: {
  badge: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{badge}</Text>
      </View>
      <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
    </View>
  );
}

export function GroupedCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.groupedCard}>{children}</View>;
}

export function StatusBanner({
  tone,
  title,
  message,
  onDismiss,
}: {
  tone: 'error' | 'success' | 'info';
  title: string;
  message: string;
  onDismiss?(): void;
}) {
  const toneStyles =
    tone === 'error'
      ? styles.errorBanner
      : tone === 'success'
        ? styles.successBanner
        : styles.infoBanner;

  return (
    <View style={[styles.banner, toneStyles]}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerMessage}>{message}</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.bannerDismissButton}
        >
          <Text style={styles.bannerDismissText}>X</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?(): void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomActionBar({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondaryPress,
}: {
  primaryLabel: string;
  onPrimaryPress(): void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?(): void;
}) {
  return (
    <View style={styles.actionBar}>
      {secondaryLabel && onSecondaryPress ? (
        <TouchableOpacity
          onPress={onSecondaryPress}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        disabled={primaryDisabled}
        onPress={onPrimaryPress}
        style={[
          styles.primaryAction,
          primaryDisabled && styles.primaryActionDisabled,
        ]}
      >
        <Text style={styles.primaryActionText}>
          {primaryLoading ? `${primaryLabel}...` : primaryLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.slate,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.dark_gray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionBadgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeaderText: {
    color: colors.dark_gray,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  groupedCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    shadowColor: '#0A2540',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#FFF1F3',
    borderColor: '#F3B3BE',
    borderWidth: 1,
  },
  successBanner: {
    backgroundColor: '#ECFFF4',
    borderColor: '#A7E5BD',
    borderWidth: 1,
  },
  infoBanner: {
    backgroundColor: '#EEF5FF',
    borderColor: '#B8D1FF',
    borderWidth: 1,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.slate,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerMessage: {
    color: colors.dark_gray,
    lineHeight: 20,
  },
  bannerDismissButton: {
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  bannerDismissText: {
    color: colors.dark_gray,
    fontWeight: '700',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C9D7E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.blurple,
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.blurple_dark,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0A2540',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  secondaryAction: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  secondaryActionText: {
    color: colors.dark_gray,
    fontWeight: '600',
  },
  primaryAction: {
    backgroundColor: colors.slate,
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryActionDisabled: {
    opacity: 0.45,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
