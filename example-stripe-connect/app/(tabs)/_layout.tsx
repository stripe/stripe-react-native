import { useLocalSearchParams } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

const COMPONENT_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  payments: 'Payments',
  payouts: 'Payouts',
};

export default function TabLayout() {
  const params = useLocalSearchParams<{ component?: string }>();
  const component = params.component || 'onboarding';
  const label = COMPONENT_LABELS[component] || 'Component';

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="[component]">
        <Label>{label}</Label>
        <Icon sf="star" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
