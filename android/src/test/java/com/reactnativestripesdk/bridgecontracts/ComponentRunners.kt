@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk.bridgecontracts

import android.app.Activity
import android.os.Looper
import android.util.DisplayMetrics
import android.view.ContextThemeWrapper
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.EditText
import androidx.activity.ComponentActivity
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.CatalystInstance
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.google.android.gms.tapandpay.TapAndPayClient
import com.google.android.material.shape.MaterialShapeDrawable
import com.reactnativestripesdk.AuBECSDebitFormView
import com.reactnativestripesdk.AuBECSDebitFormViewManager
import com.reactnativestripesdk.CardChangeEvent
import com.reactnativestripesdk.CardFieldView
import com.reactnativestripesdk.CardFieldViewManager
import com.reactnativestripesdk.CardFormCompleteEvent
import com.reactnativestripesdk.CardFormView
import com.reactnativestripesdk.CardFormViewManager
import com.reactnativestripesdk.PaymentMethodMessagingElementConfigureEvent
import com.reactnativestripesdk.PaymentMethodMessagingElementView
import com.reactnativestripesdk.PaymentMethodMessagingElementViewManager
import com.reactnativestripesdk.addresssheet.AddressLauncherManager
import com.reactnativestripesdk.addresssheet.AddressSheetEvent
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.pushprovisioning.AddToWalletButtonView
import com.reactnativestripesdk.pushprovisioning.AddToWalletCompleteEvent
import com.reactnativestripesdk.pushprovisioning.TapAndPayProxy
import com.stripe.android.PaymentConfiguration
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import com.stripe.android.pushProvisioning.PushProvisioningActivity
import com.stripe.android.pushProvisioning.PushProvisioningActivityStarter
import kotlinx.coroutines.channels.Channel
import org.mockito.Mockito.RETURNS_DEFAULTS
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockConstruction
import org.mockito.Mockito.mockingDetails
import org.mockito.Mockito.`when`
import org.mockito.Mockito.withSettings
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import java.time.Duration

/**
 * Component runners apply fixture props through the view manager's prop setters, then read
 * back the state those setters put on the native views.
 */
internal object ComponentRunners {
  val runners: Map<String, (BridgeFixture) -> BridgeObservation> =
    mapOf(
      "component:CardField" to ::cardField,
      "component:CardForm" to ::cardForm,
      "component:AuBECSDebitForm" to ::auBecsDebitForm,
      "component:PaymentMethodMessagingElementView" to ::paymentMethodMessaging,
      "component:AddressSheetView" to ::addressSheet,
      "component:AddToWalletButton" to ::addToWallet,
      "component:EmbeddedPaymentElementView" to ::embeddedPaymentElement,
    )

  /**
   * Each prop goes to its own view: with both set, the manager configures the element, which
   * loads over the network.
   */
  private fun embeddedPaymentElement(fixture: BridgeFixture): BridgeObservation {
    val manager = com.reactnativestripesdk.EmbeddedPaymentElementViewManager()
    val configured = com.reactnativestripesdk.EmbeddedPaymentElementView(themedContext())
    manager.setConfiguration(configured, DynamicFromObject(requireNotNull(fixture.map("configuration"))))
    val intent = com.reactnativestripesdk.EmbeddedPaymentElementView(themedContext())
    manager.setIntentConfiguration(intent, DynamicFromObject(requireNotNull(fixture.map("intentConfiguration"))))
    return BridgeObservation(
      roots =
        mapOf(
          "configuration" to configured.latestElementConfig,
          "rowSelectionBehavior" to configured.rowSelectionBehaviorType.value,
          "intentConfiguration" to intent.latestIntentConfig,
          "useConfirmationTokenCallback" to intent.useConfirmationTokenCallback.value,
        ),
    )
  }

  /**
   * Sets the props through the view manager. The element applies them from a Compose effect, so
   * the appearance and configuration roots are what the view queued for that effect, and
   * onConfigureResult is what a second view reports once its Compose content runs in an activity
   * window.
   */
  private fun paymentMethodMessaging(fixture: BridgeFixture): BridgeObservation {
    val dispatcher = mock(EventDispatcher::class.java)
    val view = PaymentMethodMessagingElementView(recordingContext(dispatcher))
    val manager = PaymentMethodMessagingElementViewManager()
    fixture.map("appearance")?.let { manager.setAppearance(view, DynamicFromObject(it)) }
    manager.setConfiguration(view, DynamicFromObject(requireNotNull(fixture.map("configuration"))))
    shadowOf(Looper.getMainLooper()).idle()
    val channel = BridgeAssert.child(view, "events") as Channel<*>
    val queued = generateSequence { channel.tryReceive().getOrNull() }.toList()
    fun queuedValue(event: String, name: String) =
      queued.firstOrNull { it.javaClass.simpleName == event }?.let { BridgeAssert.child(it, name) }
    val appearance = queuedValue("Appearance", "appearance")
    val configuration = requireNotNull(queuedValue("Configure", "configuration"))

    @Suppress("UNCHECKED_CAST")
    val types = BridgeAssert.child(configuration, "paymentMethodTypes") as List<PaymentMethod.Type>?
    return BridgeObservation(
      roots =
        mapOf(
          "events" to mapOf("onConfigureResult" to composedConfigureResults(fixture)),
          "appearance" to mapOf("style" to appearance?.let { BridgeAssert.child(it, "theme") }),
          "configuration" to
            mapOf(
              "amount" to BridgeAssert.child(configuration, "amount"),
              "currency" to BridgeAssert.child(configuration, "currency"),
              "country" to BridgeAssert.child(configuration, "countryCode"),
              "locale" to BridgeAssert.child(configuration, "locale"),
              "paymentMethodTypes" to types?.map { it.code },
            ),
        ),
    )
  }

  /**
   * The onConfigureResult events of a view that applies the fixture's props inside a resumed
   * activity's window. Loading messaging content calls the network, so the element the view
   * creates reports that it configured.
   */
  private fun composedConfigureResults(fixture: BridgeFixture): List<Any?> {
    val dispatcher = mock(EventDispatcher::class.java)
    val host = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    val succeeded =
      PaymentMethodMessagingElement.ConfigureResult.Succeeded::class.java
        .getDeclaredConstructor()
        .newInstance()
    val configured =
      withSettings().defaultAnswer { invocation ->
        if (invocation.method.name == "configure") {
          succeeded
        } else {
          RETURNS_DEFAULTS.answer(invocation)
        }
      }
    val view = PaymentMethodMessagingElementView(recordingContext(dispatcher, host.get()))
    try {
      PaymentConfiguration.init(RuntimeEnvironment.getApplication(), BridgeRunners.PUBLISHABLE_KEY)
      mockConstruction(PaymentMethodMessagingElement::class.java, configured).use {
        val manager = PaymentMethodMessagingElementViewManager()
        fixture.map("appearance")?.let { manager.setAppearance(view, DynamicFromObject(it)) }
        manager.setConfiguration(view, DynamicFromObject(requireNotNull(fixture.map("configuration"))))
        host.get().addContentView(view, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        repeat(COMPOSE_FRAMES) { shadowOf(Looper.getMainLooper()).idleFor(FRAME) }
      }
      return eventsData<PaymentMethodMessagingElementConfigureEvent>(dispatcher)
    } finally {
      view.handleOnDropViewInstance()
      host.pause().stop().destroy()
    }
  }

  private const val COMPOSE_FRAMES = 10
  private val FRAME = Duration.ofMillis(16)

  private fun addressSheet(fixture: BridgeFixture): BridgeObservation {
    // An appearance that does not map fails the sheet before it launches, so the view can be
    // shown without presenting UI.
    val appearanceMaps =
      runCatching {
        com.reactnativestripesdk.buildPaymentSheetAppearance(
          fixture.map("appearance"),
          RuntimeEnvironment.getApplication(),
        )
      }.isSuccess
    if (!appearanceMaps) {
      return BridgeObservation(roots = mapOf("events" to mapOf("onErrorAction" to addressSheetErrorWhenShown(fixture))))
    }
    val details = AddressSheetView.buildAddressDetails(requireNotNull(fixture.map("defaultValues")))
    return BridgeObservation(
      roots =
        mapOf(
          "defaultValues" to details,
          "additionalFields" to
            AddressSheetView.buildAdditionalFieldsConfiguration(requireNotNull(fixture.map("additionalFields"))),
          "submitResult" to AddressSheetView.buildResult(details),
          "events" to mapOf("onErrorAction" to addressSheetErrorWithoutPublishableKey()),
          "appearance" to
            mapOf(
              "primaryColor" to
                hex(
                  BridgeAssert.child(
                    BridgeAssert.child(
                      com.reactnativestripesdk.buildPaymentSheetAppearance(
                        fixture.map("appearance"),
                        RuntimeEnvironment.getApplication(),
                      ),
                      "colorsLight",
                    ),
                    "primary",
                  ) as Int?,
                ),
            ),
        ),
      aliases =
        mapOf(
          "defaultValues.phone" to "defaultValues.phoneNumber",
          "additionalFields.phoneNumber" to "additionalFields.phone",
          "submitResult" to "submitResult.result",
        ),
    )
  }

  /** Showing the sheet before initStripe is the error a unit test can reach without presenting UI. */
  private fun addressSheetErrorWithoutPublishableKey(): Any? {
    val dispatcher = mock(EventDispatcher::class.java)
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).get()
    val view = AddressSheetView(recordingContext(dispatcher, activity))
    val savedKey = AddressLauncherManager.publishableKey
    AddressLauncherManager.publishableKey = null
    try {
      view.setVisible(true)
      shadowOf(Looper.getMainLooper()).idle()
    } finally {
      AddressLauncherManager.publishableKey = savedKey
    }
    return lastEventData<AddressSheetEvent>(dispatcher)
  }

  /** Shows the sheet with the fixture props, as React does when visible turns true. */
  private fun addressSheetErrorWhenShown(fixture: BridgeFixture): Any? {
    val dispatcher = mock(EventDispatcher::class.java)
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).get()
    val view = AddressSheetView(recordingContext(dispatcher, activity))
    val manager = com.reactnativestripesdk.addresssheet.AddressSheetViewManager()
    fixture.map("appearance")?.let { manager.setAppearance(view, DynamicFromObject(it)) }
    manager.setVisible(view, true)
    shadowOf(Looper.getMainLooper()).idle()
    return lastEventData<AddressSheetEvent>(dispatcher)
  }

  /**
   * Taps the button, then hands the activity listener push provisioning registers the results an
   * app gets back: provisioning succeeds, so the token the tap stored is tokenized through
   * TapAndPay, and the customer then cancels TapAndPay's identity check.
   */
  private fun addToWallet(fixture: BridgeFixture): BridgeObservation {
    val dispatcher = mock(EventDispatcher::class.java)
    val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    val context = recordingContext(dispatcher, activity)
    val view = AddToWalletButtonView(context)
    view.setCardDetails(fixture.map("cardDetails"))
    view.setEphemeralKey(requireNotNull(fixture.map("ephemeralKey")))
    view.setToken(fixture.map("token"))
    TapAndPayClient.lastTokenizeArguments = null
    view.performClick()
    val listener =
      mockingDetails(context.reactApplicationContext)
        .invocations
        .single { it.method.name == "addActivityEventListener" }
        .arguments
        .single() as ActivityEventListener
    listener.onActivityResult(
      activity,
      PushProvisioningActivityStarter.REQUEST_CODE,
      PushProvisioningActivity.RESULT_OK,
      null,
    )
    val tokenize = TapAndPayClient.lastTokenizeArguments
    TapAndPayClient.lastTokenizeArguments = null
    listener.onActivityResult(activity, TapAndPayProxy.REQUEST_CODE_TOKENIZE, Activity.RESULT_CANCELED, null)
    return BridgeObservation(
      roots =
        mapOf(
          "ephemeralKey" to BridgeAssert.child(view, "ephemeralKey"),
          "tokenize" to
            tokenize?.let {
              mapOf(
                "tokenReferenceId" to it[1],
                "tokenServiceProvider" to it[2],
                "displayName" to it[3],
                "network" to it[4],
              )
            },
          "events" to mapOf("onCompleteAction" to lastEventData<AddToWalletCompleteEvent>(dispatcher)),
        ),
    )
  }

  private fun shapeStyle(background: android.graphics.drawable.Drawable?): Map<String, Any?> {
    val shape = background as MaterialShapeDrawable
    return mapOf(
      "borderWidth" to shape.strokeWidth,
      "backgroundColor" to hex(shape.fillColor?.defaultColor),
      "borderColor" to hex(shape.strokeColor?.defaultColor),
      "borderRadius" to shape.topLeftCornerResolvedSize,
    )
  }

  private fun textStyle(field: EditText): Map<String, Any?> =
    mapOf(
      "textColor" to hex(field.currentTextColor),
      "fontSize" to field.textSize,
      "placeholderColor" to hex(field.hintTextColors.defaultColor),
      "textErrorColor" to hex(BridgeAssert.child(field, "externalErrorColor") as Int?),
    )

  private fun cardForm(fixture: BridgeFixture): BridgeObservation {
    val dispatcher = mock(EventDispatcher::class.java)
    val view = CardFormView(recordingContext(dispatcher))
    val manager = CardFormViewManager()
    fun apply() {
      fixture.map("cardStyle")?.let { manager.setCardStyle(view, DynamicFromObject(it)) }
      fixture.map("defaultValues")?.let { manager.setDefaultValues(view, DynamicFromObject(it)) }
      fixture.map("placeholders")?.let { manager.setPlaceholders(view, DynamicFromObject(it)) }
    }
    apply()
    val binding = BridgeAssert.child(view, "cardFormViewBinding")
    val widget = BridgeAssert.child(binding, "cardMultilineWidget")
    apply()
    val widgetBinding = BridgeAssert.child(view, "multilineWidgetBinding")
    fun hint(owner: Any?, name: String) =
      (BridgeAssert.child(owner, name) as com.google.android.material.textfield.TextInputLayout).hint?.toString()
    val country = BridgeAssert.child(binding, "countryLayout") as com.stripe.android.view.CountryTextInputLayout
    val container = BridgeAssert.child(binding, "cardMultilineWidgetContainer") as android.view.View
    return BridgeObservation(
      roots =
        mapOf(
          // Without a cardStyle prop the container keeps its MaterialCardView background.
          "cardStyle" to
            fixture.map("cardStyle")?.let {
              shapeStyle(container.background) +
                textStyle(BridgeAssert.child(widgetBinding, "etCardNumber") as EditText)
            },
          "defaultValues" to mapOf("countryCode" to country.getSelectedCountryCode()?.value),
          "placeholders" to
            mapOf(
              "number" to hint(widgetBinding, "tlCardNumber"),
              "expiration" to hint(widgetBinding, "tlExpiry"),
              "postalCode" to hint(binding, "postalCodeContainer"),
            ),
          "rebuildsFormOnPropsUpdate" to (BridgeAssert.child(binding, "cardMultilineWidget") !== widget),
          "events" to mapOf("onFormComplete" to formCompletePayload(dispatcher, widgetBinding, binding)),
        ),
    )
  }

  /** A context whose UIManager hands view events to [dispatcher], as a running React instance would. */
  private fun recordingContext(
    dispatcher: EventDispatcher,
    activity: Activity? = null,
  ): ThemedReactContext {
    val uiManager = mock(UIManagerModule::class.java)
    `when`(uiManager.eventDispatcher).thenReturn(dispatcher)
    val instance = mock(CatalystInstance::class.java)
    `when`(instance.getNativeModule(UIManagerModule::class.java)).thenReturn(uiManager)
    val reactContext = mock(ReactApplicationContext::class.java)
    `when`(reactContext.hasCatalystInstance()).thenReturn(true)
    `when`(reactContext.hasActiveReactInstance()).thenReturn(true)
    `when`(reactContext.catalystInstance).thenReturn(instance)
    `when`(reactContext.currentActivity).thenReturn(activity)
    return ThemedReactContext(reactContext, themedContext().baseContext, null, -1)
  }

  /** Types a complete card, as a user would; the form's valid callback dispatches onFormComplete. */
  private fun formCompletePayload(
    dispatcher: EventDispatcher,
    widgetBinding: Any?,
    binding: Any?,
  ): Any? {
    (BridgeAssert.child(widgetBinding, "etCardNumber") as EditText).setText("4242424242424242")
    (BridgeAssert.child(widgetBinding, "etExpiry") as EditText).setText("12/34")
    (BridgeAssert.child(widgetBinding, "etCvc") as EditText).setText("123")
    (BridgeAssert.child(binding, "postalCode") as EditText).setText("94107")
    shadowOf(Looper.getMainLooper()).idle()
    return lastEventData<CardFormCompleteEvent>(dispatcher)
  }

  private inline fun <reified T : Event<*>> lastEventData(dispatcher: EventDispatcher): Any? =
    eventsData<T>(dispatcher).lastOrNull()

  private inline fun <reified T : Event<*>> eventsData(dispatcher: EventDispatcher): List<Any?> {
    val getEventData = Event::class.java.getDeclaredMethod("getEventData").apply { isAccessible = true }
    return mockingDetails(dispatcher)
      .invocations
      .flatMap { it.arguments.asList() }
      .filterIsInstance<T>()
      .map { getEventData.invoke(it) }
  }

  private fun auBecsDebitForm(fixture: BridgeFixture): BridgeObservation {
    val view = AuBECSDebitFormView(themedContext())
    val manager = AuBECSDebitFormViewManager()
    manager.setCompanyName(view, "Bridge Contracts, Inc.")
    fixture.map("formStyle")?.let { manager.setFormStyle(view, DynamicFromObject(it)) }
    val first = BridgeAssert.child(view, "becsDebitWidget")
    fixture.map("formStyle")?.let { manager.setFormStyle(view, DynamicFromObject(it)) }
    val widget = BridgeAssert.child(view, "becsDebitWidget") as android.view.View
    val binding = com.stripe.android.databinding.StripeBecsDebitWidgetBinding.bind(widget)
    return BridgeObservation(
      roots =
        mapOf(
          "formStyle" to shapeStyle(widget.background) + textStyle(binding.accountNumberEditText),
          "rebuildsFormOnPropsUpdate" to (widget !== first),
        ),
    )
  }

  fun themedContext(): ThemedReactContext {
    val app = RuntimeEnvironment.getApplication()
    val metrics = DisplayMetrics()
    metrics.setTo(app.resources.displayMetrics)
    metrics.density = 1f
    metrics.densityDpi = DisplayMetrics.DENSITY_DEFAULT
    metrics.scaledDensity = 1f
    @Suppress("DEPRECATION")
    app.resources.displayMetrics.setTo(metrics)
    DisplayMetricsHolder.initDisplayMetrics(app)
    val themed = ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    return ThemedReactContext(BridgeReactContext(app), themed, null, -1)
  }

  fun hex(color: Int?): String? = color?.let { String.format("#%06x", 0xFFFFFF and it) }

  private fun cardField(fixture: BridgeFixture): BridgeObservation {
    val dispatcher = mock(EventDispatcher::class.java)
    val view = CardFieldView(recordingContext(dispatcher))
    val manager = CardFieldViewManager()
    fixture.map("cardStyle")?.let { manager.setCardStyle(view, DynamicFromObject(it)) }
    fixture.map("placeholders")?.let { manager.setPlaceholders(view, DynamicFromObject(it)) }
    val binding = BridgeAssert.child(view, "cardInputWidgetBinding")
    fun field(name: String) = BridgeAssert.child(binding, name) as EditText
    val number = field("cardNumberEditText")
    val shape = (BridgeAssert.child(view, "mCardWidget") as android.view.View).background as MaterialShapeDrawable
    val cardStyle =
      mapOf(
        "borderWidth" to shape.strokeWidth,
        "backgroundColor" to hex(shape.fillColor?.defaultColor),
        "borderColor" to hex(shape.strokeColor?.defaultColor),
        "borderRadius" to shape.topLeftCornerResolvedSize,
      ) + textStyle(number)
    val placeholders =
      mapOf(
        "number" to number.hint?.toString(),
        "expiration" to field("expiryDateEditText").hint?.toString(),
        "postalCode" to field("postalCodeEditText").hint?.toString(),
      )
    number.setText("4242424242424242")
    field("expiryDateEditText").setText("12/34")
    field("cvcEditText").setText("123")
    field("postalCodeEditText").setText("94107")
    shadowOf(Looper.getMainLooper()).idle()
    return BridgeObservation(
      roots =
        mapOf(
          "cardStyle" to cardStyle,
          "placeholders" to placeholders,
          "events" to mapOf("onCardChange" to lastEventData<CardChangeEvent>(dispatcher)),
        ),
    )
  }
}
