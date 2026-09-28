import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import NativeStripeSdk from '../../../../src/specs/NativeStripeSdkModule';
import { Identity } from '../Identity';

jest.mock(
  '@stripe/stripe-react-native',
  () => ({
    useStripeIdentity: jest.requireActual(
      '../../../../src/hooks/useStripeIdentity'
    ).useStripeIdentity,
  }),
  { virtual: true }
);

jest.mock('../../../../src/specs/NativeStripeSdkModule', () => ({
  __esModule: true,
  default: { presentIdentityVerificationSheet: jest.fn() },
}));

it('shows credential failures and clears the message after a successful retry', async () => {
  const fetchOptions = jest
    .fn()
    .mockRejectedValueOnce(new Error('Identity server unavailable'))
    .mockResolvedValueOnce({
      sessionId: 'vs_example',
      ephemeralKeySecret: 'ek_example',
      brandLogo: { uri: 'brand_logo', width: 64, height: 64, scale: 1 },
    });
  const presentNative = jest.mocked(
    NativeStripeSdk.presentIdentityVerificationSheet
  );
  presentNative.mockResolvedValue({ status: 'FlowCompleted' });
  render(<Identity fetchOptions={fetchOptions} />);

  fireEvent.press(screen.getByTestId('verify-btn'));

  expect(await screen.findByText('Identity server unavailable')).toBeTruthy();
  expect(screen.getByText('Status: FlowFailed')).toBeTruthy();
  expect(presentNative).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('verify-btn'));

  await waitFor(() => {
    expect(screen.getByText('Status: FlowCompleted')).toBeTruthy();
  });
  expect(screen.queryByText('Identity server unavailable')).toBeNull();
  expect(presentNative).toHaveBeenCalledTimes(1);
});
