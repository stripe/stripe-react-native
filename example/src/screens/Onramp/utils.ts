import { Onramp } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';

export function getDefaultAddressForNetwork(
  cryptoNetwork: Onramp.CryptoNetwork
): string {
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
}

export function getDestinationParamsForNetwork(network: Onramp.CryptoNetwork): {
  destinationNetwork: string;
  destinationCurrency: string;
} {
  switch (network) {
    case Onramp.CryptoNetwork.ethereum:
      return { destinationNetwork: 'ethereum', destinationCurrency: 'eth' };
    case Onramp.CryptoNetwork.polygon:
      return { destinationNetwork: 'polygon', destinationCurrency: 'eth' };
    case Onramp.CryptoNetwork.avalanche:
      return { destinationNetwork: 'avalanche', destinationCurrency: 'avax' };
    case Onramp.CryptoNetwork.base:
      return { destinationNetwork: 'base', destinationCurrency: 'eth' };
    case Onramp.CryptoNetwork.optimism:
      return { destinationNetwork: 'optimism', destinationCurrency: 'eth' };
    case Onramp.CryptoNetwork.worldchain:
      return { destinationNetwork: 'worldchain', destinationCurrency: 'eth' };
    case Onramp.CryptoNetwork.solana:
      return { destinationNetwork: 'solana', destinationCurrency: 'sol' };
    case Onramp.CryptoNetwork.bitcoin:
      return { destinationNetwork: 'bitcoin', destinationCurrency: 'btc' };
    case Onramp.CryptoNetwork.stellar:
      return { destinationNetwork: 'stellar', destinationCurrency: 'xlm' };
    case Onramp.CryptoNetwork.aptos:
      return { destinationNetwork: 'aptos', destinationCurrency: 'apt' };
    case Onramp.CryptoNetwork.xrpl:
      return { destinationNetwork: 'xrpl', destinationCurrency: 'xrp' };
    default:
      return { destinationNetwork: 'ethereum', destinationCurrency: 'eth' };
  }
}

const showAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};

export const showError = (message: string) => showAlert('Error', message);
export const showSuccess = (message: string) => showAlert('Success', message);
export const showCanceled = (message: string) => showAlert('Canceled', message);
