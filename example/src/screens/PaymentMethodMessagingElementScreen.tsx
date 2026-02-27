import {
  PaymentMethodMessagingElement,
  PaymentMethodMessagingElementStyle,
} from '@stripe/stripe-react-native';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Button from '../components/Button';
import PaymentScreen from '../components/PaymentScreen';

export default function PaymentMethodMessagingElementScreen() {
  const [price, setPrice] = useState(1000);
  const [locale, setLocale] = useState<'en' | 'fr' | 'ko'>('en');
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<string[]>([
    'klarna',
  ]);
  const [textColor, setTextColor] = useState<
    'blue' | 'red' | 'yellow' | 'black'
  >('black');
  const [linkTextColor, setLinkTextColor] = useState<
    'blue' | 'red' | 'yellow' | 'black'
  >('black');
  const [style, setStyle] = useState<PaymentMethodMessagingElementStyle>(
    PaymentMethodMessagingElementStyle.Flat
  );
  const [config, setConfig] = useState({
    amount: price,
    currency: 'usd',
    locale: locale,
    paymentMethodTypes: paymentMethodTypes,
  });
  const [status, setStatus] = useState('');

  const colorMap = {
    blue: '#0000FF',
    red: '#FF0000',
    yellow: '#FFFF00',
    black: '#000000',
  };

  useEffect(() => {
    setConfig({
      amount: price,
      currency: 'usd',
      locale: locale,
      paymentMethodTypes: paymentMethodTypes,
    });
  }, [price, locale, paymentMethodTypes]);

  const togglePaymentMethod = (method: string) => {
    setPaymentMethodTypes((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  return (
    <PaymentScreen>
      <PaymentMethodMessagingElement
        configuration={config}
        onStateChange={(e) => {
          setStatus(e.status);
        }}
        appearance={{
          style: style,
          textColor: colorMap[textColor],
          linkTextColor: colorMap[linkTextColor],
        }}
      />
      <Text style={styles.pickerLabel}>State: {status}</Text>
      <Button
        variant="primary"
        onPress={() => togglePaymentMethod('klarna')}
        title={`Klarna ${paymentMethodTypes.includes('klarna') ? '✓' : ''}`}
      />
      <Button
        variant="primary"
        onPress={() => togglePaymentMethod('affirm')}
        title={`Affirm ${paymentMethodTypes.includes('affirm') ? '✓' : ''}`}
      />
      <Button
        variant="primary"
        onPress={() => togglePaymentMethod('afterpay_clearpay')}
        title={`Afterpay/Clearpay ${paymentMethodTypes.includes('afterpay_clearpay') ? '✓' : ''}`}
      />
      <Button
        variant="primary"
        onPress={() => {
          setPrice((prev) => prev + 1000);
        }}
        title={`Price ${price} click to increase`}
      />
      <Button
        variant="primary"
        onPress={() => {
          setPrice(0);
        }}
        title="Set price to 0"
      />
      {status === 'succeeded' && (
        <View>
          <Text>PMME is loaded</Text>
        </View>
      )}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Locale:</Text>
        <Picker
          selectedValue={locale}
          onValueChange={(itemValue) => setLocale(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="English (en)" value="en" />
          <Picker.Item label="French (fr)" value="fr" />
          <Picker.Item label="Korean (ko)" value="ko" />
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Text Color:</Text>
        <Picker
          selectedValue={textColor}
          onValueChange={(itemValue) => setTextColor(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Black" value="black" />
          <Picker.Item label="Blue" value="blue" />
          <Picker.Item label="Red" value="red" />
          <Picker.Item label="Yellow" value="yellow" />
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Link Text Color:</Text>
        <Picker
          selectedValue={linkTextColor}
          onValueChange={(itemValue) => setLinkTextColor(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Black" value="black" />
          <Picker.Item label="Blue" value="blue" />
          <Picker.Item label="Red" value="red" />
          <Picker.Item label="Yellow" value="yellow" />
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Style:</Text>
        <Picker
          selectedValue={style}
          onValueChange={(itemValue) => setStyle(itemValue)}
          style={styles.picker}
        >
          <Picker.Item
            label="Flat"
            value={PaymentMethodMessagingElementStyle.Flat}
          />
          <Picker.Item
            label="Dark"
            value={PaymentMethodMessagingElementStyle.Dark}
          />
          <Picker.Item
            label="Light"
            value={PaymentMethodMessagingElementStyle.Light}
          />
        </Picker>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    flex: 1,
    height: Platform.OS === 'ios' ? 200 : 50,
  },
});
