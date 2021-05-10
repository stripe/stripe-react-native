import { getTextInputByPlaceholder } from '../../helpers';

/* eslint-disable no-undef */

class BECSForm {
  setName(value: string) {
    if (driver.isAndroid) {
      getTextInputByPlaceholder('Name').setValue(value);
    } else {
      getTextInputByPlaceholder('Full name').setValue(value);
    }
  }
  setEmail(value: string) {
    if (driver.isAndroid) {
      getTextInputByPlaceholder('Email Address').setValue(value);
    } else {
      $$(
        `-ios predicate string: type == "XCUIElementTypeTextField"`
      )[1].setValue(value);
    }
  }
  setBSB(value: string) {
    getTextInputByPlaceholder('BSB').setValue(value);
  }
  setAccountNumber(value: string) {
    getTextInputByPlaceholder('Account number').setValue(value);
  }
}

export default new BECSForm();
