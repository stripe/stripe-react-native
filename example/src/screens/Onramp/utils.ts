import { Onramp } from '@stripe/stripe-react-native';

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
