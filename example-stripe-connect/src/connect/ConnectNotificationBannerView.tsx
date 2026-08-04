import {
  ConnectNotificationBanner,
  type NotificationBannerInitialLoadState,
} from '../../../src/connect/NotificationBanner';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { APPEARANCE_PRESETS } from '../constants/appearancePresets';
import { useSettings } from '../contexts/SettingsContext';
import ConnectScreen from '../screens/ConnectScreen';

export default function ConnectNotificationBannerView() {
  return (
    <ConnectScreen>
      <NotificationBannerContent />
    </ConnectScreen>
  );
}

function NotificationBannerContent() {
  const { appearancePreset } = useSettings();
  const [loadState, setLoadState] =
    useState<NotificationBannerInitialLoadState>('loading');
  const [total, setTotal] = useState(0);
  const [actionRequired, setActionRequired] = useState(0);
  const [height, setHeight] = useState(0);
  const [transitionComplete, setTransitionComplete] = useState(false);
  const transitionHeight = useRef(new Animated.Value(SKELETON_HEIGHT)).current;
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const didCompleteInitialTransition = useRef(false);
  const theme = useMemo(() => {
    const variables = APPEARANCE_PRESETS[appearancePreset] ?? {};
    return {
      background: variables.colorBackground ?? '#FFFFFF',
      surface: variables.offsetBackgroundColor ?? '#F6F8FA',
      text: variables.colorText ?? '#1F2937',
      secondaryText: variables.colorSecondaryText ?? '#667085',
      border: variables.colorBorder ?? '#D0D5DD',
      radius: parsePixels(variables.borderRadius, 8),
    };
  }, [appearancePreset]);

  useEffect(() => {
    if (loadState === 'loading') {
      didCompleteInitialTransition.current = false;
      setTransitionComplete(false);
      transitionHeight.setValue(SKELETON_HEIGHT);
      skeletonOpacity.setValue(1);
      bannerOpacity.setValue(0);
      return;
    }

    if (didCompleteInitialTransition.current) return;

    const animation = Animated.parallel([
      Animated.timing(transitionHeight, {
        toValue: loadState === 'loaded' ? height : 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: loadState === 'loaded' ? 1 : 0,
        duration: 200,
        delay: 40,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (!finished) return;
      didCompleteInitialTransition.current = true;
      setTransitionComplete(true);
    });

    return () => animation.stop();
  }, [bannerOpacity, height, loadState, skeletonOpacity, transitionHeight]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Animated.View
        style={[
          styles.bannerTransition,
          transitionComplete ? null : { height: transitionHeight },
        ]}
      >
        <Animated.View style={{ opacity: bannerOpacity }}>
          <ConnectNotificationBanner
            taskTitle="Update information"
            onInitialLoadStateChange={setLoadState}
            onContentHeightChange={setHeight}
            onNotificationsChange={(change) => {
              setTotal(change.total);
              setActionRequired(change.actionRequired);
            }}
            onLoadError={(error) => {
              Alert.alert(
                'Notification banner failed to load',
                error.error.message
              );
            }}
          />
        </Animated.View>
        {!transitionComplete ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.skeletonOverlay, { opacity: skeletonOpacity }]}
          >
            <BannerSkeleton theme={theme} />
          </Animated.View>
        ) : null}
      </Animated.View>
      <Text style={[styles.debugText, { color: theme.secondaryText }]}>
        {`loadState → ${loadState}\nnotifications → total: ${total}, actionRequired: ${actionRequired}\nheight → ${height}`}
      </Text>
      <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>
        YOUR APP CONTENT
      </Text>
      <HostCard theme={theme}>
        <Text style={{ color: theme.secondaryText }}>Available balance</Text>
        <Text style={[styles.balance, { color: theme.text }]}>$2,438.19</Text>
      </HostCard>
      {SAMPLE_PAYMENTS.map(([description, date, amount]) => (
        <HostCard key={description} theme={theme}>
          <View style={styles.paymentRow}>
            <View>
              <Text style={{ color: theme.text }}>{description}</Text>
              <Text style={[styles.caption, { color: theme.secondaryText }]}>
                {date}
              </Text>
            </View>
            <Text style={{ color: theme.text }}>{amount}</Text>
          </View>
        </HostCard>
      ))}
    </ScrollView>
  );
}

function BannerSkeleton({ theme }: { theme: Theme }) {
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.45,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseOpacity]);

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderRadius: theme.radius,
        },
      ]}
    >
      <Animated.View
        style={[styles.skeletonContent, { opacity: pulseOpacity }]}
      >
        <View style={styles.skeletonText}>
          <SkeletonBar width="62%" theme={theme} />
          <SkeletonBar width="82%" theme={theme} />
        </View>
        <View
          style={[
            styles.skeletonButton,
            { backgroundColor: withOpacity(theme.secondaryText, 0.14) },
          ]}
        />
      </Animated.View>
    </View>
  );
}

function SkeletonBar({ width, theme }: { width: `${number}%`; theme: Theme }) {
  return (
    <View
      style={[
        styles.skeletonBar,
        { width, backgroundColor: withOpacity(theme.secondaryText, 0.14) },
      ]}
    />
  );
}

function HostCard({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: theme.radius,
        },
      ]}
    >
      {children}
    </View>
  );
}

function parsePixels(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function withOpacity(color: string, opacity: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0');
    return `${color}${alpha}`;
  }
  return color;
}

type Theme = {
  background: string;
  surface: string;
  text: string;
  secondaryText: string;
  border: string;
  radius: number;
};

const SAMPLE_PAYMENTS = [
  ['Northstar Coffee', 'Today', '+$84.00'],
  ['Juniper Market', 'Yesterday', '+$126.50'],
  ['Lighthouse Books', 'Jul 29', '+$42.75'],
] as const;

const SKELETON_HEIGHT = 104;

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  bannerTransition: {
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  debugText: {
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 6,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    fontSize: 12,
    marginTop: 4,
  },
  skeleton: {
    height: SKELETON_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  skeletonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonText: {
    flex: 1,
    gap: 10,
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
  },
  skeletonButton: {
    width: 72,
    height: 36,
    borderRadius: 8,
    marginLeft: 16,
  },
});
