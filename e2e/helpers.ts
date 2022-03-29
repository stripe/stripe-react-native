/* eslint-disable no-undef */
export function getElementByText(text: string) {
  return driver.isAndroid
    ? $(`android=new UiSelector().text("${text}")`)
    : $(`~${text}`);
}

export function getElementByTextContaining(text: string) {
  return driver.isAndroid
    ? $(`android=new UiSelector().textContains("${text}")`)
    : $(`-ios predicate string:name CONTAINS '${text}'`);
}

export function getTextInputByPlaceholder(placeholder: string) {
  return driver.isAndroid
    ? $(`//android.widget.EditText[@text="${placeholder}"]`)
    : $(`~${placeholder}`);
}

export function clickButtonContainingText(text: string) {
  const button = driver.isAndroid
    ? $(
        `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${text}"))`
      )
    : $(`~${text}`);
  expect(button).toBeDisplayed();
  button.click();
}
