import { useNavigation } from '@react-navigation/native';
import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { colors } from '../colors';
import Button from '../components/Button';
import ConnectScreen from './ConnectScreen';

export default function ConnectAccountOnboardingScreen() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  const handleOnboardingExit = useCallback(() => {
    console.log('ConnectAccountOnboarding onExit');
    setVisible(false);
    navigation.navigate('ConnectAccountOnboardingScreen');
  }, [navigation]);

  return (
    <ConnectScreen>
      <View style={styles.container}>
        <Button
          variant="primary"
          title="Show Onboarding"
          onPress={() => setVisible(true)}
        />

        {visible ? (
          <ConnectAccountOnboarding
            title="Connect Account Onboarding"
            onExit={handleOnboardingExit}
            onLoadError={(err) => {
              Alert.alert('Error', err.error.message);
            }}
          />
        ) : null}
      </View>
    </ConnectScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
});
