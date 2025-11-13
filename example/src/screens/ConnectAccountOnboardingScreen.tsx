import { ConnectAccountOnboarding } from '@stripe/stripe-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import ConnectScreen from './ConnectScreen';
import { useState } from 'react';
import Button from '../components/Button';
import { colors } from '../colors';

export default function ConnectAccountOnboardingScreen() {
  const [visible, setVisible] = useState(false);

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
            onExit={() => {
              console.log('ConnectAccountOnboarding onExit');
              setVisible(false);
            }}
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
