import React from 'react';
import { View, Text, Modal } from 'react-native';
import TestComposeView from './TestComposeView';

export default function TestComposeViewScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello </Text>
      <Modal>
        <TestComposeView style={{ flex: 1, width: '100%' }}/>
      </Modal>
      <Text>Bye</Text>
    </View>
  );
}
