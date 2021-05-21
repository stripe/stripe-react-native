/* eslint-disable no-undef */
export function getElementByText(text: string) {
  return driver.isAndroid
    ? $(`android=new UiSelector().text("${text}")`)
    : $(`~${text}`);
}

export function getTextInputByPlaceholder(placeholder: string) {
  return driver.isAndroid
    ? $(`//android.widget.EditText[@text="${placeholder}"]`)
    : $(`~${placeholder}`);
}
