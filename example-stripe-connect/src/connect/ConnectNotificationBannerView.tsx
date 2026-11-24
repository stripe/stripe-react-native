import React, { useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConnectNotificationBanner } from '../../../src/connect/NotificationBanner';
import ConnectScreen from '../screens/ConnectScreen';
import { useSettings } from '../contexts/SettingsContext';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';

const ACTIVITIES = [
  {
    title: 'Jordan Lee',
    detail: 'Payment · Today, 9:41 AM',
    amount: '+$84.00',
  },
  {
    title: 'Bank account ••6789',
    detail: 'Payout · Yesterday',
    amount: '−$3,000.00',
  },
  { title: 'Sam Park', detail: 'Payment · Yesterday', amount: '+$126.50' },
  { title: 'Alex Kim', detail: 'Refund · Nov 20', amount: '−$24.50' },
  { title: 'Riley Chen', detail: 'Payment · Nov 19', amount: '+$310.00' },
];

export default function ConnectNotificationBannerView() {
  return (
    <ConnectScreen>
      <NotificationBannerContent />
    </ConnectScreen>
  );
}

/**
 * A sample home screen with the notification banner above the app's own content, which is placeholder data.
 * The screen takes its colors, font, and corner radius from the selected appearance, so the banner blends in.
 */
function NotificationBannerContent() {
  const [showBanner, setShowBanner] = useState(true);
  const [hasBannerContent, setHasBannerContent] = useState(false);
  const style = useSampleScreenStyle();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: style.background }}
      contentContainerStyle={styles.container}
    >
      {showBanner && (
        <ConnectNotificationBanner
          onContentHeightChange={({ height }) => {
            LayoutAnimation.easeInEaseOut();
            setHasBannerContent(height > 0);
          }}
          onLoadError={() => {
            setShowBanner(false);
            Alert.alert('Error loading the notification banner');
          }}
        />
      )}
      {/* No gap while the banner has nothing to show */}
      <View style={hasBannerContent ? styles.bannerGap : undefined} />
      <View style={[styles.card, style.card]}>
        <Text style={[styles.caption, style.secondaryText]}>
          Available balance
        </Text>
        <Text style={[styles.balance, style.text]}>$12,480.55</Text>
        <Text style={[styles.caption, style.secondaryText]}>
          Next payout of $3,210.00 on Dec 2
        </Text>
      </View>
      <Text style={[styles.sectionHeader, style.text]}>Recent activity</Text>
      <View style={[styles.card, styles.activityCard, style.card]}>
        {ACTIVITIES.map((activity, index) => (
          <View
            key={activity.title}
            style={[
              styles.activityRow,
              index > 0 && [styles.separator, { borderTopColor: style.border }],
            ]}
          >
            <View style={styles.activityText}>
              <Text style={[styles.body, style.text]}>{activity.title}</Text>
              <Text style={[styles.caption, style.secondaryText]}>
                {activity.detail}
              </Text>
            </View>
            <Text style={[styles.body, styles.amount, style.text]}>
              {activity.amount}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** The appearance values the placeholder content uses, with the same defaults as the components */
function useSampleScreenStyle() {
  const { appearancePreset } = useSettings();
  return useMemo(() => {
    const variables = APPEARANCE_PRESETS[appearancePreset] || {};
    const border = variables.colorBorder || '#D6D9DE';
    const fontFamily = variables.fontFamily;
    return {
      background: variables.colorBackground || '#FFFFFF',
      border,
      card: {
        borderColor: border,
        borderRadius: parseFloat(variables.borderRadius || '6px'),
      },
      text: { color: variables.colorText || '#354052', fontFamily },
      secondaryText: {
        color: variables.colorSecondaryText || '#6B7380',
        fontFamily,
      },
    };
  }, [appearancePreset]);
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  bannerGap: {
    height: 16,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  activityCard: {
    paddingVertical: 4,
    gap: 0,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
  },
  caption: {
    fontSize: 13,
  },
  body: {
    fontSize: 16,
  },
  amount: {
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  activityText: {
    flex: 1,
    gap: 2,
  },
});
