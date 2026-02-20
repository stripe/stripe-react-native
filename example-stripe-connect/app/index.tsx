import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight } from '../src/components/ChevronRight';
import { Separator } from '../src/components/Separator';
import { Colors } from '../src/constants/colors';
import { useSettings } from '../src/contexts/SettingsContext';

export default function HomeScreen() {
  const router = useRouter();
  const { selectedMerchant, viewControllerSettings } = useSettings();

  const menuItems = useMemo(
    () => [
      {
        title: 'Account onboarding',
        description: 'Show a localized onboarding form that validates data.',
        onPress: () => {
          if (viewControllerSettings.embedInTabBar) {
            router.push('/(tabs)/onboarding');
          } else {
            router.push('/account-onboarding');
          }
        },
      },
      {
        title: 'Payouts',
        badge: 'Beta',
        description: 'Show payouts and allow your users to perform payouts.',
        onPress: () => {
          if (viewControllerSettings.embedInTabBar) {
            router.push('/(tabs)/payouts');
          } else {
            router.push('/payouts');
          }
        },
      },
      {
        title: 'Payments',
        badge: 'Beta',
        description:
          'Show payments and allow your users to view payment details and manage disputes.',
        onPress: () => {
          if (viewControllerSettings.embedInTabBar) {
            router.push('/(tabs)/payments');
          } else {
            router.push('/payments');
          }
        },
      },
    ],
    [router, viewControllerSettings.embedInTabBar]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `Merchant: ${selectedMerchant?.display_name || selectedMerchant?.merchant_id || 'None'}`,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(settings)')}
              style={styles.headerButton}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name="gearshape.fill"
                  size={22}
                  tintColor={Colors.icon.primary}
                  style={styles.symbolView}
                />
              ) : (
                <Text style={styles.headerIcon}>⚙️</Text>
              )}
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/configure-appearance')}
              style={styles.headerButton}
            >
              {Platform.OS === 'ios' ? (
                <SymbolView
                  name="paintpalette"
                  size={22}
                  tintColor={Colors.icon.primary}
                  style={styles.symbolView}
                />
              ) : (
                <Text style={styles.headerIcon}>🎨</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        data={menuItems}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View>
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
                </View>
                <Text style={styles.menuItemDescription}>
                  {item.description}
                </Text>
              </View>
              <ChevronRight size={24} />
            </TouchableOpacity>
            {index < menuItems.length - 1 && <Separator />}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background.primary,
  },
  menuItemContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  badge: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  menuItemDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.secondary,
  },
  symbolView: {
    width: 22,
    height: 22,
  },
});
