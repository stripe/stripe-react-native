import type {
  CustomerAdapter,
  CustomerPaymentOption,
} from '@stripe/stripe-react-native';
import { API_URL } from '../Config';

export class ExampleCustomerAdapter implements CustomerAdapter {
  customerId: string;

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  async fetchPaymentMethods(): Promise<object[]> {
    console.log('--> CustomerAdapter: fetchPaymentMethods');
    const response = await fetch(`${API_URL}/fetch-payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: this.customerId,
      }),
    });
    const result = await response.json();
    return result.paymentMethods;
  }

  async attachPaymentMethod(paymentMethodId: string) {
    console.log('--> CustomerAdapter: attachPaymentMethod');
    const response = await fetch(`${API_URL}/attach-payment-method`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: this.customerId,
        paymentMethodId,
      }),
    });
    const result = await response.json();
    return result.paymentMethod;
  }

  async detachPaymentMethod(paymentMethodId: string) {
    console.log('--> CustomerAdapter: detachPaymentMethod');
    const response = await fetch(`${API_URL}/detach-payment-method`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId,
      }),
    });
    const result = await response.json();
    return result.paymentMethod;
  }

  async setSelectedPaymentOption(paymentOption: CustomerPaymentOption | null) {
    console.log('--> CustomerAdapter: setSelectedPaymentOption');
    await fetch(`${API_URL}/set-payment-option`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: this.customerId,
        paymentOption,
      }),
    });
    return;
  }

  async fetchSelectedPaymentOption() {
    console.log('--> CustomerAdapter: fetchSelectedPaymentOption');
    const response = await fetch(`${API_URL}/get-payment-option`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: this.customerId,
      }),
    });
    const result = await response.json();
    return result.savedPaymentOption;
  }
}
