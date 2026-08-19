import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Collapse } from '../../../components/Collapse';
import Button from '../../../components/Button';
import { FormField } from '../FormField';
import { useOnramp, Onramp } from '@stripe/stripe-react-native';
import { getDefaultAddressForNetwork } from '../utils';
import { colors } from '../../../colors';
import type { CustomerWallet } from '../../../api/onrampBackend';

interface RegisterWalletAddressSectionProps {
  wallets: CustomerWallet[];
  isWalletsLoading: boolean;
  onDeleteWallet: (wallet: CustomerWallet) => void;
  onRefreshWallets: () => void;
  onWalletRegistered?: (address: string, network: Onramp.CryptoNetwork) => void;
}

export function RegisterWalletAddressSection({
  wallets,
  isWalletsLoading,
  onDeleteWallet,
  onRefreshWallets,
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
      <View style={styles.container}>
        <View style={styles.walletsHeader}>
          <Text style={styles.walletsTitle}>Registered Wallets</Text>
          <View style={styles.refreshContainer}>
            {isWalletsLoading && <ActivityIndicator size="small" />}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={isWalletsLoading}
              onPress={onRefreshWallets}
              style={isWalletsLoading && styles.disabled}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {wallets.length === 0 && !isWalletsLoading && (
          <Text style={styles.emptyWalletsText}>No registered wallets</Text>
        )}

        {wallets.map((wallet) => (
          <View key={wallet.id} style={styles.walletRow}>
            <View style={styles.walletDetails}>
              <Text style={styles.walletNetwork}>
                {wallet.network.charAt(0).toUpperCase() +
                  wallet.network.slice(1)}
              </Text>
              <Text selectable style={styles.walletAddress}>
                {wallet.walletAddress}
              </Text>
              <Text selectable style={styles.walletId}>
                ID: {wallet.id}
              </Text>
              {wallet.verifiedOwnership && (
                <Text style={styles.verifiedWallet}>Verified</Text>
              )}
            </View>
            <TouchableOpacity
              accessibilityLabel={`Delete ${wallet.network} wallet`}
              accessibilityRole="button"
              disabled={isWalletsLoading}
              onPress={() => onDeleteWallet(wallet)}
              style={isWalletsLoading && styles.disabled}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.separator} />

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
          disabled={isWalletsLoading}
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 4,
  },
  walletsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  refreshText: {
    color: colors.blurple,
    fontSize: 16,
    fontWeight: '600',
    padding: 8,
  },
  emptyWalletsText: {
    color: colors.dark_gray,
    marginBottom: 16,
  },
  walletRow: {
    alignItems: 'center',
    backgroundColor: colors.light_gray,
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  walletDetails: {
    flex: 1,
  },
  walletNetwork: {
    fontWeight: '500',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  walletId: {
    color: colors.dark_gray,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  verifiedWallet: {
    color: '#2E7D32',
    fontSize: 12,
  },
  deleteText: {
    color: '#B00020',
    fontSize: 16,
    fontWeight: '600',
    padding: 8,
  },
  separator: {
    height: 12,
  },
  disabled: {
    opacity: 0.3,
  },
});
