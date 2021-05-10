/* eslint-disable no-undef */
const SELECTORS = {
  TITLE: 'android=resourceId("android:id/alertTitle")',
};

class NativeAlert {
  getAlertElement(title: string) {
    if (driver.isAndroid) {
      return $(SELECTORS.TITLE);
    } else {
      return $(`~${title}`);
    }
  }
}

export default new NativeAlert();
