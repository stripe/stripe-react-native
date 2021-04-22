/* eslint-disable no-undef */
const SELECTORS = {
  VIEW:
    '//android.widget.FrameLayout[@resource-id="android:id/content"]/android.widget.AlertDialogLayout/[@resource-id="android:id/topPanel"]/[@resource-id="android:id/title_template"]',
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
