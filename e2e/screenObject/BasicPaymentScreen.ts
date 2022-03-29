/* eslint-disable no-undef */
import { getElementByText, getTextInputByPlaceholder } from '../helpers';
class BasicPaymentScreen {
  pay({
    email,
    bankName,
    iban,
    buttonText = 'Pay',
  }: {
    email: string;
    bankName?: string;
    iban?: string;
    buttonText?: string;
  }) {
    getTextInputByPlaceholder('E-mail').waitForDisplayed({ timeout: 10000 });
    getTextInputByPlaceholder('E-mail').setValue(email);

    if (bankName && driver.isAndroid) {
      const select = getElementByText('Optional - choose your bank');
      expect(select).toBeDisplayed();
      select.click();
      const listItem = getElementByText(bankName);
      listItem.click();
    }
    if (iban) {
      const ibanInput = getTextInputByPlaceholder('Iban');
      expect(ibanInput).toBeDisplayed();
      ibanInput.setValue(iban);
    }

    const button = driver.isAndroid
      ? $(
          `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${buttonText}"))`
        )
      : $(`~${buttonText}`);
    expect(button).toBeDisplayed();
    button.click();

    driver.pause(5000);
  }

  authorize({ elementType = 'button', pause = 5000 } = {}) {
    driver.pause(pause);

    // We can have multiple webview contexts, so we return all of them and then try going through each one.
    // Since we're potentially interacting with unmounted Webviews, we need to catch() any potential errors,
    // but we can safely do so as the test would still fail after we return back to the native context.
    const webviewContexts = getAllWebviewContexts();
    for (const context of webviewContexts) {
      try {
        driver.switchContext(context);
        const button = $(`${elementType}*=Authorize`);
        if (button.isDisplayed()) {
          button.click();
          driver.pause(1000);
          break;
        }
      } catch (e) {
        console.log(
          `Unable to switch to ${context} context. This context may no longer exist.`
        );
      }
    }
    driver.switchContext(getNativeContext());
  }

  checkStatus(status: string = 'Success') {
    const alert = getElementByText(status);
    alert.waitForDisplayed({
      timeout: 10000,
    });
    expect(alert.getText()).toEqual(status);
  }

  authorizeACH() {
    driver.pause(5000);
    const webviewContexts = getAllWebviewContexts();
    for (const context of webviewContexts) {
      try {
        driver.switchContext(context);
        let button = $(`button*=Manually verify instead`);
        if (button.isDisplayed()) {
          button.click();
          driver.pause(1000);

          button = $(`//input[@name='confirmAccountNumber']`);
          button.click();
          button.sendKeys(['000123456789\n']);

          button = $(`//input[@name='routingNumber']`);
          button.click();
          button.click();
          button.sendKeys(['110000000\n']);

          button = $(`//input[@name='accountNumber']`);
          button.click();
          button.click();
          button.sendKeys(['000123456789\n']);

          button = $(`button*=Continue`);
          button.click();
          button.click();

          button = $(`button*=Done`);
          button.click();
          break;
        }
      } catch (e) {
        console.log(
          `Unable to switch to ${context} context. This context may no longer exist.`
        );
      }
    }
    driver.switchContext(getNativeContext());
  }
}

export function getAllWebviewContexts(): string[] {
  let allContexts = driver.getContexts();
  if (driver.isIOS) {
    // Hacky workaround for https://github.com/appium/appium/issues/13770
    driver.pause(1000);
    allContexts = driver.getContexts();
  }

  const webviewContext = allContexts.filter((contextName) =>
    contextName.toLowerCase().includes('webview')
  );
  if (!webviewContext.length) {
    throw new Error('No webview context was found.');
  }

  return webviewContext.sort((a, b) => {
    if (a.includes('stripe') && !b.includes('stripe')) {
      return -1;
    } else if (b.includes('stripe') && !a.includes('stripe')) {
      return 1;
    }
    return 0;
  });
}

function getNativeContext(): string {
  const allContexts = driver.getContexts();

  const nativeContext = allContexts.find((contextName) =>
    contextName.toLowerCase().includes('native')
  );
  if (!nativeContext) {
    throw new Error('No native context was found.');
  }

  return nativeContext;
}

export default new BasicPaymentScreen();
