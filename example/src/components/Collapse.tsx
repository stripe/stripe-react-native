import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { colors } from '../colors';

interface Props {
  title: string;
}

export const Collapse: React.FC<Props> = React.memo(({ children, title }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>

      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#c0c0c0',
  },
  header: {
    backgroundColor: colors.light_gray,
    paddingVertical: 18,
  },
  title: {
    color: colors.slate,
    fontWeight: '600',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  content: {
    paddingTop: 0,
    paddingLeft: 16,
  },
});
