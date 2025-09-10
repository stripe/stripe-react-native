import { StyleSheet } from 'react-native';
import { colors } from '../../colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingEnd: 16, // Hack.
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.light_gray,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoContainer: {
    paddingVertical: 16,
    gap: 4,
  },
  infoText: {},
  textInput: {
    borderWidth: 1,
    borderColor: colors.light_gray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  responseText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.dark_gray,
  },
  applePayButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applePayButton: {
    height: 50,
  },
  walletContainer: {
    paddingVertical: 16,
    gap: 4,
  },
  logoutContainer: {
    paddingStart: 16,
    paddingVertical: 16,
  },
});
