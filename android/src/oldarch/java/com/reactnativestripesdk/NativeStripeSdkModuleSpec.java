// This is a modified version of the codegen file. Since old arch does not support mEventEmitterCallback
// we implement event emitting with RCTDeviceEventEmitter.
// To update this file, take the file generated by codegen and add the `invoke(String, Object)` and
// `invoke(String)` methods. Then replace `mEventEmitterCallback.invoke` with the `invoke` method.

/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GenerateModuleJavaSpec.js
 *
 * @nolint
 */

package com.reactnativestripesdk;

import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.common.build.ReactBuildConfig;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public abstract class NativeStripeSdkModuleSpec extends ReactContextBaseJavaModule implements TurboModule {
  public static final String NAME = "StripeSdk";

  public NativeStripeSdkModuleSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public @Nonnull String getName() {
    return NAME;
  }

  private void invoke(String eventName, Object params) {
    getReactApplicationContext()
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
  }

  private void invoke(String eventName) {
    invoke(eventName, null);
  }

  protected final void emitOnConfirmHandlerCallback(ReadableMap value) {
    invoke("onConfirmHandlerCallback", value);
  }

  protected final void emitOnFinancialConnectionsEvent(ReadableMap value) {
    invoke("onFinancialConnectionsEvent", value);
  }

  protected final void emitOnOrderTrackingCallback() {
    invoke("onOrderTrackingCallback");
  }

  protected final void emitOnCustomerAdapterFetchPaymentMethodsCallback() {
    invoke("onCustomerAdapterFetchPaymentMethodsCallback");
  }

  protected final void emitOnCustomerAdapterAttachPaymentMethodCallback(ReadableMap value) {
    invoke("onCustomerAdapterAttachPaymentMethodCallback", value);
  }

  protected final void emitOnCustomerAdapterDetachPaymentMethodCallback(ReadableMap value) {
    invoke("onCustomerAdapterDetachPaymentMethodCallback", value);
  }

  protected final void emitOnCustomerAdapterSetSelectedPaymentOptionCallback(ReadableMap value) {
    invoke("onCustomerAdapterSetSelectedPaymentOptionCallback", value);
  }

  protected final void emitOnCustomerAdapterFetchSelectedPaymentOptionCallback() {
    invoke("onCustomerAdapterFetchSelectedPaymentOptionCallback");
  }

  protected final void emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback() {
    invoke("onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback");
  }

  @ReactMethod
  @DoNotStrip
  public abstract void initialise(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void createPaymentMethod(ReadableMap params, ReadableMap options, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void handleNextAction(String paymentIntentClientSecret, @Nullable String returnURL, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void handleNextActionForSetup(String setupIntentClientSecret, @Nullable String returnURL, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void confirmPayment(String paymentIntentClientSecret, @Nullable ReadableMap params, @Nullable ReadableMap options, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void confirmSetupIntent(String paymentIntentClientSecret, ReadableMap params, ReadableMap options, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void retrievePaymentIntent(String clientSecret, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void retrieveSetupIntent(String clientSecret, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void initPaymentSheet(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void intentCreationCallback(ReadableMap result, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void presentPaymentSheet(ReadableMap options, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void confirmPaymentSheetPayment(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void createTokenForCVCUpdate(String cvc, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void handleURLCallback(String url, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void createToken(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void openApplePaySetup(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void verifyMicrodeposits(boolean isPaymentIntent, String clientSecret, ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void collectBankAccount(boolean isPaymentIntent, String clientSecret, ReadableMap params, Promise promise);

  protected abstract Map<String, Object> getTypedExportedConstants();

  @Override
  @DoNotStrip
  public final @Nullable Map<String, Object> getConstants() {
    Map<String, Object> constants = getTypedExportedConstants();
    if (ReactBuildConfig.DEBUG || ReactBuildConfig.IS_INTERNAL_BUILD) {
      Set<String> obligatoryFlowConstants = new HashSet<>(Arrays.asList(
          "API_VERSIONS"
      ));
      Set<String> optionalFlowConstants = new HashSet<>();
      Set<String> undeclaredConstants = new HashSet<>(constants.keySet());
      undeclaredConstants.removeAll(obligatoryFlowConstants);
      undeclaredConstants.removeAll(optionalFlowConstants);
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module Flow doesn't declare constants: %s", undeclaredConstants));
      }
      undeclaredConstants = obligatoryFlowConstants;
      undeclaredConstants.removeAll(constants.keySet());
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module doesn't fill in constants: %s", undeclaredConstants));
      }
    }
    return constants;
  }

  @ReactMethod
  @DoNotStrip
  public abstract void canAddCardToWallet(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void isCardInWallet(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void collectBankAccountToken(String clientSecret, ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void collectFinancialConnectionsAccounts(String clientSecret, ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void resetPaymentSheetCustomer(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void isPlatformPaySupported(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void createPlatformPayPaymentMethod(ReadableMap params, boolean usesDeprecatedTokenFlow, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void dismissPlatformPay(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void updatePlatformPaySheet(ReadableArray summaryItems, ReadableArray shippingMethods, ReadableArray errors, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void confirmPlatformPay(String clientSecret, ReadableMap params, boolean isPaymentIntent, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void configureOrderTracking(String orderTypeIdentifier, String orderIdentifier, String webServiceUrl, String authenticationToken, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void initCustomerSheet(ReadableMap params, ReadableMap customerAdapterOverrides, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void presentCustomerSheet(ReadableMap params, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void retrieveCustomerSheetPaymentOptionSelection(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterFetchPaymentMethodsCallback(ReadableArray paymentMethods, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterAttachPaymentMethodCallback(ReadableMap paymentMethod, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterDetachPaymentMethodCallback(ReadableMap paymentMethod, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterSetSelectedPaymentOptionCallback(Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterFetchSelectedPaymentOptionCallback(@Nullable String paymentOption, Promise promise);

  @ReactMethod
  @DoNotStrip
  public abstract void customerAdapterSetupIntentClientSecretForCustomerAttachCallback(String clientSecret, Promise promise);
}
