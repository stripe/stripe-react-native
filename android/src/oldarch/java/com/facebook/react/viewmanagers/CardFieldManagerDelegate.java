/**
* This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
*
* Do not edit this file as changes may cause incorrect behavior and will be lost
* once the code is regenerated.
*
* @generated by codegen project: GeneratePropsJavaDelegate.js
*/

package com.facebook.react.viewmanagers;

import android.view.View;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.DynamicFromObject;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.BaseViewManager;
import com.facebook.react.uimanager.BaseViewManagerDelegate;
import com.facebook.react.uimanager.LayoutShadowNode;

public class CardFieldManagerDelegate<T extends View, U extends BaseViewManager<T, ? extends LayoutShadowNode> & CardFieldManagerInterface<T>> extends BaseViewManagerDelegate<T, U> {
  public CardFieldManagerDelegate(U viewManager) {
    super(viewManager);
  }
  @Override
  public void setProperty(T view, String propName, @Nullable Object value) {
    switch (propName) {
      case "autofocus":
        mViewManager.setAutofocus(view, value == null ? false : (boolean) value);
        break;
      case "cardStyle":
        mViewManager.setCardStyle(view, new DynamicFromObject(value));
        break;
      case "countryCode":
        mViewManager.setCountryCode(view, value == null ? null : (String) value);
        break;
      case "dangerouslyGetFullCardDetails":
        mViewManager.setDangerouslyGetFullCardDetails(view, value == null ? false : (boolean) value);
        break;
      case "disabled":
        mViewManager.setDisabled(view, value == null ? false : (boolean) value);
        break;
      case "onBehalfOf":
        mViewManager.setOnBehalfOf(view, value == null ? null : (String) value);
        break;
      case "placeholders":
        mViewManager.setPlaceholders(view, new DynamicFromObject(value));
        break;
      case "postalCodeEnabled":
        mViewManager.setPostalCodeEnabled(view, value == null ? false : (boolean) value);
        break;
      case "preferredNetworks":
        mViewManager.setPreferredNetworks(view, (ReadableArray) value);
        break;
      default:
        super.setProperty(view, propName, value);
    }
  }

  @Override
  public void receiveCommand(T view, String commandName, @Nullable ReadableArray args) {
    switch (commandName) {
      case "blur":
        mViewManager.blur(view);
        break;
      case "focus":
        mViewManager.focus(view);
        break;
      case "clear":
        mViewManager.clear(view);
        break;
    }
  }
}
