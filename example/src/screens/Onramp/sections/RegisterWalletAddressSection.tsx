import React, { useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import { useOnramp, Onramp } from '@stripe/stripe-react-native';

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

  // Sample addresses for different networks
  const getDefaultAddressForNetwork = useCallback(
    (cryptoNetwork: Onramp.CryptoNetwork): string => {
      switch (cryptoNetwork) {
        case Onramp.CryptoNetwork.ethereum:
        case Onramp.CryptoNetwork.polygon:
        case Onramp.CryptoNetwork.avalanche:
        case Onramp.CryptoNetwork.base:
        case Onramp.CryptoNetwork.optimism:
        case Onramp.CryptoNetwork.worldchain:
          return '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
        case Onramp.CryptoNetwork.solana:
          return '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
        case Onramp.CryptoNetwork.bitcoin:
          return '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
        case Onramp.CryptoNetwork.stellar:
          return 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';
        case Onramp.CryptoNetwork.aptos:
          return '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';
        case Onramp.CryptoNetwork.xrpl:
          return 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH';
        default:
          return '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      }
    },
    []
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
    [getDefaultAddressForNetwork]
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
