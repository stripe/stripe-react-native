import React, { useLayoutEffect } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { SymbolView } from 'expo-symbols';
import { ConnectPayouts } from '@stripe/stripe-react-native';
import ConnectScreen from './ConnectScreen';
import { Colors } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payouts'>;

const PayoutsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  useLayoutEffect(() => {
    navigation.setOptions({
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
  }, [navigation]);

  return (
    <ConnectScreen>
      <ConnectPayouts
        onLoadError={(err) => {
          Alert.alert('Error', err.error.message);
        }}
      />
    </ConnectScreen>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
  },
  symbolView: {
    width: 22,
    height: 22,
  },
  headerIcon: {
    fontSize: 24,
  },
});

export default PayoutsScreen;
