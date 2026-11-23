import React, { useState } from 'react';
import {
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConnectNotificationBanner } from '../../../src/connect/NotificationBanner';
import ConnectScreen from '../screens/ConnectScreen';
import { Colors } from '../constants/colors';

export default function ConnectNotificationBannerView() {
  return (
    <ConnectScreen>
      <NotificationBannerContent />
    </ConnectScreen>
  );
}

function NotificationBannerContent() {
  const [showBanner, setShowBanner] = useState(true);
  const [status, setStatus] = useState('Loading');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      {showBanner && (
        <ConnectNotificationBanner
          onNotificationsChange={({ total, actionRequired }) =>
            setStatus(`${total} notifications, ${actionRequired} need action`)
          }
          onContentHeightChange={() => LayoutAnimation.easeInEaseOut()}
          onLoadError={({ error }) => {
            setShowBanner(false);
            setStatus(`Failed to load: ${error.message ?? error.type}`);
          }}
        />
      )}
      <View style={styles.content}>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.placeholder}>
          The banner sizes itself to its content. This text moves with it.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
});
