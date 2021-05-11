import { getElementByText } from '../../helpers';

class NativeAlert {
  getAlertElement(title: string) {
    return getElementByText(title);
  }
}

export default new NativeAlert();
