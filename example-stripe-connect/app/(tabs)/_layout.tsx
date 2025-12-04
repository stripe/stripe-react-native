import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Onboarding</Label>
        <Icon sf="star" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="payments">
        <Label>Payments</Label>
        <Icon sf="star" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="payouts">
        <Label>Payouts</Label>
        <Icon sf="star" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
