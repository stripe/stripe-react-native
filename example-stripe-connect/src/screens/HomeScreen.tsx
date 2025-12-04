import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';
import React, { useLayoutEffect, useMemo } from 'react';
import {
  Platform,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import type { RootStackParamList } from '../types';
import { Separator } from '../components/Separator';
import { ChevronRight } from '../components/ChevronRight';
import { Colors } from '../constants/colors';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { selectedMerchant, viewControllerSettings } = useSettings();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Merchant: ${selectedMerchant?.display_name || selectedMerchant?.merchant_id || 'None'}`,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
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
          onPress={() => navigation.navigate('ConfigureAppearance')}
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
    });
  }, [navigation, selectedMerchant]);

  const menuItems = useMemo(
    () => [
      {
        title: 'Account onboarding',
        description: 'Show a localized onboarding form that validates data.',
        onPress: () => {
          if (viewControllerSettings.embedInTabBar) {
            navigation.navigate('ComponentTabs');
          } else {
            navigation.navigate('AccountOnboarding');
          }
        },
      },
      {
        title: 'Payouts',
        badge: 'Beta',
        description: 'Show payouts and allow your users to perform payouts.',
        onPress: () => {
          if (viewControllerSettings.embedInTabBar) {
            navigation.navigate('ComponentTabs');
          } else {
            navigation.navigate('Payouts');
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
            navigation.navigate('ComponentTabs');
          } else {
            navigation.navigate('Payments');
          }
        },
      },
    ],
    [navigation, viewControllerSettings.embedInTabBar]
  );

  return (
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
              <Text style={styles.menuItemDescription}>{item.description}</Text>
            </View>
            <ChevronRight size={24} />
          </TouchableOpacity>
          {index < menuItems.length - 1 && <Separator />}
        </View>
      )}
    />
  );
};

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

export default HomeScreen;
