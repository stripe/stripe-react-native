import React from 'react';
import {
  View,
  Text,
  Switch,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

interface CustomerSessionSwitchProps {
  value: boolean; // Switch value
  onValueChange: (value: boolean) => void;
}

const SWITCH_CONTAINER_STYLE: StyleProp<ViewStyle> = {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'space-between',
};

const SWITCH_TITLE_STYLE: StyleProp<TextStyle> = {
  marginEnd: 10,
  textAlignVertical: 'center',
};

const CustomerSessionSwitch: React.FC<CustomerSessionSwitchProps> = ({
  value,
  onValueChange,
}) => {
  return (
    <View style={SWITCH_CONTAINER_STYLE}>
      <Text style={SWITCH_TITLE_STYLE}>Enable Customer Session</Text>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
};

export default CustomerSessionSwitch;
