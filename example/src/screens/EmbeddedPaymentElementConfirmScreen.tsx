import React from 'react';
import { Alert, View } from 'react-native';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';

export default function EmbeddedPaymentElementConfirmScreen({
  route,
}: {
  route: any;
}) {
  const navigation = useNavigation();

  const { confirm } = route.params;

  // Payment action
  const handlePay = React.useCallback(async () => {
    setLoading(true);
    const result = await confirm();
    if (result.status === 'completed')
      Alert.alert('Success', 'Payment confirmed');
    else if (result.status === 'failed')
      Alert.alert('Error', `Failed: ${result.error.message}`);
    else Alert.alert('Cancelled');
    setLoading(false);
  }, [confirm]);

  const [loading, setLoading] = React.useState(false);

  return (
    <View style={{ padding: 20 }}>
      <Button
        variant="default"
        title="Open screen"
        onPress={() => {
          navigation.navigate('HomeScreen');
        }}
      />

      <Button
        variant="primary"
        title="Complete payment"
        onPress={handlePay}
        loading={loading}
      />
    </View>
  );
}
