import {
  ConnectComponentsProvider,
  loadConnectAndInitialize,
  StripeConnectInstance,
  StripeConnectUpdateParams,
} from '@stripe/stripe-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { colors } from '../colors';
import { fetchClientSecret, fetchPublishableKey } from '../helpers';

const defaultAppearance: StripeConnectUpdateParams['appearance'] = {};

const defaultLocale = 'en_US';

interface Props {
  children?: React.ReactNode;
}

const ConnectScreen: React.FC<Props> = ({ children }) => {
  const [stripeConnectInstance, setStripeConnectInstance] =
    useState<StripeConnectInstance>();

  const [appearance, setAppearance] = useState(defaultAppearance);
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    fetchPublishableKey().then((publishableKey) => {
      if (!publishableKey) return;

      setStripeConnectInstance(
        loadConnectAndInitialize({
          publishableKey: publishableKey,
          fetchClientSecret,
          appearance: defaultAppearance,
          locale: defaultLocale,
        })
      );
    });
  }, []);

  return !stripeConnectInstance ? (
    <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  ) : (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <View style={styles.switchContainer}>
        <Text>Switch appearance</Text>
        <Switch
          value={appearance !== defaultAppearance}
          onValueChange={(value) => {
            const nextAppearance = value
              ? {
                  variables: {
                    colorPrimary: '#537D5D',
                    colorBackground: '#FFFDF6',
                    buttonSecondaryColorBackground: '#DEECD4',
                    buttonSecondaryColorText: '#537D5D',
                    colorSecondaryText: '#878682',
                    colorBorder: '#D6D6D6',
                    colorDanger: '#EC5228',
                    badgeNeutralColorBackground: '#F5ECD5',
                    badgeNeutralColorBorder: '#F5ECD5',
                    badgeSuccessColorBackground: '#DEECD4',
                    badgeSuccessColorBorder: '#DEECD4',
                    badgeSuccessColorText: '#537D5D',
                    badgeWarningColorBackground: '#FBDAB1',
                    badgeWarningColorBorder: '#FBDAB1',
                    badgeWarningColorText: '#751F00',
                    badgeDangerColorBackground: '#EC5228',
                    badgeDangerColorBorder: '#EC5228',
                    badgeDangerColorText: '#FFF',
                    offsetBackgroundColor: '#FAF6E9',
                    formBackgroundColor: '#FAF6E9',
                    borderRadius: '24px',
                  },
                }
              : defaultAppearance;

            setAppearance(nextAppearance);
            stripeConnectInstance.update({
              appearance: nextAppearance,
              locale,
            });
          }}
        />
      </View>

      <View style={styles.switchContainer}>
        <Text>Switch locale</Text>
        <Switch
          value={locale !== defaultLocale}
          onValueChange={(value) => {
            const newLocale = value ? 'es_ES' : defaultLocale;
            setLocale(newLocale);
            stripeConnectInstance.update({ locale: newLocale, appearance });
          }}
        />
      </View>

      <View style={styles.main}>{children}</View>
    </ConnectComponentsProvider>
  );
};

export default ConnectScreen;

const styles = StyleSheet.create({
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
  },
  main: {
    flex: 1,
  },
});
