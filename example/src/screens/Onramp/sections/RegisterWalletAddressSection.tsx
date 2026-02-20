import React, { useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import { useOnramp, Onramp } from '@stripe/stripe-react-native';
import { getDefaultAddressForNetwork } from '../utils';

interface RegisterWalletAddressSectionProps {
  onWalletRegistered?: (address: string, network: Onramp.CryptoNetwork) => void;
}

export function RegisterWalletAddressSection({
  onWalletRegistered,
}: RegisterWalletAddressSectionProps) {
  const { registerWalletAddress } = useOnramp();
  const [network, setNetwork] = useState<Onramp.CryptoNetwork>(
    Onramp.CryptoNetwork.ethereum
  );

  const [walletAddress, setWalletAddress] = useState(
    getDefaultAddressForNetwork(Onramp.CryptoNetwork.ethereum)
  );
  const [response, setResponse] = useState<string | null>(null);

  // Update wallet address when network changes
  const handleNetworkChange = useCallback(
    (newNetwork: Onramp.CryptoNetwork) => {
      setNetwork(newNetwork);
      setWalletAddress(getDefaultAddressForNetwork(newNetwork));
    },
    []
  );

  const handleRegisterWallet = useCallback(async () => {
    setResponse(null);
    const result = await registerWalletAddress(walletAddress, network);

    if (result?.error) {
      setResponse(
        `Error: ${result.error.message || 'Failed to register wallet.'}`
      );
      Alert.alert(
        'Error',
        result.error.message || 'Failed to register wallet.'
      );
    } else {
      setResponse('Wallet registered');
      onWalletRegistered?.(walletAddress, network);
    }
  }, [walletAddress, network, registerWalletAddress, onWalletRegistered]);

  return (
    <Collapse title="Wallet Registration" initialExpanded={true}>
      <View style={{ paddingVertical: 16, gap: 4 }}>
        <Text style={{ marginBottom: 8 }}>Wallet Address:</Text>
        <FormField
          label="Wallet Address"
          value={walletAddress ?? ''}
          onChangeText={setWalletAddress}
          placeholder={`Enter ${network} wallet address`}
        />
        <Text style={{ marginBottom: 8 }}>
          Current format: {network} address (auto-updated when network changes)
        </Text>
        <Text style={{ marginBottom: 8 }}>Network:</Text>
        <Picker
          selectedValue={network}
          onValueChange={(itemValue) =>
            handleNetworkChange(itemValue as Onramp.CryptoNetwork)
          }
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
            marginBottom: 8,
          }}
        >
          {Object.values(Onramp.CryptoNetwork).map((n) => (
            <Picker.Item
              key={String(n)}
              label={String(n).charAt(0).toUpperCase() + String(n).slice(1)}
              value={n}
            />
          ))}
        </Picker>
        <Text style={{ marginBottom: 8 }}>
          Selected Network: {String(network)}
        </Text>
        <Button
          title="Register Wallet Address"
          onPress={handleRegisterWallet}
          variant="primary"
        />
        {response && (
          <Text style={{ marginTop: 12, fontSize: 12, color: '#333' }}>
            {response}
          </Text>
        )}
      </View>
    </Collapse>
  );
}
